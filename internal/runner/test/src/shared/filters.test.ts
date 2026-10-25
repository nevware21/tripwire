/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    assert, IDoneFn, eListenerAction, eListenerEvent,
    useSuite, createSuite, createTestRunner,
    describe as selfDescribe, it as selfIt, before as selfBefore
} from "@nevware21/tripwire";
import { createPromise, doAwait } from "@nevware21/ts-async";
import { applyFilters, createGrepFilter, createSelectionFilter, createSettingsGrepFilter, isSuiteOrDescendant, IRunnerFilter } from "../../../src/shared/filters";
import { createBailListener } from "../../../src/shared/bailListener";
import {
    createAssertionLabel, getSuiteDisplayName, getSuiteKeyChain, getSuitePartsFromNode,
    isRootSuiteName, makeGrepTitle, makeSuiteKey, makeTestKey
} from "../../../src/shared/suiteNames";

/**
 * Runs a fixed three-suite tree through `filters` and resolves with the full titles of the
 * tests that actually ran -- the filters are shared by the node, browser and worker targets,
 * so this exercises them the only way that proves all three agree: against a real runner.
 */
function runFiltered(filters: Array<IRunnerFilter | null>) {
    const suite = createSuite();

    useSuite(suite, () => {
        selfDescribe("outer", () => {
            selfIt("alpha", () => {});
            selfIt("beta", () => {});
            selfDescribe("inner", () => {
                selfIt("gamma", () => {});
            });
        });
        selfDescribe("other", () => {
            selfIt("delta", () => {});
        });
    });

    const ran: string[] = [];

    return createPromise<string[]>((resolve, reject) => {
        const runner = createTestRunner(suite);
        applyFilters(runner, filters);

        runner.addListener({
            onDone: (event: any, context: any) => {
                const ctx = context && context.v;
                if (ctx && ctx.test && ctx.end && ctx.end.status === "passed") {
                    ran.push(makeGrepTitle(getSuitePartsFromNode(ctx.suite), ctx.test.description));
                }
            }
        });

        runner.run().then(() => {
            resolve(ran);
        }, reject);
    });
}

interface IObservedRun {
    /** Full titles of the tests that ran and passed. */
    ran: string[];
    /** The suites whose `before` hook ran, by their own description. */
    hooks: string[];
    /** The suites the runner emitted a `Suite` start event for, as `>`-joined keys. */
    suites: string[];
}

/**
 * Like {@link runFiltered}, but every suite also carries a `before` hook, and the run records
 * which hooks ran and which suites were entered -- so a test can prove that a filter prunes an
 * unrelated suite *entirely*, rather than entering it and merely skipping the tests inside.
 */
function runObserved(filters: Array<IRunnerFilter | null>) {
    const suite = createSuite();
    const hooks: string[] = [];

    useSuite(suite, () => {
        selfDescribe("outer", () => {
            selfBefore(() => { hooks.push("outer"); });
            selfIt("alpha", () => {});
            selfIt("beta", () => {});
            selfDescribe("inner", () => {
                selfBefore(() => { hooks.push("inner"); });
                selfIt("gamma", () => {});
            });
        });
        selfDescribe("other", () => {
            selfBefore(() => { hooks.push("other"); });
            selfIt("delta", () => {});
        });
    });

    const ran: string[] = [];
    const suites: string[] = [];

    return createPromise<IObservedRun>((resolve, reject) => {
        const runner = createTestRunner(suite);
        applyFilters(runner, filters);

        runner.addListener({
            onStart: (event: any, context: any) => {
                const ctx = context && context.v;
                if (ctx && ctx.type === eListenerEvent.Suite && ctx.suite) {
                    suites.push(makeSuiteKey(getSuitePartsFromNode(ctx.suite)));
                }
            },
            onDone: (event: any, context: any) => {
                const ctx = context && context.v;
                if (ctx && ctx.test && ctx.end && ctx.end.status === "passed") {
                    ran.push(makeGrepTitle(getSuitePartsFromNode(ctx.suite), ctx.test.description));
                }
            }
        });

        runner.run().then(() => {
            resolve({ ran, hooks, suites });
        }, reject);
    });
}

