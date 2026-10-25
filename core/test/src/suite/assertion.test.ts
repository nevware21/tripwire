/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { useSuite } from "../../../src/suite/suite";
import { assert } from "../../../src/assert/assertClass";
import { expect } from "../../../src/assert/expect";
import { createTestRunner } from "../../../src/suite/runner";
import { createSuite } from "../../../src/suite/suite";
import { IListener } from "../../../src/interfaces/IListener";
import { IAssertionContext } from "../../../src/assert/interface/IAssertionContext";
import { describe as selfDescribe } from "../../../src/suite/suite";
import { it as selfIt } from "../../../src/suite/it";

describe("Evaluation Notifications", () => {
    describe("Evaluation listener callbacks", () => {
        it("should notify on evaluation", () => {
            const testSuite = createSuite();
            let testCallCount = 0;

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test with assertion", () => {
                        testCallCount++;
                        expect(1).to.equal(1);
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            let evaluationCalled = false;
            let assertContext: IAssertionContext | null = null;

            const listener: IListener = {
                onAssert(context: ICachedValue<IAssertionContext>) {
                    evaluationCalled = true;
                    assertContext = context.v;
                }
            };

            runner.addListener(listener);
            return runner.run().then(() => {
                let theContext = assertContext;

                assert.equal(testCallCount, 1, "Test should have been called once");
                assert.isTrue(evaluationCalled, "onAssert should have been called");

                assert.equal(theContext?.value, 1);
                assert.isTrue(theContext?.passed, "Evaluation should have passed");
            });
        });

        it("should provide evaluation context with operation path", () => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test with chained assertion", () => {
                        expect([1, 2, 3]).to.be.an.array();
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            let capturedContext: IAssertionContext | null = null;

            const listener: IListener = {
                onAssert(context: ICachedValue<IAssertionContext>) {
                    capturedContext = context.v;
                }
            };

            runner.addListener(listener);
            return runner.run().then(() => {
                assert.isNotNull(capturedContext, "Should have captured evaluation context");
                if (capturedContext) {
                    assert.isDefined(capturedContext.opPath, "Should have operation path");
                }
            });
        });

        it("should notify for failed evaluations", () => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test with failing assertion", () => {
                        try {
                            expect(1).to.equal(2);
                        } catch (e) {
                            // Catch the error so the test doesn't fail
                        }
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            let failedEvaluation: IAssertionContext | null = null;

            const listener: IListener = {
                onAssert(context: ICachedValue<IAssertionContext>) {
                    if (!context.v.passed) {
                        failedEvaluation = context.v;
                    }
                }
            };

            runner.addListener(listener);
            return runner.run().then(() => {
                assert.isNotNull(failedEvaluation, "Should have captured failed evaluation");
                if (failedEvaluation) {
                    assert.isFalse(failedEvaluation.passed, "Evaluation should have failed");
                    assert.isDefined(failedEvaluation.error, "Should have error");
                }
            });
        });

        it("should track multiple evaluations in a single test", () => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test with multiple assertions", () => {
                        expect(1).to.equal(1);
                        expect("hello").to.be.a.string();
                        expect(true).to.be.true();
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            let evaluationCount = 0;

            const listener: IListener = {
                onAssert() {
                    evaluationCount++;
                }
            };

            runner.addListener(listener);
            return runner.run().then(() => {
                assert.isTrue(evaluationCount >= 3, `Should have at least 3 evaluations, got ${evaluationCount}`);
            });
        });
    });
});
