/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { _REPORTER_MODULE_PREFIX, _isReporterModuleSpec, _reporterModuleId } from "../../../src/internal/reporterSpec";
import { REPORTER_NAMES } from "../../../src/reporters/createReporter";

describe("internal reporterSpec", () => {
    describe("_isReporterModuleSpec", () => {
        // The property the whole design rests on: if any built-in name were ever to look like a
        // specifier, selecting it would silently try to require() it instead. A future reporter
        // called "spec.v2" or "@team/spec" would fail here rather than in the field.
        it("should classify no built-in reporter name as a module", () => {
            for (let lp = 0; lp < REPORTER_NAMES.length; lp++) {
                assert.isFalse(_isReporterModuleSpec(REPORTER_NAMES[lp]), REPORTER_NAMES[lp] + " is a built-in name");
            }
        });

        it("should classify a relative path as a module", () => {
            assert.isTrue(_isReporterModuleSpec("./my-reporter.js"));
            assert.isTrue(_isReporterModuleSpec("../reporters/mine"));
            assert.isTrue(_isReporterModuleSpec("reporters/mine"));
        });

        it("should classify a windows path as a module", () => {
            assert.isTrue(_isReporterModuleSpec("C:\project\reporters\mine.js"));
            assert.isTrue(_isReporterModuleSpec(".\mine.js"));
        });

        it("should classify a bare filename with an extension as a module", () => {
            assert.isTrue(_isReporterModuleSpec("mine.js"));
        });

        it("should classify a scoped package as a module", () => {
            assert.isTrue(_isReporterModuleSpec("@me/tripwire-reporter"));
        });

        it("should classify a package subpath as a module", () => {
            assert.isTrue(_isReporterModuleSpec("some-pkg/reporter"));
        });

        // The one ambiguous case: a bare package name is shaped exactly like a mistyped built-in,
        // so it stays an error unless the user says explicitly which they meant.
        it("should not classify a bare word as a module without the explicit prefix", () => {
            assert.isFalse(_isReporterModuleSpec("my-reporter"));
            assert.isFalse(_isReporterModuleSpec("spce"));
        });

        it("should classify an explicitly prefixed bare package as a module", () => {
            assert.isTrue(_isReporterModuleSpec(_REPORTER_MODULE_PREFIX + "my-reporter"));
        });

        it("should classify an explicitly prefixed built-in name as a module", () => {
            // Deliberate: the prefix is the user saying "load this, do not look it up", so a
            // package that happens to be called `tap` is still reachable.
            assert.isTrue(_isReporterModuleSpec(_REPORTER_MODULE_PREFIX + "tap"));
        });

        it("should classify an empty value as not a module", () => {
            assert.isFalse(_isReporterModuleSpec(""));
            assert.isFalse(_isReporterModuleSpec(undefined as any));
        });
    });

    describe("_reporterModuleId", () => {
        it("should return a plain specifier unchanged", () => {
            assert.equal(_reporterModuleId("./my-reporter.js"), "./my-reporter.js");
            assert.equal(_reporterModuleId("@me/reporter"), "@me/reporter");
        });

        it("should strip the explicit prefix", () => {
            assert.equal(_reporterModuleId(_REPORTER_MODULE_PREFIX + "my-reporter"), "my-reporter");
        });

        it("should trim whitespace after the explicit prefix", () => {
            assert.equal(_reporterModuleId(_REPORTER_MODULE_PREFIX + " my-reporter "), "my-reporter");
        });

        // Guards the loader against ever being handed a built-in name: `""` is falsy, and
        // `_loadModule("")` is a no-op lookup rather than a require of something arbitrary.
        it("should return an empty id for a built-in name", () => {
            assert.equal(_reporterModuleId("spec"), "");
            assert.equal(_reporterModuleId("no-such-reporter"), "");
        });
    });
});
