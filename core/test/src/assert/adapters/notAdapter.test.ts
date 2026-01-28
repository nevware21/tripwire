/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../../src/assert/assertClass";
import { createNotAdapter } from "../../../../src/assert/adapters/notAdapter";
import { createEvalAdapter } from "../../../../src/assert/adapters/evalAdapter";
import { createExprAdapter } from "../../../../src/assert/adapters/exprAdapter";
import { createContext } from "../../../../src/assert/scopeContext";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { checkError } from "../../support/checkError";
import { IAssertScope } from "../../../../src/assert/interface/IAssertScope";
import { assertConfig } from "../../../../src/assert/config";

describe("createNotAdapter", () => {
    let originalIsVerbose: boolean | undefined;

    before(() => {
        // Save original isVerbose setting
        originalIsVerbose = assertConfig.isVerbose;
    });

    after(() => {
        // Restore original isVerbose setting
        assertConfig.isVerbose = originalIsVerbose;
    });

    describe("basic functionality", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should create an adapter that wraps a scope function with negation", () => {
            let scopeFn = function<R>(this: IAssertScope): R {
                this.context.eval(this.context.value === null, "expected {value} to be null");
                return this.that;
            };

            let adapter = createNotAdapter(scopeFn);

            // Should pass when value is NOT null (negation applied)
            let context = createContext(10);
            let scope = createAssertScope(context);
            let result = adapter.call(scope);
            assert.ok(result, "Adapter should pass when value is not null");
        });

        it("should fail when negated condition is not met", () => {
            let scopeFn = function<R>(this: IAssertScope): R {
                this.context.eval(this.context.value === null, "expected {value} to be null");
                return this.that;
            };

            let adapter = createNotAdapter(scopeFn);

            // Should fail when value IS null (negation of "is null" check fails)
            let context = createContext(null);
            let scope = createAssertScope(context);

            checkError(() => {
                adapter.call(scope);
            }, /not expected/);
        });

        it("should work with createEvalAdapter wrapped functions", () => {
            let isTrueFunc = createEvalAdapter((value: any) => value === true, "expected {value} to be true");
            let isNotTrueAdapter = createNotAdapter(isTrueFunc);

            // Should pass when value is NOT true
            let context1 = createContext(false);
            let scope1 = createAssertScope(context1);
            let result1 = isNotTrueAdapter.call(scope1);
            assert.ok(result1, "Should pass when value is false (not true)");

            // Should fail when value IS true
            let context2 = createContext(true);
            let scope2 = createAssertScope(context2);

            checkError(() => {
                isNotTrueAdapter.call(scope2);
            }, /not expected/);
        });
    });

    describe("scope function call count", () => {
        beforeEach(() => {
            assertConfig.isVerbose = true;
        });

        it("should call scope function exactly once", () => {
            let callCount = 0;

            let scopeFn = function<R>(this: IAssertScope): R {
                callCount++;
                this.context.setOp("scopeFn");
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            assert.equal(callCount, 1, "Scope function should be called exactly once");

            // Verify via opPath that scopeFn was called once
            let opPath = scope.context.get("opPath");
            let scopeFnCount = opPath.filter((op: string) => op === "scopeFn").length;
            assert.equal(scopeFnCount, 1, "opPath should show scopeFn called exactly once");
        });

        it("should call scope function once even with complex wrapped function", () => {
            let callCount = 0;

            let innerScopeFn = function<R>(this: IAssertScope): R {
                callCount++;
                this.context.setOp("innerFunc");
                return this.that;
            };

            let adapter = createNotAdapter(innerScopeFn);

            let context = createContext(42);
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.equal(callCount, 1, "Inner scope function should be called exactly once");
        });

        it("should not call scope function multiple times across multiple adapter invocations", () => {
            let calls: number[] = [];

            let scopeFn = function<R>(this: IAssertScope, id: number): R {
                calls.push(id);
                return this.that;
            };

            let adapter = createNotAdapter(scopeFn);

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
    });

    describe("execution order", () => {
        beforeEach(() => {
            assertConfig.isVerbose = true;
        });

        it("should apply 'not' operation before calling scope function", () => {
            let scopeFn = function<R>(this: IAssertScope): R {
                this.context.setOp("scopeFn");
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            // Check opPath to verify execution order
            let opPath = scope.context.get("opPath");
            let scopeFnIndex = opPath.indexOf("scopeFn");
            let notIndex = opPath.indexOf("[[not]]");

            assert.isTrue(notIndex >= 0, "[[not]] step should be in opPath");
            assert.isTrue(scopeFnIndex >= 0, "scopeFn should be in opPath");
            assert.isTrue(notIndex < scopeFnIndex, "[[not]] step should execute before scopeFn");
        });

        it("should have negation context active when scope function executes", () => {
            // To verify negation is active, we check that an eval(true) fails
            // and an eval(false) passes, which is the opposite of normal behavior
            let evalTrueResult: boolean | undefined;

            let scopeFn = function<R>(this: IAssertScope): R {
                // When negation is active:
                // - eval(true) becomes eval(false) -> should throw
                // - eval(false) becomes eval(true) -> should pass
                try {
                    evalTrueResult = this.context.eval(true, "test eval true");
                } catch (e) {
                    evalTrueResult = false;
                }
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            // With negation active, eval(true) should have been negated to false and thrown
            assert.isFalse(evalTrueResult, "eval(true) should fail when negation is active");
        });
    });

    describe("argument passing", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should pass arguments to scope function", () => {
            let receivedArgs: any[] = [];

            let scopeFn = function<R>(this: IAssertScope, ...args: any[]): R {
                receivedArgs = args;
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope, 1, 2, 3);

            assert.deepEqual(receivedArgs, [1, 2, 3], "Scope function should receive all arguments");
        });

        it("should pass no arguments when none provided", () => {
            let receivedArgs: any[] | undefined;

            let scopeFn = function<R>(this: IAssertScope, ...args: any[]): R {
                receivedArgs = args;
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            assert.deepEqual(receivedArgs, [], "Scope function should receive empty arguments array");
        });

        it("should pass complex arguments correctly", () => {
            let receivedArgs: any[] = [];

            let scopeFn = function<R>(this: IAssertScope, ...args: any[]): R {
                receivedArgs = args;
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            let obj = { name: "test" };
            let arr = [1, 2, 3];
            let fn = () => {};

            adapter.call(scope, obj, arr, fn, null, undefined, "string", 42);

            assert.equal(receivedArgs.length, 7, "Should pass all 7 arguments");
            assert.equal(receivedArgs[0], obj, "First arg should be object");
            assert.equal(receivedArgs[1], arr, "Second arg should be array");
            assert.equal(receivedArgs[2], fn, "Third arg should be function");
            assert.isNull(receivedArgs[3], "Fourth arg should be null");
            assert.isUndefined(receivedArgs[4], "Fifth arg should be undefined");
            assert.equal(receivedArgs[5], "string", "Sixth arg should be string");
            assert.equal(receivedArgs[6], 42, "Seventh arg should be number");
        });
    });

    describe("context handling", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should execute scope function with correct context value", () => {
            let receivedValue: any;

            let scopeFn = function<R>(this: IAssertScope): R {
                receivedValue = this.context.value;
                return this.that;
            };

            let context = createContext(42);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            assert.equal(receivedValue, 42, "Scope function should have access to context value");
        });

        it("should execute scope function with correct scope as 'this'", () => {
            let receivedThis: any;

            let scopeFn = function<R>(this: IAssertScope): R {
                receivedThis = this;
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            assert.equal(receivedThis, scope, "Scope function should receive correct scope as 'this'");
        });

        it("should allow scope function to modify context", () => {
            let scopeFn = function<R>(this: IAssertScope): R {
                this.context.set("custom", "value");
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            assert.equal(scope.context.get("custom"), "value", "Context should be modified by scope function");
        });
    });

    describe("equivalence with createExprAdapter('not', scopeFn)", () => {
        beforeEach(() => {
            assertConfig.isVerbose = true;
        });

        it("should produce equivalent behavior to createExprAdapter for not operations", () => {
            let notAdapterCallCount = 0;
            let exprAdapterCallCount = 0;

            let notAdapterScopeFn = function<R>(this: IAssertScope): R {
                notAdapterCallCount++;
                this.context.eval(this.context.value === null, "expected {value} to be null");
                return this.that;
            };

            let exprAdapterScopeFn = function<R>(this: IAssertScope): R {
                exprAdapterCallCount++;
                this.context.eval(this.context.value === null, "expected {value} to be null");
                return this.that;
            };

            let notAdapter = createNotAdapter(notAdapterScopeFn);
            let exprAdapter = createExprAdapter("not", exprAdapterScopeFn);

            // Test with non-null value - both should pass
            let context1 = createContext(10);
            let scope1 = createAssertScope(context1);
            notAdapter.call(scope1);

            let context2 = createContext(10);
            let scope2 = createAssertScope(context2);
            exprAdapter.call(scope2);

            assert.equal(notAdapterCallCount, 1, "notAdapter should call scope function once");
            assert.equal(exprAdapterCallCount, 1, "exprAdapter should call scope function once");

            // Test with null value - both should fail
            let context3 = createContext(null);
            let scope3 = createAssertScope(context3);
            let notAdapterFailed = false;
            try {
                notAdapter.call(scope3);
            } catch (e) {
                notAdapterFailed = true;
            }

            let context4 = createContext(null);
            let scope4 = createAssertScope(context4);
            let exprAdapterFailed = false;
            try {
                exprAdapter.call(scope4);
            } catch (e) {
                exprAdapterFailed = true;
            }

            assert.isTrue(notAdapterFailed, "notAdapter should fail with null value");
            assert.isTrue(exprAdapterFailed, "exprAdapter should fail with null value");
        });

        it("should pass same arguments as createExprAdapter", () => {
            let notAdapterArgs: any[] = [];
            let exprAdapterArgs: any[] = [];

            let notAdapterScopeFn = function<R>(this: IAssertScope, ...args: any[]): R {
                notAdapterArgs = args;
                return this.that;
            };

            let exprAdapterScopeFn = function<R>(this: IAssertScope, ...args: any[]): R {
                exprAdapterArgs = args;
                return this.that;
            };

            let notAdapter = createNotAdapter(notAdapterScopeFn);
            let exprAdapter = createExprAdapter("not", exprAdapterScopeFn);

            let context1 = createContext(10);
            let scope1 = createAssertScope(context1);
            notAdapter.call(scope1, "arg1", 42, true);

            let context2 = createContext(10);
            let scope2 = createAssertScope(context2);
            exprAdapter.call(scope2, "arg1", 42, true);

            assert.deepEqual(notAdapterArgs, exprAdapterArgs, "Both adapters should pass same arguments to scope function");
        });
    });

    describe("integration with real assertions", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should work like assert.isNotNull", () => {
            // isNotNull uses createNotAdapter(isNullFunc) internally
            assert.isNotNull(10);
            assert.isNotNull("string");
            assert.isNotNull({});
            assert.isNotNull([]);
            assert.isNotNull(0);
            assert.isNotNull(false);
            assert.isNotNull("");

            checkError(() => {
                assert.isNotNull(null);
            }, /not expected.*to be null/);
        });

        it("should work like assert.isNotUndefined", () => {
            // isNotUndefined uses createNotAdapter(isUndefinedFunc) internally
            assert.isNotUndefined(10);
            assert.isNotUndefined(null);
            assert.isNotUndefined("string");

            checkError(() => {
                assert.isNotUndefined(undefined);
            }, /not expected.*to be undefined/);
        });

        it("should work like assert.isNotTrue", () => {
            // isNotTrue uses createNotAdapter(isStrictTrueFunc) internally
            assert.isNotTrue(false);
            assert.isNotTrue(1);
            assert.isNotTrue("true");
            assert.isNotTrue(null);

            checkError(() => {
                assert.isNotTrue(true);
            }, /not expected.*to be strictly true/);
        });

        it("should work like assert.isNotFalse", () => {
            // isNotFalse uses createNotAdapter(isStrictFalseFunc) internally
            assert.isNotFalse(true);
            assert.isNotFalse(0);
            assert.isNotFalse("");
            assert.isNotFalse(null);

            checkError(() => {
                assert.isNotFalse(false);
            }, /not expected.*to be strictly false/);
        });
    });

    describe("return value", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should return scope.that", () => {
            let scopeFn = function<R>(this: IAssertScope): R {
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            let result = adapter.call(scope);
            assert.ok(result, "Adapter should return the assertion instance");
        });

        it("should return what scope function returns", () => {
            let customReturn = { custom: "result" };

            let scopeFn = function(this: IAssertScope): any {
                return customReturn;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            let result = adapter.call(scope);
            assert.equal(result, customReturn, "Adapter should return what scope function returns");
        });
    });

    describe("verbose mode", () => {
        it("should track [[not]] operation in opPath when verbose", () => {
            assertConfig.isVerbose = true;

            let scopeFn = function<R>(this: IAssertScope): R {
                this.context.setOp("scopeFn");
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            let opPath = scope.context.get("opPath");
            assert.isTrue(opPath.indexOf("[[not]]") >= 0, "opPath should contain [[not]] in verbose mode");
        });

        it("should not track operation when not in verbose mode", () => {
            assertConfig.isVerbose = false;

            let scopeFn = function<R>(this: IAssertScope): R {
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            let opPath = scope.context.get("opPath");
            // opPath should not contain [[not]] when not verbose
            assert.isTrue(!opPath || opPath.indexOf("[[not]]") === -1, "opPath should not contain [[not]] when not verbose");
        });
    });

    describe("stack frame handling", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should push function to _$stackFn", () => {
            let stackFnLength = 0;

            let scopeFn = function<R>(this: IAssertScope): R {
                stackFnLength = this.context._$stackFn.length;
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            adapter.call(scope);

            assert.isTrue(stackFnLength > 0, "_$stackFn should have entries when scope function executes");
        });
    });

    describe("error handling", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should propagate errors from scope function", () => {
            let scopeFn = function<R>(this: IAssertScope): R {
                throw new Error("Scope function error");
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            let errorThrown = false;
            let thrownError: Error | undefined;
            try {
                adapter.call(scope);
            } catch (e) {
                errorThrown = true;
                thrownError = e as Error;
            }

            assert.isTrue(errorThrown, "Error should be thrown");
            assert.isTrue(thrownError.message.indexOf("Scope function error") !== -1, "Error message should contain 'Scope function error'");
        });

        it("should propagate assertion failures from scope function", () => {
            let scopeFn = function<R>(this: IAssertScope): R {
                this.context.eval(false, "This should fail");
                return this.that;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            // With negation, a fail (eval(false)) should pass
            let result = adapter.call(scope);
            assert.ok(result, "With negation, a failed eval should pass");
        });
    });

    describe("edge cases", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should handle scope function that returns undefined", () => {
            let scopeFn = function(this: IAssertScope): any {
                // Explicitly return undefined
                return undefined;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            let result = adapter.call(scope);
            assert.isUndefined(result, "Adapter should handle undefined return value");
        });

        it("should handle scope function that returns null", () => {
            let scopeFn = function(this: IAssertScope): any {
                return null;
            };

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createNotAdapter(scopeFn);

            let result = adapter.call(scope);
            assert.isNull(result, "Adapter should handle null return value");
        });

        it("should handle reusing the same adapter with different contexts", () => {
            let values: any[] = [];

            let scopeFn = function<R>(this: IAssertScope): R {
                values.push(this.context.value);
                return this.that;
            };

            let adapter = createNotAdapter(scopeFn);

            // Reuse the same adapter with different contexts
            let context1 = createContext(10);
            let scope1 = createAssertScope(context1);
            adapter.call(scope1);

            let context2 = createContext("string");
            let scope2 = createAssertScope(context2);
            adapter.call(scope2);

            let context3 = createContext({ key: "value" });
            let scope3 = createAssertScope(context3);
            adapter.call(scope3);

            assert.equal(values.length, 3, "Adapter should be reusable");
            assert.equal(values[0], 10);
            assert.equal(values[1], "string");
            assert.deepEqual(values[2], { key: "value" });
        });
    });
});
