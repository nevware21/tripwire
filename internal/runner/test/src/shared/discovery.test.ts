/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    assert,
    useSuite, createSuite,
    describe as selfDescribe, it as selfIt
} from "@nevware21/tripwire";
import { collectSuiteAndTests, createEmptyDiscovery } from "../../../src/shared/discovery";

/**
 * `collectSuiteAndTests` produces the lists behind the interactive UI's Scope picker.
 *
 * That this file runs at all is half the point of the suite: the function used to live in
 * `ux/browser/ui/selection.ts`, which imports `./dom` and so could be loaded by neither node nor
 * a Worker. The worker target consequently had no way to build a discovery and reported an empty
 * one, leaving the picker permanently on "No matches". Moving it to `src/shared/` is what makes
 * it reachable from `client/workerRunner.ts` -- and testable here.
 *
 * The main behaviours run against a real `createSuite()` tree rather than a hand-written object,
 * so what is asserted is the shape the runner actually produces. The defensive cases use plain
 * objects, which is the only way to express trees the suite builder cannot produce (a test with
 * no description, a node missing its `tests`/`suites` arrays).
 */

function buildDiscovery(define: () => void) {
    const suite = createSuite();
    useSuite(suite, define);
    return collectSuiteAndTests(suite);
}

describe("shared discovery", () => {
    describe("collectSuiteAndTests", () => {
        it("lists every suite, joining nested titles with ' > '", () => {
            const discovery = buildDiscovery(() => {
                selfDescribe("outer", () => {
                    selfIt("alpha", () => {});
                    selfDescribe("inner", () => {
                        selfIt("beta", () => {});
                    });
                });
                selfDescribe("other", () => {
                    selfIt("gamma", () => {});
                });
            });

            // Each nesting level is its own entry -- the picker offers "outer" and
            // "outer > inner" separately, so either can be selected as a run scope.
            assert.deepEqual(discovery.suites, ["other", "outer", "outer > inner"]);
        });

        it("gives every test a fullTitle of its suite title plus its own description", () => {
            const discovery = buildDiscovery(() => {
                selfDescribe("outer", () => {
                    selfIt("alpha", () => {});
                    selfDescribe("inner", () => {
                        selfIt("beta", () => {});
                    });
                });
            });

            assert.deepEqual(discovery.tests, [
                { suiteTitle: "outer", testName: "alpha", fullTitle: "outer > alpha" },
                { suiteTitle: "outer > inner", testName: "beta", fullTitle: "outer > inner > beta" }
            ]);
        });

        it("does not let the synthetic root suite contribute a title part", () => {
            // A test declared outside any describe belongs to the root suite, which is named
            // "root"/"(root)". That name is an implementation detail and must not appear in a
            // picker, so such a test gets a blank suiteTitle and its bare description.
            const discovery = buildDiscovery(() => {
                selfIt("loose", () => {});
            });

            assert.deepEqual(discovery.suites, [], "the root suite must not be offered as a scope");
            assert.deepEqual(discovery.tests, [
                { suiteTitle: "", testName: "loose", fullTitle: "loose" }
            ]);
        });

        it("sorts suites and tests, so the picker order does not depend on declaration order", () => {
            const discovery = buildDiscovery(() => {
                selfDescribe("zulu", () => {
                    selfIt("zeta", () => {});
                    selfIt("alpha", () => {});
                });
                selfDescribe("alpha", () => {
                    selfIt("omega", () => {});
                });
            });

            assert.deepEqual(discovery.suites, ["alpha", "zulu"]);
            assert.deepEqual(discovery.tests.map((t) => t.fullTitle), [
                "alpha > omega", "zulu > alpha", "zulu > zeta"
            ]);
        });

        it("lists a repeated suite title once, but keeps both suites' tests", () => {
            // Two `describe("dup")` blocks at the same level are two distinct suite nodes with
            // one title. Selecting that title scopes the run to both, so offering it twice
            // would be a duplicate entry that changes nothing.
            const discovery = buildDiscovery(() => {
                selfDescribe("dup", () => {
                    selfIt("first", () => {});
                });
                selfDescribe("dup", () => {
                    selfIt("second", () => {});
                });
            });

            assert.deepEqual(discovery.suites, ["dup"]);
            assert.deepEqual(discovery.tests.map((t) => t.fullTitle), ["dup > first", "dup > second"]);
        });

        it("every listed test names a listed suite, or no suite at all", () => {
            // The invariant a suite selection depends on: selecting a suite runs every test whose
            // suiteTitle is that suite or nested under it (see isSuiteOrDescendant in
            // shared/filters.ts), so a suiteTitle that never appears in the suite list would be a
            // test no suite selection could ever reach.
            const discovery = buildDiscovery(() => {
                selfIt("loose", () => {});
                selfDescribe("outer", () => {
                    selfIt("alpha", () => {});
                    selfDescribe("inner", () => {
                        selfDescribe("deep", () => {
                            selfIt("beta", () => {});
                        });
                    });
                });
            });

            const orphans = discovery.tests.filter((t) => t.suiteTitle && discovery.suites.indexOf(t.suiteTitle) === -1);
            assert.deepEqual(orphans, [], "tests naming a suite that is not offered: " + JSON.stringify(orphans));

            const mismatched = discovery.tests.filter((t) => {
                return t.fullTitle !== (t.suiteTitle ? t.suiteTitle + " > " + t.testName : t.testName);
            });
            assert.deepEqual(mismatched, [], "fullTitle disagrees with suiteTitle/testName");
        });

        it("names a test that has no description rather than dropping it", () => {
            const discovery = collectSuiteAndTests({
                description: "outer",
                tests: [{ description: "named" }, {}],
                suites: []
            });

            assert.deepEqual(discovery.tests.map((t) => t.fullTitle), [
                "outer > (unnamed test)", "outer > named"
            ]);
        });

        it("tolerates an absent tree and nodes missing their tests/suites arrays", () => {
            // Discovery runs before anything else in the page and must never be the thing that
            // throws -- an empty picker is recoverable, a broken host page is not.
            assert.deepEqual(collectSuiteAndTests(null), { suites: [], tests: [] });
            assert.deepEqual(collectSuiteAndTests(undefined), { suites: [], tests: [] });
            assert.deepEqual(collectSuiteAndTests({}), { suites: [], tests: [] });
            assert.deepEqual(collectSuiteAndTests({ description: "outer" }), { suites: ["outer"], tests: [] });
        });
    });

    describe("createEmptyDiscovery", () => {
        it("returns an empty discovery whose arrays are safe to index", () => {
            const empty = createEmptyDiscovery();

            assert.deepEqual(empty.suites, []);
            assert.deepEqual(empty.tests, []);
        });

        it("returns a fresh object each time, so one caller cannot poison another", () => {
            const first = createEmptyDiscovery();
            const second = createEmptyDiscovery();

            first.suites.push("mutated");

            assert.deepEqual(second.suites, [], "the two calls share an array");
            assert.isFalse(first.tests === second.tests, "the two calls share a tests array");
        });
    });
});