describe("shared suiteNames", () => {
    it("should treat the synthetic root names, and nothing else, as root", () => {
        assert.isTrue(isRootSuiteName("root"));
        assert.isTrue(isRootSuiteName("(root)"));
        assert.isTrue(isRootSuiteName("ROOT"), "the check is case-insensitive");
        assert.isTrue(isRootSuiteName(""), "an empty description contributes nothing either way");
        assert.isTrue(isRootSuiteName(undefined));
        assert.isFalse(isRootSuiteName("rooted"));
        assert.isFalse(isRootSuiteName("my suite"));
    });

    it("should walk a suite chain outermost-first, dropping the root", () => {
        const root = { description: "root" };
        const outer = { description: "outer", parent: root };
        const inner = { description: "inner", parent: outer };

        assert.deepEqual(getSuitePartsFromNode(inner), ["outer", "inner"]);
        assert.deepEqual(getSuitePartsFromNode(root), [], "the root alone contributes no parts");
        assert.deepEqual(getSuitePartsFromNode(null), []);
    });

    it("should build the space-joined grep title", () => {
        assert.equal(makeGrepTitle(["outer", "inner"], "a test"), "outer inner a test");
        assert.equal(makeGrepTitle([], "a test"), "a test", "a top-level test has no suite prefix");
        assert.equal(makeGrepTitle(["outer"], ""), "outer ", "a suite with no test name keeps its separator");
    });

    it("should build stable suite and test keys", () => {
        assert.equal(makeSuiteKey(["outer", "inner"]), "outer > inner");
        assert.equal(makeSuiteKey([]), "(default suite)");
        assert.equal(makeTestKey(["outer"], "a test"), "outer :: a test");
        assert.equal(makeTestKey([], undefined), "(default suite) :: (unnamed test)");
    });

    it("should name a suite by its innermost part", () => {
        assert.equal(getSuiteDisplayName(["outer", "inner"]), "inner");
        assert.equal(getSuiteDisplayName([]), "(default suite)");
    });

    it("should expand a suite path into its chain of ancestor keys", () => {
        assert.deepEqual(getSuiteKeyChain(["a", "b", "c"]), ["a", "a > b", "a > b > c"]);
        assert.deepEqual(getSuiteKeyChain([]), ["(default suite)"]);
    });

    it("should label an assertion by message, then op path, then a placeholder", () => {
        assert.equal(createAssertionLabel({ message: "explicit message" }), "explicit message");
        assert.equal(createAssertionLabel({ opPath: ["equal", "deep"] }), "equal.deep");
        assert.equal(createAssertionLabel({ message: "wins", opPath: ["equal"] }), "wins", "a message outranks the op path");
        assert.equal(createAssertionLabel({}), "(assertion)");
        assert.equal(createAssertionLabel(null), "(assertion)");
    });
});

