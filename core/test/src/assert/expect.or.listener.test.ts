/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";
import { createSuite, useSuite, describe as selfDescribe } from "../../../src/suite/suite";
import { it as selfIt } from "../../../src/suite/it";
import { createTestRunner } from "../../../src/suite/runner";
import { IListener } from "../../../src/interfaces/IListener";
import { eListenerAction } from "../../../src/types/ListenerAction";
import { IDoneFn } from "../../../src/interfaces/suite/IDoneFn";
import { createPromise } from "@nevware21/ts-async";

/*
 * `or` relies on a failing clause *throwing*. Two things could stop that or make it misleading: a
 * clause that defers its verdict to a promise, and an assertion listener that answers Continue
 * (which makes the context record a failure instead of throwing it). Both are pinned here.
 */
describe("expect.or -- clause verdicts", () => {
    it("should reject a clause that returns a promise rather than treat it as passed", () => {
        let rejected = createPromise<void>((_resolve, reject) => {
            reject(new Error("settles later"));
        });

        checkError(() => {
            expect(5).or(() => rejected, (e) => e.is.number());
        }, "or() clauses must be synchronous: clause 1 returned a promise", false);
    });

    it("should word the failure so it reads correctly under not", () => {
        checkError(() => {
            expect(5).not.or((e) => e.is.string(), (e) => e.is.number());
        }, "not expected 5 to pass at least one of 2 assertions (failures: [\"expected 5 to be a string\"])");
    });

    describe("with an assertion listener that answers Continue", () => {
        function _run(testBody: () => void, onDone: (results: any, notified: string[]) => void, done: IDoneFn) {
            const testSuite = createSuite();
            const notified: string[] = [];

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", testBody);
                });
            });

            const runner = createTestRunner(testSuite);
            const listener: IListener = {
                onAssert(lazyContext) {
                    const context = lazyContext.v;
                    notified.push((context.passed ? "PASS " : "FAIL ") + context.message);
                    if (!context.passed) {
                        return { action: eListenerAction.Continue };
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                try {
                    onDone(runner.getResults(), notified);
                    done();
                } catch (e) {
                    done.fail(e);
                }
            }, done.fail);
        }

        it("should pass the test when a later clause passes, notifying one assertion only", (done: IDoneFn) => {
            _run(() => {
                expect(5).or((e) => e.is.string(), (e) => e.is.number());
            }, (results, notified) => {
                assert.equal(results.passed, 1, "the test should pass");
                assert.equal(results.failed, 0, "a satisfied or must not record a deferred failure");
                assert.equal(notified.length, 1, "only the combined verdict is reported, not each clause: " + JSON.stringify(notified));
                assert.isTrue(notified[0].indexOf("PASS ") === 0, notified[0]);
            }, done);
        });

        it("should fail the test once when every clause fails", (done: IDoneFn) => {
            _run(() => {
                expect(5).or((e) => e.is.string(), (e) => e.is.above(10));
            }, (results, notified) => {
                assert.equal(results.failed, 1, "the test should fail");
                assert.equal(notified.length, 1, "one failure for the or, not one per clause: " + JSON.stringify(notified));
                assert.isTrue(notified[0].indexOf("FAIL ") === 0, notified[0]);
                assert.isTrue(notified[0].indexOf("expected 5 to be a string") !== -1, "the reasons should be listed: " + notified[0]);
            }, done);
        });
    });
});
