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
import { IListenerContext } from "../../../src/interfaces/IListenerContext";
import { describe as selfDescribe } from "../../../src/suite/suite";
import { it as selfIt } from "../../../src/suite/it";
import { eListenerEvent, ListenerEvent } from "../../../src/types/ListenerEvent";
import { IDoneFn } from "../../../src/interfaces/suite/IDoneFn";

describe("Test Listener", () => {
    describe("Listener callbacks", () => {
        it("should call start when test run starts", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test 1", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let runStartCalled = false;

            const listener: IListener = {
                onStart(event: ListenerEvent, context: ICachedValue<IListenerContext>) {
                    const ctx = context.v;
                    if (ctx.type === eListenerEvent.Run) {
                        runStartCalled = true;
                        assert.isObject(ctx);
                        if (ctx.start) {
                            assert.equal(ctx.start.totalTests, 1);
                        }
                        assert.equal(ctx.suite, testSuite);
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isTrue(runStartCalled, "start should have been called for run");
                done();
            }, done.fail);
        });

        it("should call start and done for each test", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test 1", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let testStartCalled = false;
            let testEndCalled = false;

            const listener: IListener = {
                onStart(event: ListenerEvent, context: ICachedValue<IListenerContext>) {
                    const ctx = context.v;
                    if (ctx.type === eListenerEvent.Test) {
                        testStartCalled = true;
                        if (ctx.test) {
                            assert.equal(ctx.test.description, "test 1");
                        }
                    }
                },
                onDone(event: ListenerEvent, context: ICachedValue<IListenerContext>) {
                    const ctx = context.v;
                    if (ctx.type === eListenerEvent.Test) {
                        testEndCalled = true;
                        if (ctx.test) {
                            assert.equal(ctx.test.description, "test 1");
                        }
                        if (ctx.end) {
                            assert.equal(ctx.end.status, "passed");
                            expect(ctx.end.duration).to.be.ok;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isTrue(testStartCalled, "start should have been called for test");
                assert.isTrue(testEndCalled, "done should have been called for test");
                done();
            }, done.fail);
        });

        it("should support multiple listeners", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test 1", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let listener1Called = false;
            let listener2Called = false;

            const listener1: IListener = {
                onDone(event: ListenerEvent, context: ICachedValue<IListenerContext>) {
                    const ctx = context.v;
                    if (ctx.type === eListenerEvent.Test) {
                        listener1Called = true;
                    }
                }
            };

            const listener2: IListener = {
                onDone(event: ListenerEvent, context: ICachedValue<IListenerContext>) {
                    const ctx = context.v;
                    if (ctx.type === eListenerEvent.Test) {
                        listener2Called = true;
                    }
                }
            };

            runner.addListener(listener1);
            runner.addListener(listener2);

            runner.run().then(() => {
                assert.isTrue(listener1Called, "listener1 should have been called");
                assert.isTrue(listener2Called, "listener2 should have been called");
                done();
            }, done.fail);
        });

        it("should allow removing a listener", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test 1", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let listenerCalled = false;

            const listener: IListener = {
                onDone() {
                    listenerCalled = true;
                }
            };

            runner.addListener(listener);
            runner.removeListener(listener);

            runner.run().then(() => {
                assert.isFalse(listenerCalled, "listener should not have been called after removal");
                done();
            }, done.fail);
        });
    });

    describe("getResults", () => {
        it("should return listener end context with timing information", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test 1", () => {});
                });
            });

            const runner = createTestRunner(testSuite);

            runner.run().then(() => {
                const results = runner.getResults();
                assert.equal(results.total, 1);
                assert.equal(results.passed, 1);
                assert.equal(results.failed, 0);
                expect(results.duration).to.be.ok;
                expect(results.start).to.be.ok;
                expect(results.end).to.be.ok;
                assert.isTrue(results.end >= results.start);
                assert.equal(results.duration, results.end - results.start);
                done();
            }, done.fail);
        });
    });
});
