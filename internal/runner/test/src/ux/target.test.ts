/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { buildTargetUrl, targetFromPath } from "../../../src/ux/browser/ui/target";

/**
 * Switching the interactive page between the browser and worker targets.
 *
 * Both are served side by side by one session whatever `--target` said, so the switch is a plain
 * navigation to the sibling URL -- which makes the whole of it the two functions here.
 */
describe("ux target", () => {

    describe("targetFromPath", () => {
        it("should name the target the path ends in", () => {
            assert.equal(targetFromPath("/__tripwire__/browser"), "browser");
            assert.equal(targetFromPath("/__tripwire__/worker"), "worker");
        });

        it("should allow a trailing slash", () => {
            assert.equal(targetFromPath("/__tripwire__/browser/"), "browser");
            assert.equal(targetFromPath("/__tripwire__/worker/"), "worker");
        });

        it("should ignore case", () => {
            assert.equal(targetFromPath("/__tripwire__/Browser"), "browser");
        });

        it("should name nothing for a path that is not a target page", () => {
            assert.equal(targetFromPath("/"), "");
            assert.equal(targetFromPath("/__tripwire__/"), "");
            assert.equal(targetFromPath("/browsers"), "");
            assert.equal(targetFromPath(""), "");
        });

        it("should only look at the last segment", () => {
            assert.equal(targetFromPath("/worker/__tripwire__/browser"), "browser");
        });
    });

    describe("buildTargetUrl", () => {
        const parts = { pathname: "/__tripwire__/browser", search: "", hash: "" };

        it("should swap the target segment", () => {
            assert.equal(buildTargetUrl(parts, "worker"), "/__tripwire__/worker");
            assert.equal(buildTargetUrl({ pathname: "/__tripwire__/worker", search: "", hash: "" }, "browser"), "/__tripwire__/browser");
        });

        it("should keep a trailing slash", () => {
            assert.equal(buildTargetUrl({ pathname: "/__tripwire__/browser/", search: "", hash: "" }, "worker"), "/__tripwire__/worker/");
        });

        it("should carry the scope in the hash across the switch", () => {
            // The whole reason the hash is preserved: the same tests run on either target, so the
            // suite or test that is selected should still be selected afterwards.
            assert.equal(
                buildTargetUrl({ pathname: "/__tripwire__/browser", search: "", hash: "#suite=k445do" }, "worker"),
                "/__tripwire__/worker#suite=k445do"
            );
        });

        it("should carry the query string too", () => {
            assert.equal(
                buildTargetUrl({ pathname: "/__tripwire__/browser", search: "?autofinish=1", hash: "#test=1ir1d9z" }, "worker"),
                "/__tripwire__/worker?autofinish=1#test=1ir1d9z"
            );
        });

        it("should leave a path that names no target alone", () => {
            assert.equal(buildTargetUrl({ pathname: "/", search: "?a=1", hash: "#b" }, "worker"), "/?a=1#b");
        });

        it("should be its own inverse", () => {
            const toWorker = buildTargetUrl(parts, "worker");
            const back = buildTargetUrl({ pathname: toWorker, search: "", hash: "" }, "browser");

            assert.equal(back, parts.pathname);
        });
    });
});
