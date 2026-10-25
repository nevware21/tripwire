/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { assert, afterAll as selfAfterAll, beforeAll as selfBeforeAll, IDoneFn } from "@nevware21/tripwire";
import { doAwait } from "@nevware21/ts-async";
import { _assertReporterTargetSupport, _createReporter } from "../../../src/execute/reporter";
import { _REPORTER_MODULE_PREFIX } from "../../../src/internal/reporterSpec";
import { _isUserError, _userErrorHints } from "../../../src/internal/userError";
import { makeSink, runWithReporter } from "../support/reporterHarness";

let _root: string;
let _seq = 0;

/**
 * Writes a CommonJS reporter fixture and returns its absolute path. Each call gets a unique
 * name so neither `_loadModule`'s own cache nor node's require cache can leak between tests.
 */
function _writeReporter(body: string): string {
    const name = "reporter" + (_seq++) + ".js";
    const full = path.join(_root, name);

    fs.writeFileSync(full, body, "utf8");

    return full;
}

/** Runs `fn`, returning whatever it threw (or `null` when it did not throw). */
function _caught(fn: () => void): any {
    try {
        fn();
    } catch (e) {
        return e;
    }

    return null;
}

describe("execute reporter", () => {
    selfBeforeAll(() => {
        _root = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-reporter-"));
    });

    selfAfterAll(() => {
        if (_root) {
            fs.rmSync(_root, { recursive: true, force: true });
        }
    });

    describe("built-in names", () => {
        it("should still dispatch a built-in name to createReporter", () => {
            const reporter = _createReporter("tap", { console: makeSink() });

            assert.isObject(reporter.listener);
        });

        it("should not treat an unknown bare name as a module", () => {
            // parseArgs rejects this before the loader is reached; if it ever arrived here it
            // must fall back to spec (with createReporter's warning), never be require()d.
            const sink = makeSink();
            const reporter = _createReporter("no-such-reporter", { console: sink });

            assert.isObject(reporter.listener);
            assert.includes(sink.errorText(), "Unknown reporter 'no-such-reporter'");
        });
    });

    describe("custom reporter modules", () => {
        it("should load a module exporting a bare listener", () => {
            const file = _writeReporter("module.exports = { onDone: function () {} };");
            const reporter = _createReporter(file);

            assert.isFunction(reporter.listener.onDone);
        });

        it("should load a module exporting only onStart", () => {
            const file = _writeReporter("module.exports = { onStart: function () {} };");

            assert.isFunction(_createReporter(file).listener.onStart);
        });

        it("should load a module exporting only onAssert", () => {
            const file = _writeReporter("module.exports = { onAssert: function () {} };");

            assert.isFunction(_createReporter(file).listener.onAssert);
        });

        it("should unwrap a { listener } object, the shape the built-in factories return", () => {
            const file = _writeReporter("module.exports = { listener: { onDone: function () { return 'wrapped'; } } };");
            const reporter = _createReporter(file);

            assert.equal((reporter.listener as any).onDone(), "wrapped");
        });

        it("should call a module that exports a factory function", () => {
            const file = _writeReporter("module.exports = function (options) { return { onDone: function () { return options.slowThreshold; } }; };");
            const reporter = _createReporter(file, { slowThreshold: 42 });

            assert.equal((reporter.listener as any).onDone(), 42, "the factory should receive the reporter options");
        });

        it("should call a createReporter(options) factory export", () => {
            const file = _writeReporter("module.exports = { createReporter: function (options) { return { listener: { onDone: function () { return options.slowThreshold; } } }; } };");
            const reporter = _createReporter(file, { slowThreshold: 7 });

            assert.equal((reporter.listener as any).onDone(), 7);
        });

        it("should see through a default export", () => {
            // An ES-module-shaped reporter transpiled to CJS lands its export under `.default`.
            const file = _writeReporter("module.exports = { default: { onDone: function () { return 'defaulted'; } } };");

            assert.equal((_createReporter(file).listener as any).onDone(), "defaulted");
        });

        it("should accept the explicit module: prefix", () => {
            const file = _writeReporter("module.exports = { onDone: function () { return 'prefixed'; } };");

            assert.equal((_createReporter(_REPORTER_MODULE_PREFIX + file).listener as any).onDone(), "prefixed");
        });
    });

    describe("a custom reporter observes a real run", () => {
        // The point of the whole feature: the loaded module is registered like any built-in and
        // receives the same events. Asserted against a real runner rather than a hand-built
        // event, for the same reason the built-in reporter suites are.
        it("should receive the run's events", (done: IDoneFn) => {
            const seen: string[] = [];
            const file = _writeReporter("module.exports = function (options) { return { onDone: function (event) { options.seen.push(event); } }; };");
            const reporter = _createReporter(file, { seen: seen } as any);

            doAwait(runWithReporter(() => {
                it("passes", () => {});
            }, reporter.listener), () => {
                assert.isTrue(seen.length > 0, "the custom reporter should have been notified");
                done();
            }, done.fail);
        });
    });

    describe("failures", () => {
        it("should raise a user error naming the reporter flag when the module cannot be resolved", () => {
            const caught = _caught(() => _createReporter("./no/such/reporter.js"));

            assert.isDefined(caught, "expected a throw");
            assert.isTrue(_isUserError(caught), "a mistyped path is the user's typo, not a runner fault");
            assert.includes(caught.message, "Unable to load reporter module");
            assert.includes(caught.message, "./no/such/reporter.js");
            assert.includes(_userErrorHints(caught)[0], "--reporter");
        });

        it("should raise a user error when the module exports no listener hooks", () => {
            const file = _writeReporter("module.exports = { notAReporter: true };");
            const caught = _caught(() => _createReporter(file));

            assert.isDefined(caught, "expected a throw");
            assert.isTrue(_isUserError(caught));
            assert.includes(caught.message, "Invalid reporter module");
            assert.includes(caught.message, "onStart");
        });

        it("should raise a user error when the module exports an empty object", () => {
            const file = _writeReporter("module.exports = {};");
            const caught = _caught(() => _createReporter(file));

            assert.isDefined(caught, "expected a throw");
            assert.includes(caught.message, "Invalid reporter module");
        });

        it("should raise a user error when a factory returns something that is not a listener", () => {
            const file = _writeReporter("module.exports = function () { return { nope: true }; };");
            const caught = _caught(() => _createReporter(file));

            assert.isDefined(caught, "expected a throw");
            assert.includes(caught.message, "Invalid reporter module");
        });

        it("should point at the custom reporters documentation", () => {
            const file = _writeReporter("module.exports = { nope: true };");
            const hints = _userErrorHints(_caught(() => _createReporter(file)));

            assert.isTrue(hints.length > 1);
            assert.includes(hints[hints.length - 1], "docs/reporters.md");
        });
    });

    describe("_assertReporterTargetSupport", () => {
        it("should allow a module reporter on the node target", () => {
            assert.isNull(_caught(() => _assertReporterTargetSupport(["./mine.js"], "node")));
        });

        it("should allow built-in names on every target", () => {
            assert.isNull(_caught(() => _assertReporterTargetSupport(["spec", "tap"], "browser")));
            assert.isNull(_caught(() => _assertReporterTargetSupport(["spec", "tap"], "worker")));
        });

        it("should reject a module reporter on the browser target", () => {
            const caught = _caught(() => _assertReporterTargetSupport(["./mine.js"], "browser"));

            assert.isDefined(caught, "expected a throw");
            assert.isTrue(_isUserError(caught));
            assert.includes(caught.message, "./mine.js");
            assert.includes(caught.message, "browser target");
            assert.includes(_userErrorHints(caught)[1], "--target node");
        });

        it("should reject a module reporter on the worker target", () => {
            const caught = _caught(() => _assertReporterTargetSupport(["./mine.js"], "worker"));

            assert.isDefined(caught, "expected a throw");
            assert.includes(caught.message, "worker target");
        });

        it("should reject a module reporter mixed in with built-in names", () => {
            const caught = _caught(() => _assertReporterTargetSupport(["spec", "@me/reporter", "tap"], "browser"));

            assert.isDefined(caught, "expected a throw");
            assert.includes(caught.message, "@me/reporter");
        });

        it("should report the stripped specifier, not the module: prefix", () => {
            const caught = _caught(() => _assertReporterTargetSupport([_REPORTER_MODULE_PREFIX + "my-reporter"], "browser"));

            assert.includes(caught.message, "'my-reporter'");
        });

        it("should tolerate no configured reporters at all", () => {
            assert.isNull(_caught(() => _assertReporterTargetSupport(undefined, "browser")));
            assert.isNull(_caught(() => _assertReporterTargetSupport([], "browser")));
        });
    });
});
