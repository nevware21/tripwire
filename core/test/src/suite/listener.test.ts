/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { useSuite } from "../../../src/suite/suite";
import { assert } from "../../../src/assert/assertClass";
import { expect } from "../../../src/assert/expect";
import { createTestRunner } from "../../../src/suite/runner";
import { createSuite } from "../../../src/suite/suite";
import { IListener } from "../../../src/interfaces/IListener";
import { IListenerContext } from "../../../src/interfaces/IListenerContext";
import { ICachedValue } from "@nevware21/ts-utils";
import { eListenerAction } from "../../../src/types/ListenerAction";
import { describe as selfDescribe } from "../../../src/suite/suite";
import { it as selfIt } from "../../../src/suite/it";
import { before as selfBefore } from "../../../src/suite/before";
import { after as selfAfter } from "../../../src/suite/after";
import { beforeEach as selfBeforeEach } from "../../../src/suite/beforeEach";
import { afterEach as selfAfterEach } from "../../../src/suite/afterEach";
import { eListenerEvent, ListenerEvent } from "../../../src/types/ListenerEvent";
import { IDoneFn } from "../../../src/interfaces/suite/IDoneFn";

describe("Test Listener", () => {
    describe("Listener callbacks", () => {
        it("should call onStart when test run starts", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test 1", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let runStartCalled = false;

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Run) {
                        runStartCalled = true;
                        assert.isObject(context);
                        if (context.start) {
                            assert.equal(context.start.totalTests, 1);
                        }
                        assert.equal(context.suite, testSuite);
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isTrue(runStartCalled, "onStart should have been called for run");
                done();
            }, done.fail);
        });

        it("should call onStart and onDone for each test", (done: IDoneFn) => {
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
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test) {
                        testStartCalled = true;
                        if (context.test) {
                            assert.equal(context.test.description, "test 1");
                        }
                    }
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test) {
                        testEndCalled = true;
                        if (context.test) {
                            assert.equal(context.test.description, "test 1");
                        }
                        if (context.end) {
                            assert.equal(context.end.status, "passed");
                            expect(context.end.duration).to.be.ok;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isTrue(testStartCalled, "onStart should have been called for test");
                assert.isTrue(testEndCalled, "onDone should have been called for test");
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
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test) {
                        listener1Called = true;
                    }
                }
            };

            const listener2: IListener = {
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test) {
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

    describe("Run events", () => {
        it("should fire onStart and onDone for Run events", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let runStartCalled = false;
            let runDoneCalled = false;

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Run) {
                        runStartCalled = true;
                        assert.equal(context.suite, testSuite);
                        if (context.start) {
                            assert.equal(context.start.totalTests, 1);
                        }
                    }
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Run) {
                        runDoneCalled = true;
                        assert.equal(context.suite, testSuite);
                        if (context.end) {
                            assert.equal(context.end.total, 1);
                            assert.equal(context.end.passed, 1);
                            assert.equal(context.end.failed, 0);
                            expect(context.end.duration).to.be.ok;
                            expect(context.end.start).to.be.ok;
                            expect(context.end.end).to.be.ok;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isTrue(runStartCalled, "Run.onStart should have been called");
                assert.isTrue(runDoneCalled, "Run.onDone should have been called");
                done();
            }, done.fail);
        });
    });

    describe("Suite events", () => {
        it("should fire onStart and onDone for Suite events", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Test Suite", () => {
                    selfIt("test 1", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let suiteStartCalled = false;
            let suiteDoneCalled = false;

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Suite) {
                        suiteStartCalled = true;
                        assert.isObject(context.suite);
                        if (context.suite) {
                            assert.equal(context.suite.description, "Test Suite");
                        }
                    }
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Suite) {
                        suiteDoneCalled = true;
                        assert.isObject(context.suite);
                        if (context.suite && context.end) {
                            assert.equal(context.suite.description, "Test Suite");
                            expect(context.end.duration).to.be.ok;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isTrue(suiteStartCalled, "Suite.onStart should have been called");
                assert.isTrue(suiteDoneCalled, "Suite.onDone should have been called");
                done();
            }, done.fail);
        });

        it("should fire events for nested suites", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Outer Suite", () => {
                    selfDescribe("Inner Suite", () => {
                        selfIt("nested test", () => {});
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            const suiteStarts: string[] = [];
            const suiteDones: string[] = [];

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Suite && context.suite) {
                        suiteStarts.push(context.suite.description);
                    }
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Suite && context.suite) {
                        suiteDones.push(context.suite.description);
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.equal(suiteStarts.length, 2, "Should have started 2 suites");
                assert.equal(suiteDones.length, 2, "Should have completed 2 suites");
                assert.includes(suiteStarts, "Outer Suite");
                assert.includes(suiteStarts, "Inner Suite");
                assert.includes(suiteDones, "Outer Suite");
                assert.includes(suiteDones, "Inner Suite");
                done();
            }, done.fail);
        });
    });

    describe("Hook events", () => {
        it("should fire events for before hooks", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfBefore("setup", () => {});
                    selfIt("test", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let hookStartCalled = false;
            let hookDoneCalled = false;

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Hook) {
                        hookStartCalled = true;
                        assert.isObject(context.hook);
                        if (context.hook) {
                            assert.equal(context.hook.name, "setup");
                        }
                    }
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Hook) {
                        hookDoneCalled = true;
                        assert.isObject(context.hook);
                        if (context.hook && context.end) {
                            assert.equal(context.hook.name, "setup");
                            expect(context.end.duration).to.be.ok;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isTrue(hookStartCalled, "Hook.onStart should have been called");
                assert.isTrue(hookDoneCalled, "Hook.onDone should have been called");
                done();
            }, done.fail);
        });

        it("should fire events for after hooks", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfAfter("cleanup", () => {});
                    selfIt("test", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let hookFound = false;

            const listener: IListener = {
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Hook && context.hook) {
                        if (context.hook.name === "cleanup") {
                            hookFound = true;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isTrue(hookFound, "after hook should have fired");
                done();
            }, done.fail);
        });

        it("should fire events for beforeEach hooks", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfBeforeEach("beforeEach setup", () => {});
                    selfIt("test 1", () => {});
                    selfIt("test 2", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let beforeEachCount = 0;

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Hook && context.hook) {
                        if (context.hook.name === "beforeEach setup") {
                            beforeEachCount++;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.equal(beforeEachCount, 2, "beforeEach should fire for each test");
                done();
            }, done.fail);
        });

        it("should fire events for afterEach hooks", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfAfterEach("afterEach cleanup", () => {});
                    selfIt("test 1", () => {});
                    selfIt("test 2", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            let afterEachCount = 0;

            const listener: IListener = {
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Hook && context.hook) {
                        if (context.hook.name === "afterEach cleanup") {
                            afterEachCount++;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.equal(afterEachCount, 2, "afterEach should fire for each test");
                done();
            }, done.fail);
        });
    });

    describe("Event ordering", () => {
        it("should fire events in correct order for simple test", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            const eventLog: string[] = [];

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    const type = context.type === eListenerEvent.Run ? "Run" :
                        context.type === eListenerEvent.Suite ? "Suite" :
                            context.type === eListenerEvent.Test ? "Test" :
                                context.type === eListenerEvent.Hook ? "Hook" : "Unknown";
                    eventLog.push(`${type}.onStart`);
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    const type = context.type === eListenerEvent.Run ? "Run" :
                        context.type === eListenerEvent.Suite ? "Suite" :
                            context.type === eListenerEvent.Test ? "Test" :
                                context.type === eListenerEvent.Hook ? "Hook" : "Unknown";
                    eventLog.push(`${type}.onDone`);
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.equal(eventLog[0], "Run.onStart", "First event should be Run.onStart");
                assert.equal(eventLog[1], "Suite.onStart", "Second event should be Suite.onStart");
                assert.equal(eventLog[2], "Test.onStart", "Third event should be Test.onStart");
                assert.equal(eventLog[3], "Test.onDone", "Fourth event should be Test.onDone");
                assert.equal(eventLog[4], "Suite.onDone", "Fifth event should be Suite.onDone");
                assert.equal(eventLog[5], "Run.onDone", "Last event should be Run.onDone");
                done();
            }, done.fail);
        });

        it("should fire events in correct order with hooks", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfBefore(() => {});
                    selfBeforeEach(() => {});
                    selfIt("test", () => {});
                    selfAfterEach(() => {});
                    selfAfter(() => {});
                });
            });

            const runner = createTestRunner(testSuite);
            const eventLog: string[] = [];

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Run) {
                        eventLog.push("Run.onStart");
                    } else if (context.type === eListenerEvent.Suite) {
                        eventLog.push("Suite.onStart");
                    } else if (context.type === eListenerEvent.Hook) {
                        eventLog.push("Hook.onStart");
                    } else if (context.type === eListenerEvent.Test) {
                        eventLog.push("Test.onStart");
                    }
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Run) {
                        eventLog.push("Run.onDone");
                    } else if (context.type === eListenerEvent.Suite) {
                        eventLog.push("Suite.onDone");
                    } else if (context.type === eListenerEvent.Hook) {
                        eventLog.push("Hook.onDone");
                    } else if (context.type === eListenerEvent.Test) {
                        eventLog.push("Test.onDone");
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                // Verify key ordering constraints
                const runStartIdx = eventLog.indexOf("Run.onStart");
                const suiteStartIdx = eventLog.indexOf("Suite.onStart");
                const testStartIdx = eventLog.indexOf("Test.onStart");
                const testDoneIdx = eventLog.indexOf("Test.onDone");
                const suiteDoneIdx = eventLog.indexOf("Suite.onDone");
                const runDoneIdx = eventLog.indexOf("Run.onDone");

                assert.isTrue(runStartIdx < suiteStartIdx, "Run starts before Suite");
                assert.isTrue(suiteStartIdx < testStartIdx, "Suite starts before Test");
                assert.isTrue(testStartIdx < testDoneIdx, "Test starts before it completes");
                assert.isTrue(testDoneIdx < suiteDoneIdx, "Test completes before Suite");
                assert.isTrue(suiteDoneIdx < runDoneIdx, "Suite completes before Run");

                // Check hook ordering
                const hookStarts = eventLog.filter(e => e === "Hook.onStart");
                const hookDones = eventLog.filter(e => e === "Hook.onDone");
                assert.equal(hookStarts.length, 4, "Should have 4 hook starts (before, beforeEach, afterEach, after)");
                assert.equal(hookDones.length, 4, "Should have 4 hook dones (before, beforeEach, afterEach, after)");

                done();
            }, done.fail);
        });

        it("should fire events in correct order for nested suites", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Outer", () => {
                    selfIt("outer test", () => {});
                    selfDescribe("Inner", () => {
                        selfIt("inner test", () => {});
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            const eventLog: Array<{ type: string; suite?: string; test?: string }> = [];

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Suite && context.suite) {
                        eventLog.push({ type: "Suite.onStart", suite: context.suite.description });
                    } else if (context.type === eListenerEvent.Test && context.test) {
                        eventLog.push({ type: "Test.onStart", test: context.test.description });
                    }
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Suite && context.suite) {
                        eventLog.push({ type: "Suite.onDone", suite: context.suite.description });
                    } else if (context.type === eListenerEvent.Test && context.test) {
                        eventLog.push({ type: "Test.onDone", test: context.test.description });
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                // Find indices
                const outerStart = eventLog.findIndex(e => e.type === "Suite.onStart" && e.suite === "Outer");
                const outerTestStart = eventLog.findIndex(e => e.type === "Test.onStart" && e.test === "outer test");
                const outerTestDone = eventLog.findIndex(e => e.type === "Test.onDone" && e.test === "outer test");
                const innerStart = eventLog.findIndex(e => e.type === "Suite.onStart" && e.suite === "Inner");
                const innerTestStart = eventLog.findIndex(e => e.type === "Test.onStart" && e.test === "inner test");
                const innerTestDone = eventLog.findIndex(e => e.type === "Test.onDone" && e.test === "inner test");
                const innerDone = eventLog.findIndex(e => e.type === "Suite.onDone" && e.suite === "Inner");
                const outerDone = eventLog.findIndex(e => e.type === "Suite.onDone" && e.suite === "Outer");

                // Verify ordering
                assert.isTrue(outerStart < outerTestStart, "Outer suite starts before outer test");
                assert.isTrue(outerTestStart < outerTestDone, "Outer test completes");
                assert.isTrue(outerTestDone < innerStart, "Inner suite starts after outer test");
                assert.isTrue(innerStart < innerTestStart, "Inner test starts after inner suite");
                assert.isTrue(innerTestStart < innerTestDone, "Inner test completes");
                assert.isTrue(innerTestDone < innerDone, "Inner suite completes after inner test");
                assert.isTrue(innerDone < outerDone, "Outer suite completes after inner suite");

                done();
            }, done.fail);
        });

        it("should fire events in correct order for multiple tests", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test 1", () => {});
                    selfIt("test 2", () => {});
                    selfIt("test 3", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            const testEvents: Array<{ type: string; test: string }> = [];

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        testEvents.push({ type: "onStart", test: context.test.description });
                    }
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        testEvents.push({ type: "onDone", test: context.test.description });
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.equal(testEvents.length, 6, "Should have 6 test events (3 starts, 3 dones)");

                // Each test should complete before the next starts
                assert.equal(testEvents[0].type, "onStart");
                assert.equal(testEvents[0].test, "test 1");
                assert.equal(testEvents[1].type, "onDone");
                assert.equal(testEvents[1].test, "test 1");
                assert.equal(testEvents[2].type, "onStart");
                assert.equal(testEvents[2].test, "test 2");
                assert.equal(testEvents[3].type, "onDone");
                assert.equal(testEvents[3].test, "test 2");
                assert.equal(testEvents[4].type, "onStart");
                assert.equal(testEvents[4].test, "test 3");
                assert.equal(testEvents[5].type, "onDone");
                assert.equal(testEvents[5].test, "test 3");

                done();
            }, done.fail);
        });
    });

    describe("Context data validation", () => {
        it("should provide correct context data for each event type", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfBefore(() => {});
                    selfIt("test", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            const validations = {
                runStart: false,
                runDone: false,
                suiteStart: false,
                suiteDone: false,
                testStart: false,
                testDone: false,
                hookStart: false,
                hookDone: false
            };

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Run) {
                        assert.isObject(context.suite, "Run should have suite");
                        assert.isObject(context.start, "Run.onStart should have start context");
                        if (context.start) {
                            assert.isNumber(context.start.totalTests);
                        }
                        validations.runStart = true;
                    } else if (context.type === eListenerEvent.Suite) {
                        assert.isObject(context.suite, "Suite should have suite");
                        validations.suiteStart = true;
                    } else if (context.type === eListenerEvent.Test) {
                        assert.isObject(context.test, "Test should have test");
                        assert.isObject(context.suite, "Test should have suite");
                        validations.testStart = true;
                    } else if (context.type === eListenerEvent.Hook) {
                        assert.isObject(context.hook, "Hook should have hook");
                        assert.isObject(context.suite, "Hook should have suite");
                        validations.hookStart = true;
                    }
                },
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Run) {
                        assert.isObject(context.suite, "Run should have suite");
                        assert.isObject(context.end, "Run.onDone should have end context");
                        if (context.end) {
                            assert.isNumber(context.end.total);
                            assert.isNumber(context.end.passed);
                            assert.isNumber(context.end.failed);
                            assert.isNumber(context.end.duration);
                            assert.isNumber(context.end.start);
                            assert.isNumber(context.end.end);
                        }
                        validations.runDone = true;
                    } else if (context.type === eListenerEvent.Suite) {
                        assert.isObject(context.suite, "Suite should have suite");
                        assert.isObject(context.end, "Suite.onDone should have end context");
                        if (context.end) {
                            assert.isNumber(context.end.duration);
                        }
                        validations.suiteDone = true;
                    } else if (context.type === eListenerEvent.Test) {
                        assert.isObject(context.test, "Test should have test");
                        assert.isObject(context.end, "Test.onDone should have end context");
                        if (context.end) {
                            assert.isString(context.end.status);
                            assert.isNumber(context.end.duration);
                        }
                        validations.testDone = true;
                    } else if (context.type === eListenerEvent.Hook) {
                        assert.isObject(context.hook, "Hook should have hook");
                        assert.isObject(context.end, "Hook.onDone should have end context");
                        if (context.end) {
                            assert.isNumber(context.end.duration);
                        }
                        validations.hookDone = true;
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isTrue(validations.runStart, "Run.onStart validation should pass");
                assert.isTrue(validations.runDone, "Run.onDone validation should pass");
                assert.isTrue(validations.suiteStart, "Suite.onStart validation should pass");
                assert.isTrue(validations.suiteDone, "Suite.onDone validation should pass");
                assert.isTrue(validations.testStart, "Test.onStart validation should pass");
                assert.isTrue(validations.testDone, "Test.onDone validation should pass");
                assert.isTrue(validations.hookStart, "Hook.onStart validation should pass");
                assert.isTrue(validations.hookDone, "Hook.onDone validation should pass");
                done();
            }, done.fail);
        });
    });

    describe("Listener action return values", () => {
        it("should skip test when listener returns Skip action", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test 1", () => {
                        assert.fail("Test 1 should not execute");
                    });
                    selfIt("test 2", () => {
                        // This should execute
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            let test1Started = false;
            let test2Started = false;

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        if (context.test.description === "test 1") {
                            test1Started = true;
                            return { action: eListenerAction.Skip };
                        } else if (context.test.description === "test 2") {
                            test2Started = true;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.isTrue(test1Started, "test 1 onStart should be called");
                assert.isTrue(test2Started, "test 2 onStart should be called");
                assert.equal(results.skipped, 1, "Should have 1 skipped test");
                assert.equal(results.passed, 1, "Should have 1 passed test");
                assert.equal(results.failed, 0, "Should have 0 failed tests");
                done();
            }, done.fail);
        });

        it("should skip suite when listener returns Skip action", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite 1", () => {
                    selfIt("test in suite 1", () => {
                        assert.fail("Test in suite 1 should not execute");
                    });
                });
                selfDescribe("Suite 2", () => {
                    selfIt("test in suite 2", () => {
                        // This should execute
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            let suite1Started = false;
            let suite2Started = false;

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Suite && context.suite) {
                        if (context.suite.description === "Suite 1") {
                            suite1Started = true;
                            return { action: eListenerAction.Skip };
                        } else if (context.suite.description === "Suite 2") {
                            suite2Started = true;
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.isTrue(suite1Started, "Suite 1 onStart should be called");
                assert.isTrue(suite2Started, "Suite 2 onStart should be called");
                assert.equal(results.skipped, 1, "Should have 1 skipped test (from Suite 1)");
                assert.equal(results.passed, 1, "Should have 1 passed test (from Suite 2)");
                done();
            }, done.fail);
        });

        it("should abort run when listener returns Abort action", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test 1", () => {
                        // This should execute
                    });
                    selfIt("test 2", () => {
                        assert.fail("Test 2 should not execute due to abort");
                    });
                    selfIt("test 3", () => {
                        assert.fail("Test 3 should not execute due to abort");
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            const testsDone: string[] = [];
            const statuses: Record<string, string> = {};

            const listener: IListener = {
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        testsDone.push(context.test.description);
                        statuses[context.test.description] = context.end ? String(context.end.status) : "";
                        if (context.test.description === "test 1") {
                            return { action: eListenerAction.Abort };
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                // Every test the summary counts is reported, including the ones the abort never
                // left room to run -- otherwise a reporter's totals promise results it is never
                // handed (an unsatisfiable TAP plan line, a progress bar stuck short of 100%).
                assert.equal(testsDone.length, 3, "All 3 tests should be reported");
                assert.equal(testsDone[0], "test 1", "test 1 should run and complete first");
                assert.equal(statuses["test 1"], "passed", "test 1 ran to completion before the abort");
                assert.equal(statuses["test 2"], "skipped", "test 2 never ran, so it is reported as skipped");
                assert.equal(statuses["test 3"], "skipped", "test 3 never ran, so it is reported as skipped");
                assert.equal(results.total, 3, "Summary should include all tests in the suite");
                assert.equal(results.passed, 0, "Aborted test should not be counted as passed");
                assert.equal(results.skipped, 2, "The two tests that never ran are skipped, not failed");
                done();
            }, done.fail);
        });

        it("should abort on suite start", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite 1", () => {
                    selfIt("test 1", () => {
                        assert.fail("Test 1 should not execute");
                    });
                });
                selfDescribe("Suite 2", () => {
                    selfIt("test 2", () => {
                        assert.fail("Test 2 should not execute");
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            const suitesStarted: string[] = [];

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Suite && context.suite) {
                        suitesStarted.push(context.suite.description);
                        if (context.suite.description === "Suite 1") {
                            return { action: eListenerAction.Abort };
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                // Suite 2 never runs, but its test is still counted in the summary, so the suite
                // is still reported -- as an un-run one, whose tests all come back skipped.
                assert.equal(suitesStarted.length, 2, "Both suites should be reported");
                assert.equal(suitesStarted[0], "Suite 1", "Suite 1 aborts the run");
                assert.equal(suitesStarted[1], "Suite 2", "Suite 2 is reported as un-run");
                assert.equal(results.total, 2, "Summary should include all tests across suites");
                assert.equal(results.passed, 0, "No test should have run");
                assert.equal(results.skipped, 2, "Neither test ran, so both are skipped");
                done();
            }, done.fail);
        });

        it("should continue normally when listener returns void", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test 1", () => {});
                    selfIt("test 2", () => {});
                    selfIt("test 3", () => {});
                });
            });

            const runner = createTestRunner(testSuite);
            const testsExecuted: string[] = [];

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        testsExecuted.push(context.test.description);
                        // Returns void - should continue normally
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.equal(testsExecuted.length, 3, "All 3 tests should execute");
                assert.equal(results.total, 3, "Should have executed 3 tests");
                assert.equal(results.passed, 3, "All tests should pass");
                done();
            }, done.fail);
        });

        it("should skip hook when listener returns Skip action", (done: IDoneFn) => {
            const testSuite = createSuite();
            let hookExecuted = false;

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfBefore("setup hook", () => {
                        hookExecuted = true;
                    });
                    selfIt("test", () => {
                        // Test should still execute even if hook is skipped
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            let hookStarted = false;

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Hook && context.hook) {
                        hookStarted = true;
                        return { action: eListenerAction.Skip };
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.isTrue(hookStarted, "Hook onStart should be called");
                assert.isFalse(hookExecuted, "Hook should not execute when skipped");
                assert.equal(results.passed, 1, "Test should still pass");
                done();
            }, done.fail);
        });

        it("should aggregate Skip from multiple listeners", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test 1", () => {
                        assert.fail("Should not execute");
                    });
                    selfIt("test 2", () => {});
                });
            });

            const runner = createTestRunner(testSuite);

            const listener1: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        if (context.test.description === "test 1") {
                            return { action: eListenerAction.Skip };
                        }
                    }
                }
            };

            const listener2: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        if (context.test.description === "test 1") {
                            return { action: eListenerAction.Skip };
                        }
                    }
                }
            };

            runner.addListener(listener1);
            runner.addListener(listener2);

            runner.run().then(() => {
                const results = runner.getResults();
                assert.equal(results.skipped, 1, "test 1 should be skipped");
                assert.equal(results.passed, 1, "test 2 should pass");
                done();
            }, done.fail);
        });

        it("should prioritize Abort over Skip when multiple listeners return different actions", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test 1", () => {});
                    selfIt("test 2", () => {
                        assert.fail("Should not execute due to abort");
                    });
                });
            });

            const runner = createTestRunner(testSuite);

            const listener1: IListener = {
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        if (context.test.description === "test 1") {
                            return { action: eListenerAction.Skip };
                        }
                    }
                }
            };

            const listener2: IListener = {
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        if (context.test.description === "test 1") {
                            return { action: eListenerAction.Abort };
                        }
                    }
                }
            };

            runner.addListener(listener1);
            runner.addListener(listener2);

            runner.run().then(() => {
                const results = runner.getResults();
                assert.equal(results.total, 2, "Summary should include all tests in the suite");
                done();
            }, done.fail);
        });

        it("should handle Skip action with reason", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {
                        assert.fail("Should not execute");
                    });
                });
            });

            const runner = createTestRunner(testSuite);

            const listener: IListener = {
                onStart(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test) {
                        return {
                            action: eListenerAction.Skip,
                            reason: "Skipped by listener for test purposes"
                        };
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.equal(results.skipped, 1, "Test should be skipped");
                done();
            }, done.fail);
        });

        it("should handle Abort action with reason", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test 1", () => {});
                    selfIt("test 2", () => {
                        assert.fail("Should not execute");
                    });
                });
            });

            const runner = createTestRunner(testSuite);

            const listener: IListener = {
                onDone(event: ListenerEvent, lazyContext: ICachedValue<IListenerContext>) {
                    const context = lazyContext.v;
                    if (context.type === eListenerEvent.Test && context.test) {
                        if (context.test.description === "test 1") {
                            return {
                                action: eListenerAction.Abort,
                                reason: "Aborting run for critical failure"
                            };
                        }
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.equal(results.total, 2, "Summary should include all tests in the suite");
                done();
            }, done.fail);
        });
    });

    describe("Assertion listener - deferred errors", () => {
        it("should continue test when onAssert returns Continue for failed assertion", (done: IDoneFn) => {
            const testSuite = createSuite();
            let assertionsEvaluated = 0;

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test with multiple assertions", () => {
                        assert.equal(1, 2, "First assertion should fail");
                        assertionsEvaluated++;
                        assert.equal(3, 4, "Second assertion should fail");
                        assertionsEvaluated++;
                        assert.equal(5, 5, "Third assertion should pass");
                        assertionsEvaluated++;
                    });
                });
            });

            const runner = createTestRunner(testSuite);

            const listener: IListener = {
                onAssert(lazyContext) {
                    const context = lazyContext.v;
                    // Continue running test - defer failed assertions
                    if (!context.passed) {
                        return { action: eListenerAction.Continue };
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.equal(assertionsEvaluated, 3, "All 3 assertions should be evaluated");
                assert.equal(results.failed, 1, "Test should fail");
                assert.equal(results.passed, 0, "Test should not pass");
                done();
            }, done.fail);
        });

        it("should collect all deferred assertion errors", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test with multiple failures", () => {
                        assert.equal(1, 2, "Error 1");
                        assert.equal(3, 4, "Error 2");
                        assert.equal(5, 6, "Error 3");
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            let deferredCount = 0;

            const listener: IListener = {
                onAssert(lazyContext) {
                    const context = lazyContext.v;
                    if (!context.passed) {
                        deferredCount++;
                        return { action: eListenerAction.Continue };
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.equal(deferredCount, 3, "Should have deferred 3 errors");

                // Check the test has deferred errors
                const test = testSuite.suites[0].tests[0];
                const testResult = runner.getTestResult(test);
                assert.isObject(testResult.deferredErrors, "Should have deferredErrors array");
                if (testResult.deferredErrors) {
                    assert.equal(testResult.deferredErrors.length, 3, "Should have 3 deferred errors");
                }

                done();
            }, done.fail);
        });

        it("should fail test even when all assertions are deferred", (done: IDoneFn) => {
            const testSuite = createSuite();
            let testExecutionCompleted = false;

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {
                        assert.equal(1, 2);
                        assert.equal(3, 4);
                        testExecutionCompleted = true;
                    });
                });
            });

            const runner = createTestRunner(testSuite);

            const listener: IListener = {
                onAssert(lazyContext) {
                    const context = lazyContext.v;
                    if (!context.passed) {
                        return { action: eListenerAction.Continue };
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.isTrue(testExecutionCompleted, "Test should complete execution");
                assert.equal(results.failed, 1, "Test should be marked as failed");
                assert.equal(results.passed, 0, "No tests should pass");
                done();
            }, done.fail);
        });

        it("should throw immediately when onAssert returns void", (done: IDoneFn) => {
            const testSuite = createSuite();
            let secondAssertionReached = false;

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {
                        assert.equal(1, 2, "Should throw immediately");
                        secondAssertionReached = true;
                    });
                });
            });

            const runner = createTestRunner(testSuite);

            const listener: IListener = {
                onAssert() {
                    // Returns void - default behavior
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.isFalse(secondAssertionReached, "Should not reach second assertion");
                assert.equal(results.failed, 1, "Test should fail");
                done();
            }, done.fail);
        });

        it("should use first deferred error as test error when no immediate error", (done: IDoneFn) => {
            const testSuite = createSuite();

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {
                        assert.equal(1, 2, "First error");
                        assert.equal(3, 4, "Second error");
                    });
                });
            });

            const runner = createTestRunner(testSuite);

            const listener: IListener = {
                onAssert(lazyContext) {
                    const context = lazyContext.v;
                    if (!context.passed) {
                        return { action: eListenerAction.Continue };
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const test = testSuite.suites[0].tests[0];
                const testResult = runner.getTestResult(test);
                assert.isObject(testResult.error, "Test should have an error");
                if (testResult.error) {
                    assert.includes(testResult.error.message, "First error", "Should use first deferred error");
                }
                done();
            }, done.fail);
        });

        it("should allow mix of deferred and passing assertions", (done: IDoneFn) => {
            const testSuite = createSuite();
            let allAssertionsRan = false;

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {
                        assert.equal(1, 1, "Pass 1");
                        assert.equal(2, 3, "Fail 1");
                        assert.equal(4, 4, "Pass 2");
                        assert.equal(5, 6, "Fail 2");
                        assert.equal(7, 7, "Pass 3");
                        allAssertionsRan = true;
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            let passedCount = 0;
            let failedCount = 0;

            const listener: IListener = {
                onAssert(lazyContext) {
                    const context = lazyContext.v;
                    if (context.passed) {
                        passedCount++;
                    } else {
                        failedCount++;
                        return { action: eListenerAction.Continue };
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                const results = runner.getResults();
                assert.isTrue(allAssertionsRan, "All assertions should run");
                assert.equal(passedCount, 3, "Should have 3 passing assertions");
                assert.equal(failedCount, 2, "Should have 2 failing assertions");
                assert.equal(results.failed, 1, "Test should fail overall");

                const test = testSuite.suites[0].tests[0];
                const testResult = runner.getTestResult(test);
                if (testResult.deferredErrors) {
                    assert.equal(testResult.deferredErrors.length, 2, "Should have 2 deferred errors");
                }

                done();
            }, done.fail);
        });

        it("should handle Abort action in onAssert by throwing immediately", (done: IDoneFn) => {
            const testSuite = createSuite();
            let secondAssertionReached = false;

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {
                        assert.equal(1, 1);
                        assert.equal(2, 3, "This will cause abort");
                        secondAssertionReached = true;
                    });
                });
            });

            const runner = createTestRunner(testSuite);

            const listener: IListener = {
                onAssert(lazyContext) {
                    const context = lazyContext.v;
                    if (!context.passed) {
                        return { action: eListenerAction.Abort, reason: "Aborting on assertion failure" };
                    }
                }
            };

            runner.addListener(listener);
            runner.run().then(() => {
                assert.isFalse(secondAssertionReached, "Should abort before second assertion");
                const results = runner.getResults();
                assert.equal(results.failed, 1, "Test should fail");
                done();
            }, done.fail);
        });

        it("should not defer errors when listener not present", (done: IDoneFn) => {
            const testSuite = createSuite();
            let secondLineReached = false;

            useSuite(testSuite, () => {
                selfDescribe("Suite", () => {
                    selfIt("test", () => {
                        assert.equal(1, 2);
                        secondLineReached = true;
                    });
                });
            });

            const runner = createTestRunner(testSuite);
            // No listener added

            runner.run().then(() => {
                assert.isFalse(secondLineReached, "Should throw immediately without listener");
                const results = runner.getResults();
                assert.equal(results.failed, 1, "Test should fail");

                const test = testSuite.suites[0].tests[0];
                const testResult = runner.getTestResult(test);
                assert.isUndefined(testResult.deferredErrors, "Should not have deferred errors");

                done();
            }, done.fail);
        });
    });
});