describe("shared filters", () => {
    describe("createGrepFilter", () => {
        it("should return null when there is nothing to filter on", () => {
            assert.isNull(createGrepFilter([], false));
            assert.isNull(createGrepFilter(null as any, false));
        });

        it("should run only the tests whose full title matches", (done: IDoneFn) => {
            doAwait(runFiltered([createGrepFilter([/alpha/], false)]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer alpha"]);
                done();
            }, done.fail);
        });

        // The suite prefix is what makes a pattern able to select a whole suite, and dropping
        // the root's own name from it is what makes an anchored pattern behave the same on all
        // three targets -- the node target used to include it and match differently.
        it("should match against the suite path without the root's name", (done: IDoneFn) => {
            doAwait(runFiltered([createGrepFilter([/^outer inner/], false)]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer inner gamma"], "an anchored pattern should match from the outermost real suite");
                done();
            }, done.fail);
        });

        it("should run every test matched by any of several patterns", (done: IDoneFn) => {
            doAwait(runFiltered([createGrepFilter([/alpha/, /delta/], false)]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer alpha", "other delta"]);
                done();
            }, done.fail);
        });

        it("should run everything the pattern does not match when inverted", (done: IDoneFn) => {
            doAwait(runFiltered([createGrepFilter([/alpha/], true)]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer beta", "outer inner gamma", "other delta"]);
                done();
            }, done.fail);
        });

        it("should run nothing when no test matches", (done: IDoneFn) => {
            doAwait(runFiltered([createGrepFilter([/zzz-no-such-test/], false)]), (ran: string[]) => {
                assert.deepEqual(ran, [], "a no-match grep leaves an empty run for the CLI to report on");
                done();
            }, done.fail);
        });
    });

    describe("createSettingsGrepFilter", () => {
        it("should return null when the settings carry no patterns", () => {
            assert.isNull(createSettingsGrepFilter(undefined));
            assert.isNull(createSettingsGrepFilter({}));
            assert.isNull(createSettingsGrepFilter({ grep: [] }));
        });

        // A RegExp cannot survive postMessage/JSON, so the browser and worker targets receive
        // it as a { source, flags } pair and rebuild it here.
        it("should rebuild a serialized RegExp, flags included", (done: IDoneFn) => {
            doAwait(runFiltered([createSettingsGrepFilter({ grep: [{ source: "ALPHA", flags: "i" }] })]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer alpha"], "the i flag should have survived serialization");
                done();
            }, done.fail);
        });

        it("should tolerate a serialized pattern with no flags", (done: IDoneFn) => {
            doAwait(runFiltered([createSettingsGrepFilter({ grep: [{ source: "beta" }] })]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer beta"]);
                done();
            }, done.fail);
        });

        it("should honour the invert setting", (done: IDoneFn) => {
            doAwait(runFiltered([createSettingsGrepFilter({ grep: [{ source: "outer" }], invert: true })]), (ran: string[]) => {
                assert.deepEqual(ran, ["other delta"]);
                done();
            }, done.fail);
        });
    });

    describe("createSelectionFilter", () => {
        it("should return null when nothing is selected", () => {
            assert.isNull(createSelectionFilter(undefined));
            assert.isNull(createSelectionFilter({}));
            assert.isNull(createSelectionFilter({ suiteTitle: "", testTitle: "" }));
        });

        it("should run only the selected test", (done: IDoneFn) => {
            doAwait(runFiltered([createSelectionFilter({ testTitle: "outer > inner > gamma" })]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer inner gamma"]);
                done();
            }, done.fail);
        });

        it("should run the selected suite's own tests and those of its nested suites", (done: IDoneFn) => {
            doAwait(runFiltered([createSelectionFilter({ suiteTitle: "outer" })]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer alpha", "outer beta", "outer inner gamma"], "selecting a suite runs everything beneath it, as running that describe alone would");
                done();
            }, done.fail);
        });

        it("should run a selected nested suite without its parent's own tests", (done: IDoneFn) => {
            doAwait(runFiltered([createSelectionFilter({ suiteTitle: "outer > inner" })]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer inner gamma"]);
                done();
            }, done.fail);
        });

        it("should not treat a suite whose title merely starts with the selection as selected", (done: IDoneFn) => {
            // "outer" is selected; "outermost" must not match on prefix alone.
            const suite = createSuite();
            useSuite(suite, () => {
                selfDescribe("outermost", () => { selfIt("zeta", () => {}); });
                selfDescribe("outer", () => { selfIt("alpha", () => {}); });
            });
            const ran: string[] = [];
            const runner = createTestRunner(suite);
            applyFilters(runner, [createSelectionFilter({ suiteTitle: "outer" })]);
            runner.addListener({
                onDone: (event: any, context: any) => {
                    const ctx = context && context.v;
                    if (ctx && ctx.test && ctx.end && ctx.end.status === "passed") {
                        ran.push(makeGrepTitle(getSuitePartsFromNode(ctx.suite), ctx.test.description));
                    }
                }
            });
            doAwait(runner.run(), () => {
                assert.deepEqual(ran, ["outer alpha"]);
                done();
            }, done.fail);
        });

        it("should treat a nested suite as part of its parent's selection", () => {
            assert.isTrue(isSuiteOrDescendant("outer", "outer"));
            assert.isTrue(isSuiteOrDescendant("outer > inner", "outer"));
            assert.isTrue(isSuiteOrDescendant("outer > inner > deep", "outer > inner"));
            assert.isFalse(isSuiteOrDescendant("outermost", "outer"));
            assert.isFalse(isSuiteOrDescendant("outer", "outer > inner"));
            assert.isFalse(isSuiteOrDescendant("other", "outer"));
        });

        it("should prefer a selected test over a selected suite", (done: IDoneFn) => {
            doAwait(runFiltered([createSelectionFilter({ suiteTitle: "other", testTitle: "outer > alpha" })]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer alpha"]);
                done();
            }, done.fail);
        });
    });

    describe("suite pruning", () => {
        // Without `canRunSuite`, a filter that only knows about tests still *enters* every suite:
        // its Suite events fire and its before/after hooks run, and only the it() bodies are
        // skipped. In the interactive UI that lit up the whole results tree for a one-suite
        // selection and ran every unrelated before() hook -- indistinguishable, to the person
        // watching, from the selection being ignored.
        it("should not enter, or run the hooks of, suites outside a suite selection", (done: IDoneFn) => {
            doAwait(runObserved([createSelectionFilter({ suiteTitle: "other" })]), (run: IObservedRun) => {
                assert.deepEqual(run.ran, ["other delta"]);
                assert.deepEqual(run.hooks, ["other"], "no before() outside the selected suite may run");
                assert.deepEqual(run.suites, ["other"], "no Suite event outside the selected suite may fire");
                done();
            }, done.fail);
        });

        it("should still enter a selected test's ancestors, and nothing else", (done: IDoneFn) => {
            doAwait(runObserved([createSelectionFilter({ testTitle: "outer > inner > gamma" })]), (run: IObservedRun) => {
                assert.deepEqual(run.ran, ["outer inner gamma"]);
                assert.deepEqual(run.hooks, ["outer", "inner"], "the ancestors' before() hooks are what the test depends on");
                assert.deepEqual(run.suites, ["outer", "outer > inner"]);
                done();
            }, done.fail);
        });

        it("should enter a selected nested suite's ancestors but not its siblings", (done: IDoneFn) => {
            doAwait(runObserved([createSelectionFilter({ suiteTitle: "outer > inner" })]), (run: IObservedRun) => {
                assert.deepEqual(run.ran, ["outer inner gamma"]);
                assert.deepEqual(run.hooks, ["outer", "inner"]);
                assert.deepEqual(run.suites, ["outer", "outer > inner"]);
                done();
            }, done.fail);
        });

        it("should enter a selected suite's nested suites but not its siblings", (done: IDoneFn) => {
            doAwait(runObserved([createSelectionFilter({ suiteTitle: "outer" })]), (run: IObservedRun) => {
                assert.deepEqual(run.ran, ["outer alpha", "outer beta", "outer inner gamma"]);
                assert.deepEqual(run.hooks, ["outer", "inner"]);
                assert.deepEqual(run.suites, ["outer", "outer > inner"]);
                done();
            }, done.fail);
        });

        it("should prune suites --grep leaves nothing to run in, as Mocha does", (done: IDoneFn) => {
            doAwait(runObserved([createGrepFilter([/delta/], false)]), (run: IObservedRun) => {
                assert.deepEqual(run.ran, ["other delta"]);
                assert.deepEqual(run.hooks, ["other"]);
                assert.deepEqual(run.suites, ["other"]);
                done();
            }, done.fail);
        });

        it("should still complete a run when the filter matches nothing at all", (done: IDoneFn) => {
            doAwait(runObserved([createGrepFilter([/matches nothing/], false)]), (run: IObservedRun) => {
                assert.deepEqual(run.ran, []);
                assert.deepEqual(run.hooks, [], "no suite should have been entered");
                assert.deepEqual(run.suites, []);
                done();
            }, done.fail);
        });

        it("should never prune the root suite", () => {
            const filter = createSelectionFilter({ suiteTitle: "nothing has this title" }) as IRunnerFilter;
            const rootSuite: any = { description: "root", parent: undefined, tests: [], suites: [] };

            assert.isFunction(filter.canRunSuite);
            assert.isTrue(filter.canRunSuite!(rootSuite), "the root carries the run itself");
            assert.isFalse(filter.canRunSuite!({ description: "x", parent: rootSuite, tests: [{ description: "t" }], suites: [] }));
        });
    });

    describe("applyFilters", () => {
        it("should apply every non-null filter and skip the nulls", (done: IDoneFn) => {
            doAwait(runFiltered([null, createGrepFilter([/outer/], false), null, createSelectionFilter({ testTitle: "outer > beta" })]), (ran: string[]) => {
                assert.deepEqual(ran, ["outer beta"], "both filters should have applied");
                done();
            }, done.fail);
        });

        it("should run everything when given only nulls", (done: IDoneFn) => {
            doAwait(runFiltered([null, null]), (ran: string[]) => {
                assert.equal(ran.length, 4, "no filters means no filtering");
                done();
            }, done.fail);
        });
    });
});

