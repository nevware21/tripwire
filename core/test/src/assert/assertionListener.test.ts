/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue, isArray } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { AssertionError } from "../../../src/assert/assertionError";
import { AssertionFailure } from "../../../src/assert/assertionFailure";
import { expect } from "../../../src/assert/expect";
import { IAssertionContext } from "../../../src/assert/interface/IAssertionContext";
import { createContext } from "../../../src/assert/scopeContext";
import { useScope } from "../../../src/assert/useScope";
import { addAssertionListener } from "../../../src/config/assertConfig";
import { getCurrentHost, useHost, withHost } from "../../../src/config/configHost";
import { IRemovable } from "../../../src/interfaces/IRemovable";
import { eListenerAction } from "../../../src/types/ListenerAction";

/**
 * Every `context.eval` reports to the notification manager of the host that is active at that moment, so a
 * listener registered inside a host scope observes exactly the assertions evaluated inside that scope.
 * The listener's answer steers the outcome: Continue records a failure instead of throwing it, Abort forces
 * a failure even when the assertion itself passed.
 */
describe("assertion listeners", () => {
    function collect(seen: IAssertionContext[]): IRemovable {
        return addAssertionListener({
            onAssert: (ctx: ICachedValue<IAssertionContext>) => {
                seen.push(ctx.v);
            }
        });
    }

    it("should report passing and failing assertions to a listener on the active host", () => {
        withHost(() => {
            const seen: IAssertionContext[] = [];
            const removable = collect(seen);

            try {
                assert.equal(1, 1);
                try {
                    assert.equal(1, 2, "one is not two");
                } catch (e) {
                    // expected: the listener did not ask to continue
                }
            } finally {
                removable.rm();
            }

            assert.equal(seen.length, 2);
            assert.isTrue(seen[0].passed);
            assert.equal(seen[0].value, 1);
            assert.isFalse(seen[1].passed);
            assert.ok(seen[1].error instanceof AssertionFailure, "the failure is handed to the listener");
            assert.includes(seen[1].message, "expected 1 to equal 2", "the evaluation message describes the check");
            assert.includes(seen[1].error.message, "one is not two", "the caller's message is on the failure");
        });
    });

    it("should describe the operation path and the evaluation message in the context", () => {
        withHost(() => {
            const seen: IAssertionContext[] = [];
            const removable = collect(seen);

            try {
                expect(1).not.equal(2);
                expect(3).to.equal(3);
            } finally {
                removable.rm();
            }

            assert.equal(seen.length, 2);
            assert.isTrue(isArray(seen[0].opPath), "the operation path is reported");
            assert.equal(seen[0].message, "expected 1 to equal 2", "the message tokens are resolved against the evaluated scope");
            assert.equal(seen[0].value, 1);
            assert.isTrue(seen[0].passed);
            assert.equal(seen[1].message, "expected 3 to equal 3");
            assert.isTrue(seen[1].passed);
        });
    });

    it("should not be notified once removed or outside its host scope", () => {
        const seen: IAssertionContext[] = [];

        withHost(() => {
            const removable = collect(seen);
            removable.rm();
            assert.equal(1, 1);
        });

        assert.equal(seen.length, 0);
    });

    it("should swallow a failure and record it on the active test result when a listener answers Continue", () => {
        const host = getCurrentHost().clone();
        const testResult: any = {};
        (host as any)._activeTestResult = testResult;

        useHost(host, () => {
            const removable = addAssertionListener({
                onAssert: (ctx: ICachedValue<IAssertionContext>) => {
                    return ctx.v.passed ? undefined : { action: eListenerAction.Continue };
                }
            });

            try {
                assert.equal(1, 2, "deferred failure");
                assert.equal(1, 1);
                assert.equal(2, 3, "another deferred failure");
            } finally {
                removable.rm();
            }
        });

        assert.equal(testResult.deferredErrors.length, 2, "both failures were recorded instead of thrown");
        assert.ok(testResult.deferredErrors[0] instanceof AssertionFailure);
        assert.includes(testResult.deferredErrors[0].message, "deferred failure");
        assert.includes(testResult.deferredErrors[1].message, "another deferred failure");
    });

    it("should swallow a failure quietly when a listener answers Continue and no test result is active", () => {
        withHost(() => {
            const removable = addAssertionListener({
                onAssert: () => ({ action: eListenerAction.Continue })
            });

            try {
                assert.equal(1, 2, "nobody records this");
            } finally {
                removable.rm();
            }
        });
    });

    it("should fail a passing assertion when a listener answers Abort", () => {
        withHost(() => {
            const removable = addAssertionListener({
                onAssert: () => ({ action: eListenerAction.Abort, reason: "listener aborted the run" })
            });

            let thrown: any = null;
            try {
                assert.equal(1, 1);
            } catch (e) {
                thrown = e;
            } finally {
                removable.rm();
            }

            assert.ok(thrown instanceof AssertionFailure, "the abort is raised as an assertion failure");
            assert.includes(thrown.message, "listener aborted the run");
            assert.isTrue(thrown.props.aborted);
            assert.equal(thrown.props.abortReason, "listener aborted the run");
        });
    });

    it("should still throw the original failure when a listener answers Abort", () => {
        withHost(() => {
            const removable = addAssertionListener({
                onAssert: () => ({ action: eListenerAction.Abort, reason: "abort" })
            });

            let thrown: any = null;
            try {
                assert.equal(1, 2, "original failure");
            } catch (e) {
                thrown = e;
            } finally {
                removable.rm();
            }

            assert.ok(thrown instanceof AssertionFailure);
            assert.includes(thrown.message, "original failure");
        });
    });

    it("should let an assertion error be created while a scope context is active", () => {
        const message = useScope(createContext(5), () => {
            const error = new AssertionError("inside a scope", { actual: 5, expected: 6 });
            assert.equal(error.actual, 5);
            assert.equal(error.expected, 6);

            // The message is built lazily, so read it while the scope is still active
            return error.message;
        });

        assert.isTrue(message.indexOf("inside a scope") === 0, "the own message comes first");
        assert.includes(message, "\"actual\":5", "the props are described while a scope is active");
    });
});
