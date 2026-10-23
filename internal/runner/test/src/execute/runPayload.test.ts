/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import { _createRunPayload } from "../../../src/execute/runPayload";

/**
 * The run payload is what the browser and worker pages receive: the module ids translated to the URLs
 * the server serves them from, plus the run settings the CLI flags selected.
 */
describe("execute run payload", () => {
    const graph = {
        entryIds: ["test/a.test.ts", "test/b.test.ts"],
        tripwireModuleId: "node_modules/@nevware21/tripwire/dist/tripwire.js",
        coverageOnlyIds: ["src/only-covered.ts"],
        moduleUrls: {
            "test/a.test.ts": "/modules/a.js",
            "node_modules/@nevware21/tripwire/dist/tripwire.js": "/modules/tripwire.js",
            "src/only-covered.ts": "/modules/only-covered.js"
        } as Record<string, string>
    };

    it("translates module ids to their served urls, keeping ids that have none", () => {
        const payload = _createRunPayload(graph, {});

        assert.deepEqual(payload.entryIds, ["/modules/a.js", "test/b.test.ts"]);
        assert.equal(payload.tripwireModuleId, "/modules/tripwire.js");
        assert.deepEqual(payload.coverageOnlyIds, ["/modules/only-covered.js"]);
    });

    it("omits the coverage-only list when it is empty or absent", () => {
        assert.isUndefined(_createRunPayload({ ...graph, coverageOnlyIds: [] }, {}).coverageOnlyIds);
        assert.isUndefined(_createRunPayload({ entryIds: [], tripwireModuleId: "tw", moduleUrls: {} }, {}).coverageOnlyIds);
    });

    it("copes with a graph that carries no url map", () => {
        const payload = _createRunPayload({ entryIds: ["x"], tripwireModuleId: "tw", moduleUrls: undefined as any }, {});

        assert.deepEqual(payload.entryIds, ["x"]);
        assert.equal(payload.tripwireModuleId, "tw");
    });

    it("defaults the settings for a run with no flags", () => {
        const settings = _createRunPayload(graph, {}).settings;

        assert.isUndefined(settings.slow);
        assert.isUndefined(settings.timeout);
        assert.isUndefined(settings.retries);
        assert.deepEqual(settings.grep, []);
        assert.isFalse(settings.invert);
        assert.isFalse(settings.bail);
        assert.isFalse(settings.trace);
        assert.deepEqual(settings.reporter, ["spec"], "the spec reporter is the default");
        assert.isUndefined(settings.server);
    });

    it("carries the parsed flags and serialises the grep expressions", () => {
        const settings = _createRunPayload(graph, {
            slow: 10,
            timeout: 500,
            retries: 2,
            grep: [/alpha/i, /beta$/],
            invert: true,
            bail: 1,
            trace: "yes",
            reporter: ["dot", "json"]
        }).settings;

        assert.equal(settings.slow, 10);
        assert.equal(settings.timeout, 500);
        assert.equal(settings.retries, 2);
        assert.deepEqual(settings.grep, [{ source: "alpha", flags: "i" }, { source: "beta$", flags: "" }]);
        assert.isTrue(settings.invert);
        assert.isTrue(settings.bail);
        assert.isTrue(settings.trace);
        assert.deepEqual(settings.reporter, ["dot", "json"]);
    });

    it("falls back to the spec reporter when the reporter list is empty", () => {
        assert.deepEqual(_createRunPayload(graph, { reporter: [] }).settings.reporter, ["spec"]);
    });
});
