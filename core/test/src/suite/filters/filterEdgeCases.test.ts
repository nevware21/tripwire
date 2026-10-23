/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../../src/assert/assertClass";
import { createSuiteIDFilter, createTestIDFilter } from "../../../../src/suite/filters/idFilter";
import { createSuiteNameFilter, createTestNameFilter } from "../../../../src/suite/filters/nameFilter";
import { ITestCase } from "../../../../src/interfaces/suite/ITestCase";
import { ITestSuite } from "../../../../src/suite/interfaces/ITestSuite";

function bareSuite(tests: ITestCase[], suites: ITestSuite[] = []): ITestSuite {
    return {
        id: undefined,
        description: undefined,
        suites,
        tests,
        beforeAllHooks: [],
        afterAllHooks: [],
        beforeEachHooks: [],
        afterEachHooks: [],
        only: false,
        skip: false
    };
}

function bareTest(id?: string, description?: string): ITestCase {
    return {
        id,
        description,
        only: false,
        skip: false
    };
}

/**
 * Suites and tests built by hand (or still being defined) may carry no id or description at all. A filter
 * must treat them as non-matching rather than fail on them.
 */
describe("filters on tests and suites without an id or description", () => {
    describe("createTestIDFilter", () => {
        const filter = createTestIDFilter(["wanted"]);

        it("should not match a test without an id", () => {
            assert.isFalse(filter.canRunTest(bareTest(undefined, "no id")));
            assert.isTrue(filter.canRunTest(bareTest("wanted", "has id")));
        });

        it("should not run a suite whose tests and child suites have no ids", () => {
            const child = bareSuite([bareTest(undefined)]);
            const suite = bareSuite([bareTest(undefined), bareTest("")], [child]);

            assert.isFalse(filter.canRunSuite(suite));
        });

        it("should run a suite when a nested test has a matching id", () => {
            const child = bareSuite([bareTest("wanted")]);
            const suite = bareSuite([bareTest(undefined)], [bareSuite([], [child])]);

            assert.isTrue(filter.canRunSuite(suite));
        });
    });

    describe("createSuiteIDFilter", () => {
        const filter = createSuiteIDFilter(["wanted"]);

        it("should not run a suite without an id anywhere in its chain", () => {
            const child = bareSuite([bareTest("t")]);
            const parent = bareSuite([], [child]);
            child.parent = parent;

            assert.isFalse(filter.canRunSuite(child));
            assert.isFalse(filter.canRunSuite(parent));
        });

        it("should run a suite whose ancestor matches", () => {
            const parent = bareSuite([]);
            parent.id = "wanted";
            const child = bareSuite([bareTest("t")]);
            child.parent = parent;

            assert.isTrue(filter.canRunSuite(child));
        });
    });

    describe("createSuiteNameFilter", () => {
        const filter = createSuiteNameFilter(["wanted"]);

        it("should not run a suite without a description anywhere in its chain", () => {
            const child = bareSuite([bareTest("t")]);
            const parent = bareSuite([], [child]);
            child.parent = parent;

            assert.isFalse(filter.canRunSuite(child));
            assert.isFalse(filter.canRunSuite(parent));
        });

        it("should run a suite whose descendant matches", () => {
            const grandChild = bareSuite([]);
            grandChild.description = "the wanted one";
            const parent = bareSuite([], [bareSuite([], [grandChild])]);

            assert.isTrue(filter.canRunSuite(parent));
        });
    });

    describe("createTestNameFilter", () => {
        it("should not match a test without a description", () => {
            const filter = createTestNameFilter(["wanted"]);

            assert.isFalse(filter.canRunTest(bareTest("id", undefined)));
            assert.isFalse(filter.canRunTest(bareTest("id", "")));
            assert.isTrue(filter.canRunTest(bareTest("id", "the wanted one")));
        });

        it("should not run a suite whose tests have no descriptions", () => {
            const filter = createTestNameFilter(["wanted"]);
            const suite = bareSuite([bareTest("a"), bareTest("b")], [bareSuite([bareTest("c")])]);

            assert.isFalse(filter.canRunSuite(suite));
        });

        it("should honour exact matching", () => {
            const filter = createTestNameFilter(["Wanted"], true);

            assert.isTrue(filter.canRunTest(bareTest("id", "Wanted")));
            assert.isFalse(filter.canRunTest(bareTest("id", "wanted")));
            assert.isFalse(filter.canRunTest(bareTest("id", "the Wanted one")));
            assert.isFalse(filter.canRunTest(bareTest("id", undefined)));
        });
    });
});