describe("shared bailListener", () => {
    it("should abort the run on the first failed test", () => {
        const result: any = createBailListener().onDone(2, { v: { test: {}, end: { status: "failed" } } });

        assert.equal(result.action, eListenerAction.Abort, "the run should be aborted");
        assert.isString(result.reason, "and carry a reason for the reporters to show");
    });

    it("should abort on an aborted test as well as a failed one", () => {
        const result: any = createBailListener().onDone(2, { v: { test: {}, end: { status: "aborted" } } });

        assert.equal(result.action, eListenerAction.Abort);
    });

    it("should not abort on a passed, skipped or pending test", () => {
        const listener = createBailListener();

        assert.isUndefined(listener.onDone(2, { v: { test: {}, end: { status: "passed" } } } as any));
        assert.isUndefined(listener.onDone(2, { v: { test: {}, end: { status: "skipped" } } } as any));
        assert.isUndefined(listener.onDone(2, { v: { test: {}, end: { status: "pending" } } } as any));
    });

    it("should ignore suite and hook events, which carry no test", () => {
        const listener = createBailListener();

        assert.isUndefined(listener.onDone(1, { v: { suite: {}, end: { status: "failed" } } } as any));
        assert.isUndefined(listener.onDone(2, { v: {} } as any));
        assert.isUndefined(listener.onDone(2, {} as any));
    });

    it("should stop a real run at the first failure", (done: IDoneFn) => {
        const suite = createSuite();
        const ran: string[] = [];

        useSuite(suite, () => {
            selfDescribe("bail suite", () => {
                selfIt("first passes", () => {
                    ran.push("first");
                });
                selfIt("second fails", () => {
                    ran.push("second");
                    throw new Error("boom");
                });
                selfIt("third never runs", () => {
                    ran.push("third");
                });
            });
        });

        const runner = createTestRunner(suite);
        runner.addListener(createBailListener());

        doAwait(runner.run(), () => {
            assert.deepEqual(ran, ["first", "second"], "the run should stop at the failure");

            const summary = runner.getResults();
            assert.equal(summary.total, 3, "every test is still counted");
            assert.equal(summary.failed, 1, "only the test that actually failed is a failure");
            assert.equal(summary.skipped, 1, "the test that never ran is reported as skipped");
            done();
        }, done.fail);
    });
});
