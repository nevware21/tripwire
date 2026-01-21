/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../../src/assert/assertClass";
import { createExprAdapter } from "../../../../src/assert/adapters/exprAdapter";
import { createContext } from "../../../../src/assert/scopeContext";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { checkError } from "../../support/checkError";
import { IAssertScope } from "../../../../src/assert/interface/IAssertScope";
import { assertConfig } from "../../../../src/assert/config";

describe("createExprAdapter", () => {
    let originalIsVerbose: boolean | undefined;

    before(() => {
        // Save original isVerbose setting
        originalIsVerbose = assertConfig.isVerbose;
    });

    after(() => {
        // Restore original isVerbose setting
        assertConfig.isVerbose = originalIsVerbose;
    });
    describe("scope function call count", () => {
        beforeEach(() => {
            // Enable verbose mode for opPath tracking
            assertConfig.isVerbose = true;
        });

        it("should call scope function exactly once with simple expression", () => {
            let callCount = 0;
            
            let scopeFn = function<R>(this: IAssertScope): R {
                callCount++;
                this.context.setOp("scopeFn");
                return this.that;
            };
            
            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("not", scopeFn);
            
            adapter.call(scope);
            
            assert.equal(callCount, 1, "Scope function should be called exactly once");
            
            // Verify via opPath that scopeFn was called once
            let opPath = scope.context.get("opPath");
            let scopeFnCount = opPath.filter((op: string) => op === "scopeFn").length;
            assert.equal(scopeFnCount, 1, "opPath should show scopeFn called exactly once");
        });

        it("should call scope function exactly once with multi-step expression", () => {
            let callCount = 0;
            
            let scopeFn = function<R>(this: IAssertScope): R {
                callCount++;
                this.context.setOp("scopeFn");
                return this.that;
            };
            
            let context = createContext(true);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("to.be", scopeFn);
            
            adapter.call(scope);
            
            assert.equal(callCount, 1, "Scope function should be called exactly once with multi-step expression");
            
            // Verify via opPath
            let opPath = scope.context.get("opPath");
            let scopeFnCount = opPath.filter((op: string) => op === "scopeFn").length;
            assert.equal(scopeFnCount, 1, "opPath should show scopeFn called exactly once even with multi-step expression");
        });

        it("should call scope function exactly once with arguments", () => {
            let callCount = 0;
            let receivedArgs: any[] = [];
            
            let scopeFn = function<R>(this: IAssertScope, ...args: any[]): R {
                callCount++;
                receivedArgs = args;
                this.context.setOp("scopeFn");
                return this.that;
            };
            
            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("not", scopeFn);
            
            adapter.call(scope, 1, 2, 3);
            
            assert.equal(callCount, 1, "Scope function should be called exactly once");
            assert.deepEqual(receivedArgs, [1, 2, 3], "Scope function should receive all arguments");
            
            // Verify via opPath
            let opPath = scope.context.get("opPath");
            let scopeFnCount = opPath.filter((op: string) => op === "scopeFn").length;
            assert.equal(scopeFnCount, 1, "opPath should show scopeFn called exactly once");
        });

        it("should not call scope function multiple times during expression evaluation", () => {
            let callCount = 0;
            
            let scopeFn = function<R>(this: IAssertScope): R {
                callCount++;
                this.context.setOp("scopeFn");
                return this.that;
            };
            
            let context = createContext(10);
            let scope = createAssertScope(context);
            
            // Create adapter with longer expression chain
            let adapter = createExprAdapter("to.be.not", scopeFn);
            
            adapter.call(scope);
            
            assert.equal(callCount, 1, "Scope function should not be called during step execution");
            
            // Verify via opPath
            let opPath = scope.context.get("opPath");
            let scopeFnCount = opPath.filter((op: string) => op === "scopeFn").length;
            assert.equal(scopeFnCount, 1, "opPath should show scopeFn called exactly once, not multiple times");
        });
    });

    describe("execution order", () => {
        beforeEach(() => {
            // Enable verbose mode for opPath tracking
            assertConfig.isVerbose = true;
        });

        it("should execute expression steps before scope function", () => {
            let scopeFn = function<R>(this: IAssertScope, value: any): R {
                this.context.setOp("scopeFn");
                return this.that;
            };
            
            let context = createContext(10);
            let scope = createAssertScope(context);
            
            let adapter = createExprAdapter("not", scopeFn);
            adapter.call(scope, 5);
            
            // Check opPath to verify execution order
            let opPath = scope.context.get("opPath");
            let scopeFnIndex = opPath.indexOf("scopeFn");
            let notIndex = opPath.indexOf("not");
            
            assert.isTrue(notIndex >= 0, "not step should be in opPath");
            assert.isTrue(scopeFnIndex >= 0, "scopeFn should be in opPath");
            assert.isTrue(notIndex < scopeFnIndex, "not step should execute before scopeFn");
        });

        it("should execute scope function after all expression steps complete", () => {
            let scopeFn = function<R>(this: IAssertScope): R {
                this.context.setOp("scopeFn");
                return this.that;
            };
            
            let context = createContext(true);
            let scope = createAssertScope(context);
            
            let adapter = createExprAdapter("to.be.not", scopeFn);
            adapter.call(scope);
            
            // Check opPath to verify scopeFn appears after expression steps
            let opPath = scope.context.get("opPath");
            let scopeFnIndex = opPath.indexOf("scopeFn");
            let toIndex = opPath.indexOf("to");
            let beIndex = opPath.indexOf("be");
            let notIndex = opPath.indexOf("not");
            
            assert.isTrue(scopeFnIndex >= 0, "scopeFn should be in opPath");
            assert.isTrue(toIndex >= 0 && toIndex < scopeFnIndex, "'to' should execute before scopeFn");
            assert.isTrue(beIndex >= 0 && beIndex < scopeFnIndex, "'be' should execute before scopeFn");
            assert.isTrue(notIndex >= 0 && notIndex < scopeFnIndex, "'not' should execute before scopeFn");
        });

        it("should pass arguments to scope function after expression evaluation", () => {
            let receivedArgs: any[] = [];
            
            let scopeFn = function<R>(this: IAssertScope, ...args: any[]): R {
                receivedArgs = args;
                return this.that;
            };
            
            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("not", scopeFn);
            
            adapter.call(scope, 5, "test", true);
            
            assert.deepEqual(receivedArgs, [5, "test", true], "Arguments should be passed to scope function");
        });

        it("should execute scope function with correct context", () => {
            let receivedThis: any;
            let receivedValue: any;
            
            let scopeFn = function<R>(this: IAssertScope): R {
                receivedThis = this;
                receivedValue = this.context.value;
                return this.that;
            };
            
            let context = createContext(42);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("not", scopeFn);
            
            adapter.call(scope);
            
            assert.equal(receivedThis, scope, "Scope function should receive correct scope as 'this'");
            assert.equal(receivedValue, 42, "Scope function should have access to context value");
        });
    });

    describe("scope function isolation", () => {
        beforeEach(() => {
            // Disable verbose mode for basic testing
            assertConfig.isVerbose = false;
        });

        it("should call scope function independently for each adapter invocation", () => {
            let calls: number[] = [];
            
            let scopeFn = function<R>(this: IAssertScope, id: number): R {
                calls.push(id);
                return this.that;
            };
            
            let adapter = createExprAdapter("not", scopeFn);
            
            // Multiple independent calls
            for (let i = 1; i <= 5; i++) {
                let context = createContext(i * 10);
                let scope = createAssertScope(context);
                adapter.call(scope, i);
            }
            
            // Should have been called 5 times, once per invocation
            assert.equal(calls.length, 5, "Scope function should be called once per adapter invocation");
            assert.deepEqual(calls, [1, 2, 3, 4, 5], "Each invocation should be independent");
        });

        it("should not share state between scope function calls", () => {
            let stateTracker: any[] = [];
            
            let scopeFn = function<R>(this: IAssertScope, value: any): R {
                stateTracker.push({ context: this.context.value, arg: value });
                return this.that;
            };
            
            let adapter = createExprAdapter("not", scopeFn);
            
            let context1 = createContext(10);
            let scope1 = createAssertScope(context1);
            adapter.call(scope1, "first");
            
            let context2 = createContext(20);
            let scope2 = createAssertScope(context2);
            adapter.call(scope2, "second");
            
            assert.equal(stateTracker.length, 2, "Scope function should be called twice");
            assert.deepEqual(stateTracker[0], { context: 10, arg: "first" }, "First call should have correct state");
            assert.deepEqual(stateTracker[1], { context: 20, arg: "second" }, "Second call should have correct state");
        });
    });

    describe("without scope function", () => {
        beforeEach(() => {
            // Enable verbose mode for opPath tracking
            assertConfig.isVerbose = true;
        });

        it("should work correctly without a scope function", () => {
            let context = createContext(true);
            let scope = createAssertScope(context);
            
            let adapter = createExprAdapter("to.be");
            let result = adapter.call(scope);
            
            assert.ok(result, "Adapter should work without scope function");
        });

        it("should execute expression steps when no scope function provided", () => {
            let context = createContext([1, 2, 3]);
            let scope = createAssertScope(context);
            
            let adapter = createExprAdapter("to");
            adapter.call(scope);
            
            // Verify expression steps were executed via opPath
            let opPath = scope.context.get("opPath");
            assert.ok(opPath && opPath.length > 0, "Expression steps should execute even without scope function");
            assert.isTrue(opPath.indexOf("to") >= 0, "The 'to' step should be in opPath");
        });
    });

    describe("scope function with different scenarios", () => {
        beforeEach(() => {
            // Disable verbose mode for basic testing
            assertConfig.isVerbose = false;
        });

        it("should handle scope function returning the scope", () => {
            let scopeFn = function<R>(this: IAssertScope): R {
                return this.that;
            };
            
            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("not", scopeFn);
            
            let result = adapter.call(scope);
            assert.ok(result, "Should handle scope function returning scope");
        });

        it("should handle scope function that modifies context", () => {
            let modified = false;
            
            let scopeFn = function<R>(this: IAssertScope): R {
                modified = true;
                this.context.set("custom", "value");
                return this.that;
            };
            
            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("not", scopeFn);
            
            adapter.call(scope);
            
            assert.isTrue(modified, "Scope function should have executed");
            assert.equal(scope.context.get("custom"), "value", "Context should be modified");
        });

        it("should execute scope function only once even when chained", () => {
            let callCount = 0;
            
            let scopeFn = function<R>(this: IAssertScope): R {
                callCount++;
                return this.that;
            };
            
            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("to.not.be", scopeFn);
            
            adapter.call(scope);
            
            assert.equal(callCount, 1, "Scope function should only be called once even with longer expression chain");
        });
    });

    describe("real-world integration", () => {
        beforeEach(() => {
            // Disable verbose mode for basic testing
            assertConfig.isVerbose = false;
        });

        it("should work like isNotNull assertion (not expression + scope function)", () => {
            let callCount = 0;
            
            let isNullFunc = function<R>(this: IAssertScope): R {
                callCount++;
                this.context.eval(this.context.value === null, "expected {value} to be null");
                return this.that;
            };
            
            let adapter = createExprAdapter("not", isNullFunc);
            
            let context1 = createContext(10);
            let scope1 = createAssertScope(context1);
            adapter.call(scope1);
            
            assert.equal(callCount, 1, "Scope function should be called once for successful assertion");
            
            let context2 = createContext(null);
            let scope2 = createAssertScope(context2);
            
            checkError(() => {
                adapter.call(scope2);
            }, /not expected/);
            
            assert.equal(callCount, 2, "Scope function should be called once more for failing assertion");
        });

        it("should maintain call count across multiple invocations", () => {
            let callCount = 0;
            
            let scopeFn = function<R>(this: IAssertScope): R {
                callCount++;
                return this.that;
            };
            
            let adapter = createExprAdapter("not", scopeFn);
            
            // First invocation
            let context1 = createContext(10);
            let scope1 = createAssertScope(context1);
            adapter.call(scope1);
            assert.equal(callCount, 1, "First invocation should call scope function once");
            
            // Second invocation
            let context2 = createContext(20);
            let scope2 = createAssertScope(context2);
            adapter.call(scope2);
            assert.equal(callCount, 2, "Second invocation should call scope function once");
            
            // Third invocation
            let context3 = createContext(30);
            let scope3 = createAssertScope(context3);
            adapter.call(scope3);
            assert.equal(callCount, 3, "Third invocation should call scope function once");
        });
    });
});

