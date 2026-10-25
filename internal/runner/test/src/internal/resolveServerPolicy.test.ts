/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { _resolveServerPolicy } from "../../../src/internal/resolveServerPolicy";

describe("internal resolveServerPolicy", () => {
    describe("the default -- no --no-server", () => {
        it("should start the server when nothing was parsed at all", () => {
            const policy = _resolveServerPolicy(null, "node");

            assert.isTrue(policy.shouldStartServer);
            assert.isUndefined(policy.warning);
        });

        it("should start the server when --no-server was not passed", () => {
            const policy = _resolveServerPolicy({ noServer: false }, "browser", "open");

            assert.isTrue(policy.shouldStartServer);
            assert.isUndefined(policy.warning);
        });

        it("should treat a missing noServer field as not passed", () => {
            const policy = _resolveServerPolicy({}, "browser");

            assert.isTrue(policy.shouldStartServer);
            assert.isUndefined(policy.warning);
        });
    });

    describe("--no-server honoured", () => {
        it("should not start the server for the node target", () => {
            const policy = _resolveServerPolicy({ noServer: true }, "node");

            assert.isFalse(policy.shouldStartServer);
            assert.isUndefined(policy.warning);
        });

        it("should not start the server for browser without --browser-launch open", () => {
            const policy = _resolveServerPolicy({ noServer: true }, "browser");

            assert.isFalse(policy.shouldStartServer);
            assert.isUndefined(policy.warning);
        });

        it("should not start the server for a --browser-launch mode other than open", () => {
            const policy = _resolveServerPolicy({ noServer: true }, "browser", "manual");

            assert.isFalse(policy.shouldStartServer);
            assert.isUndefined(policy.warning);
        });

        it("should honour --no-server for the node target even with --browser-launch open", () => {
            // The override is specific to the two targets that are served a page; node is
            // not, so "open" cannot resurrect the server here.
            const policy = _resolveServerPolicy({ noServer: true }, "node", "open");

            assert.isFalse(policy.shouldStartServer);
            assert.isUndefined(policy.warning);
        });
    });

    describe("--no-server overridden by --browser-launch open", () => {
        it("should start the server anyway for the browser target, and say why", () => {
            const policy = _resolveServerPolicy({ noServer: true }, "browser", "open");

            assert.isTrue(policy.shouldStartServer);
            assert.equal(policy.warning, "Ignoring --no-server because --browser-launch open requires the server to be running.");
        });

        it("should start the server anyway for the worker target, and say why", () => {
            const policy = _resolveServerPolicy({ noServer: true }, "worker", "open");

            assert.isTrue(policy.shouldStartServer);
            assert.equal(policy.warning, "Ignoring --no-server because --browser-launch open requires the server to be running.");
        });

        it("should always pair the override with a warning, never silently", () => {
            // The point of the branch is that the user asked for no server and is getting
            // one; a silent override would be the defect.
            const targets = [ "browser", "worker" ];

            for (let lp = 0; lp < targets.length; lp++) {
                const policy = _resolveServerPolicy({ noServer: true }, targets[lp], "open");

                assert.isTrue(policy.shouldStartServer, targets[lp]);
                assert.isString(policy.warning, targets[lp]);
            }
        });
    });
});
