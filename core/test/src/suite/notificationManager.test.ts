/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getDeferred } from "@nevware21/ts-utils";
import { IListener } from "../../../src/interfaces/IListener";
import { IAssertionContext } from "../../../src/assert/interface/IAssertionContext";
import { createNotifyMgr } from "../../../src/notify/NotificationManager";
import { assert } from "../../../src/assert/assertClass";
import { eListenerAction } from "../../../src/types/ListenerAction";
import { eListenerEvent } from "../../../src/types/ListenerEvent";

// Helper to create a lazy context for testing
function lazyCtx<T>(ctx: T) {
    return getDeferred(() => ctx);
}

describe("NotificationManager", () => {
    describe("listener management", () => {
        it("should add and notify listeners", () => {
            const manager = createNotifyMgr();
            let callCount = 0;

            const listener: IListener = {
                onStart: () => {
                    callCount++;
                }
            };

            manager.addListener(listener);
            manager.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equal(callCount, 1, "Listener should be called once");
        });

        it("should remove listeners", () => {
            const manager = createNotifyMgr();
            let callCount = 0;

            const listener: IListener = {
                onStart: () => {
                    callCount++;
                }
            };

            const removable = manager.addListener(listener);
            manager.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));
            assert.equal(callCount, 1, "First call should succeed");

            removable.rm();
            manager.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));
            assert.equal(callCount, 1, "Listener should not be called after removal");
        });

        it("should support multiple listeners", () => {
            const manager = createNotifyMgr();
            const calls: number[] = [];

            const listener1: IListener = {
                onStart: () => {
                    calls.push(1);
                }
            };

            const listener2: IListener = {
                onStart: () => {
                    calls.push(2);
                }
            };

            manager.addListener(listener1);
            manager.addListener(listener2);
            manager.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equal(calls.length, 2, "Both listeners should be called");
            assert.equal(calls[0], 1, "First listener called first");
            assert.equal(calls[1], 2, "Second listener called second");
        });
    });

    describe("notification aggregation", () => {
        it("should aggregate skip flags from onStart", () => {
            const manager = createNotifyMgr();

            const listener1: IListener = {
                onStart: () => ({ action: eListenerAction.Skip })
            };

            const listener2: IListener = {
                onStart: () => ({ action: eListenerAction.Skip })
            };

            manager.addListener(listener1);
            manager.addListener(listener2);

            const result = manager.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equals(result.action, eListenerAction.Skip, "Should aggregate skip=true");
        });

        it("should aggregate abort flags from onStart", () => {
            const manager = createNotifyMgr();

            const listener1: IListener = {
                onStart: () => ({ action: eListenerAction.Abort })
            };

            const listener2: IListener = {
                onStart: () => ({ action: eListenerAction.Abort })
            };

            manager.addListener(listener1);
            manager.addListener(listener2);

            const result = manager.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equals(result.action, eListenerAction.Abort, "Should aggregate abort=true");
        });

        it("should aggregate skip flags from onAssert", () => {
            const manager = createNotifyMgr();

            const listener1: IListener = {
                onAssert: () => ({ action: eListenerAction.Skip })
            };

            const listener2: IListener = {
                onAssert: () => ({ action: eListenerAction.Skip })
            };

            manager.addListener(listener1);
            manager.addListener(listener2);

            const context: IAssertionContext = {
                value: true,
                passed: true };

            const result = manager.notifyAssertion(lazyCtx(context));

            assert.equals(result.action, eListenerAction.Skip, "Should aggregate skip=true");
        });

        it("should handle listeners returning void", () => {
            const manager = createNotifyMgr();

            const listener: IListener = {
                onStart: () => {
                    // Returns void
                }
            };

            manager.addListener(listener);

            const result = manager.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equals(result, null, "Result should be null when no actions returned");
        });
    });

    describe("optional methods", () => {
        it("should not call missing onStart", () => {
            const manager = createNotifyMgr();
            let called = false;

            const listener: IListener = {
                onDone: () => {
                    called = true;
                }
            };

            manager.addListener(listener);
            manager.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.isFalse(called, "onDone should not be called for notifyStart");
        });

        it("should not call missing onDone", () => {
            const manager = createNotifyMgr();
            let called = false;

            const listener: IListener = {
                onStart: () => {
                    called = true;
                }
            };

            manager.addListener(listener);
            manager.notifyDone(eListenerEvent.Run, lazyCtx({
                type: eListenerEvent.Run,
                suite: null,
                end: {
                    status: undefined,
                    error: undefined }
            }));

            assert.isFalse(called, "onStart should not be called for notifyDone");
        });

        it("should not call missing onAssert", () => {
            const manager = createNotifyMgr();
            let called = false;

            const listener: IListener = {
                onStart: () => {
                    called = true;
                }
            };

            manager.addListener(listener);
            const context: IAssertionContext = {
                value: true,
                passed: true };
            manager.notifyAssertion(lazyCtx(context));

            assert.isFalse(called, "onStart should not be called for notifyAssertion");
        });
    });

    describe("parent-child hierarchy", () => {
        it("should call parent listeners when child is notified", () => {
            const parent = createNotifyMgr();
            const child = createNotifyMgr(parent);

            let parentCalled = false;
            let childCalled = false;

            parent.addListener({
                onStart: () => {
                    parentCalled = true;
                }
            });

            child.addListener({
                onStart: () => {
                    childCalled = true;
                }
            });

            child.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.isTrue(parentCalled, "Parent listener should be called");
            assert.isTrue(childCalled, "Child listener should be called");
        });

        it("should call parent listeners before child listeners", () => {
            const parent = createNotifyMgr();
            const child = createNotifyMgr(parent);

            const callOrder: string[] = [];

            parent.addListener({
                onStart: () => {
                    callOrder.push("parent");
                }
            });

            child.addListener({
                onStart: () => {
                    callOrder.push("child");
                }
            });

            child.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equal(callOrder.length, 2, "Both listeners called");
            assert.equal(callOrder[0], "parent", "Parent called first");
            assert.equal(callOrder[1], "child", "Child called second");
        });

        it("should aggregate parent and child actions for onStart", () => {
            const parent = createNotifyMgr();
            const child = createNotifyMgr(parent);

            parent.addListener({
                onStart: () => ({ action: eListenerAction.Skip })
            });

            child.addListener({
                onStart: () => ({ action: eListenerAction.Abort })
            });

            const result = child.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equals(result.action, eListenerAction.Abort, "Abort should take precedence over skip");
        });

        it("should aggregate parent and child actions for onAssert", () => {
            const parent = createNotifyMgr();
            const child = createNotifyMgr(parent);

            let parentCalled = false;
            let childCalled = false;

            parent.addListener({
                onAssert: () => {
                    parentCalled = true;
                    return { action: eListenerAction.Skip };
                }
            });

            child.addListener({
                onAssert: () => {
                    childCalled = true;
                }
            });

            const context: IAssertionContext = {
                value: true,
                passed: true };

            const result = child.notifyAssertion(lazyCtx(context));

            assert.isTrue(parentCalled, "Parent listener called");
            assert.isTrue(childCalled, "Child listener called");
            assert.equals(result.action, eListenerAction.Skip, "Should have parent's skip flag");
        });

        it("should support multi-level hierarchy", () => {
            const grandparent = createNotifyMgr();
            const parent = createNotifyMgr(grandparent);
            const child = createNotifyMgr(parent);

            const callOrder: string[] = [];

            grandparent.addListener({
                onStart: () => {
                    callOrder.push("grandparent");
                }
            });

            parent.addListener({
                onStart: () => {
                    callOrder.push("parent");
                }
            });

            child.addListener({
                onStart: () => {
                    callOrder.push("child");
                }
            });

            child.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equal(callOrder.length, 3, "All three levels called");
            assert.equal(callOrder[0], "grandparent", "Grandparent called first");
            assert.equal(callOrder[1], "parent", "Parent called second");
            assert.equal(callOrder[2], "child", "Child called third");
        });

        it("should not call parent when notifying parent directly", () => {
            const parent = createNotifyMgr();
            const child = createNotifyMgr(parent);

            let parentCalled = 0;
            let childCalled = 0;

            parent.addListener({
                onStart: () => {
                    parentCalled++;
                }
            });

            child.addListener({
                onStart: () => {
                    childCalled++;
                }
            });

            parent.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equal(parentCalled, 1, "Parent listener called once");
            assert.equal(childCalled, 0, "Child listener not called");
        });

        it("should allow child to add listeners without affecting parent", () => {
            const parent = createNotifyMgr();
            const child = createNotifyMgr(parent);
            let childCallCount = 0;

            child.addListener({
                onStart: () => {
                    // Child-only listener
                    childCallCount++;
                }
            });

            // Parent should not have the child's listener
            const parentResult = parent.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));
            const childResult = child.notifyStart(eListenerEvent.Run, lazyCtx({ type: eListenerEvent.Run, suite: null }));

            assert.equals(parentResult, null, "Parent returns action");
            assert.equals(childResult, null, "Child returns action");
            assert.equal(childCallCount, 1, "Child listener called once");
        });
    });

    describe("hasListeners", () => {
        it("should report false when no listeners are registered", () => {
            const manager = createNotifyMgr();
            assert.isFalse(manager.hasListeners());
        });

        it("should report true once a listener is added and false after it is removed", () => {
            const manager = createNotifyMgr();
            const removable = manager.addListener({} as IListener);
            assert.isTrue(manager.hasListeners());

            removable.rm();
            assert.isFalse(manager.hasListeners());
        });

        it("should report false after reset", () => {
            const manager = createNotifyMgr();
            manager.addListener({} as IListener);
            assert.isTrue(manager.hasListeners());

            manager.reset();
            assert.isFalse(manager.hasListeners());
        });

        it("should consider listeners registered on a parent manager", () => {
            const parent = createNotifyMgr();
            const child = createNotifyMgr(parent);
            const grandChild = createNotifyMgr(child);
            assert.isFalse(grandChild.hasListeners());

            const removable = parent.addListener({} as IListener);
            assert.isTrue(child.hasListeners());
            assert.isTrue(grandChild.hasListeners());

            removable.rm();
            assert.isFalse(grandChild.hasListeners());
        });
    });

    describe("completion notifications after a parent abort", () => {
        it("should still call child onDone listeners when the parent answered Abort", () => {
            const parent = createNotifyMgr();
            const child = createNotifyMgr(parent);
            let childStarts = 0;
            let childDones = 0;

            parent.addListener({
                onStart: () => ({ action: eListenerAction.Abort, reason: "parent abort" }),
                onDone: () => ({ action: eListenerAction.Abort, reason: "parent abort" })
            });
            child.addListener({
                onStart: () => {
                    childStarts++;
                },
                onDone: () => {
                    childDones++;
                }
            });

            const ctx = lazyCtx({ type: eListenerEvent.Test, suite: null });
            const startResult = child.notifyStart(eListenerEvent.Test, ctx);
            assert.equal(startResult.action, eListenerAction.Abort);
            assert.equal(childStarts, 0, "a parent abort stops further start notifications");

            const doneResult = child.notifyDone(eListenerEvent.Test, ctx);
            assert.equal(childDones, 1, "completion callbacks always run so listeners can clean up");
            assert.equal(doneResult.action, eListenerAction.Abort, "the aggregated result keeps the abort");
            assert.equal(doneResult.reason, "parent abort");
        });

        it("should let a child Skip replace a parent Continue but never a parent Abort", () => {
            const parent = createNotifyMgr();
            const child = createNotifyMgr(parent);
            let parentAction = eListenerAction.Continue;

            parent.addListener({
                onStart: () => ({ action: parentAction, reason: "parent" })
            });
            child.addListener({
                onStart: () => ({ action: eListenerAction.Skip, reason: "child skips" })
            });

            const ctx = lazyCtx({ type: eListenerEvent.Test, suite: null });
            let result = child.notifyStart(eListenerEvent.Test, ctx);
            assert.equal(result.action, eListenerAction.Skip, "Skip is stronger than Continue");
            assert.equal(result.reason, "child skips");

            parentAction = eListenerAction.Abort;
            result = child.notifyStart(eListenerEvent.Test, ctx);
            assert.equal(result.action, eListenerAction.Abort, "Abort is never downgraded");
            assert.equal(result.reason, "parent");
        });

        it("should return null from every notification when no listener answers", () => {
            const manager = createNotifyMgr();
            manager.addListener({
                onStart: () => {},
                onDone: () => {},
                onAssert: () => {}
            });

            const ctx = lazyCtx({ type: eListenerEvent.Test, suite: null });
            assert.isNull(manager.notifyStart(eListenerEvent.Test, ctx));
            assert.isNull(manager.notifyDone(eListenerEvent.Test, ctx));
            assert.isNull(manager.notifyAssertion(lazyCtx<IAssertionContext>({ value: 1, passed: true })));
        });
    });

    describe("registration changes during a notification", () => {
        it("should not skip the next listener when a listener removes itself", () => {
            const manager = createNotifyMgr();
            const calls: string[] = [];

            const first: IListener = {
                onStart: () => {
                    calls.push("first");
                    manager.removeListener(first);
                }
            };
            manager.addListener(first);
            manager.addListener({
                onStart: () => {
                    calls.push("second");
                    return { action: eListenerAction.Skip, reason: "second skips" };
                }
            });

            const result = manager.notifyStart(eListenerEvent.Test, lazyCtx({ type: eListenerEvent.Test, suite: null }));
            assert.deepEqual(calls, ["first", "second"]);
            assert.equal(result.action, eListenerAction.Skip, "the second listener's answer is not lost");

            calls.length = 0;
            manager.notifyStart(eListenerEvent.Test, lazyCtx({ type: eListenerEvent.Test, suite: null }));
            assert.deepEqual(calls, ["second"], "the removed listener stays removed");
        });

        it("should not skip the next listener when a removable handle is used mid-notification", () => {
            const manager = createNotifyMgr();
            const calls: string[] = [];

            const removable = manager.addListener({
                onAssert: () => {
                    calls.push("first");
                    removable.rm();
                }
            });
            manager.addListener({
                onAssert: () => {
                    calls.push("second");
                }
            });

            manager.notifyAssertion(lazyCtx<IAssertionContext>({ value: 1, passed: true }));
            assert.deepEqual(calls, ["first", "second"]);
        });

        it("should not notify a listener added during the notification that added it", () => {
            const manager = createNotifyMgr();
            const calls: string[] = [];

            manager.addListener({
                onDone: () => {
                    calls.push("first");
                    manager.addListener({
                        onDone: () => {
                            calls.push("added");
                        }
                    });
                }
            });

            manager.notifyDone(eListenerEvent.Test, lazyCtx({ type: eListenerEvent.Test, suite: null }));
            assert.deepEqual(calls, ["first"], "the new listener only sees later notifications");

            manager.notifyDone(eListenerEvent.Test, lazyCtx({ type: eListenerEvent.Test, suite: null }));
            assert.deepEqual(calls, ["first", "first", "added"]);
        });

        it("should finish the current walk when reset is called from a listener", () => {
            const manager = createNotifyMgr();
            const calls: string[] = [];

            manager.addListener({
                onStart: () => {
                    calls.push("first");
                    manager.reset();
                }
            });
            manager.addListener({
                onStart: () => {
                    calls.push("second");
                }
            });

            manager.notifyStart(eListenerEvent.Test, lazyCtx({ type: eListenerEvent.Test, suite: null }));
            assert.deepEqual(calls, ["first", "second"], "listeners already in the walk still run");
            assert.isFalse(manager.hasListeners(), "but the manager is empty afterwards");
        });

        it("should cope with a listener that triggers a nested notification before removing itself", () => {
            const manager = createNotifyMgr();
            const calls: string[] = [];
            let nested = false;

            const first: IListener = {
                onAssert: () => {
                    calls.push("first");
                    if (!nested) {
                        nested = true;
                        // Re-enter the manager from inside a callback, as a listener that asserts would
                        manager.notifyAssertion(lazyCtx<IAssertionContext>({ value: 2, passed: true }));
                        manager.removeListener(first);
                    }
                }
            };
            manager.addListener(first);
            manager.addListener({
                onAssert: () => {
                    calls.push("second");
                }
            });

            manager.notifyAssertion(lazyCtx<IAssertionContext>({ value: 1, passed: true }));
            assert.deepEqual(calls, ["first", "first", "second", "second"]);
            assert.isTrue(manager.hasListeners(), "the second listener remains registered");
        });
    });
});
