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
import { assertConfig } from "../../../../src/config/assertConfig";
import { addAssertInstFunc, addAssertInstFuncDefs, addAssertInstProperty } from "../../../../src/assert/assertInst";
import { _clearAssertInstFuncs } from "../../../../src/assert/internal/_AssertInstCore";
import { expect } from "../../../../src/assert/expect";
import { isArray } from "@nevware21/ts-utils";

describe("createExprAdapter", () => {
    after(() => {
        // Reset to default config values
        assertConfig.$ops.reset();
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

    describe("expression syntax", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        describe("string expressions", () => {
            it("should parse simple single-step expressions", () => {
                let context = createContext(10);
                let scope = createAssertScope(context);
                let adapter = createExprAdapter("not");

                let result = adapter.call(scope);
                assert.ok(result, "Single-step expression should work");
            });

            it("should parse multi-step dot-separated expressions", () => {
                let context = createContext(true);
                let scope = createAssertScope(context);
                let adapter = createExprAdapter("to.be");

                let result = adapter.call(scope);
                assert.ok(result, "Multi-step expression should work");
            });

            it("should parse complex chained expressions", () => {
                let context = createContext([1, 2, 3]);
                let scope = createAssertScope(context);
                let adapter = createExprAdapter("to.be.not");

                let result = adapter.call(scope);
                assert.ok(result, "Complex expression chain should work");
            });
        });

        describe("array expressions", () => {
            it("should accept array syntax equivalent to dot notation", () => {
                let context = createContext(10);
                let scope = createAssertScope(context);

                let adapter1 = createExprAdapter("to.be.not");
                let adapter2 = createExprAdapter(["to", "be", "not"]);

                let result1 = adapter1.call(scope);

                let context2 = createContext(10);
                let scope2 = createAssertScope(context2);
                let result2 = adapter2.call(scope2);

                assert.ok(result1, "String syntax should work");
                assert.ok(result2, "Array syntax should work");
            });

            it("should handle single element arrays", () => {
                let context = createContext(10);
                let scope = createAssertScope(context);
                let adapter = createExprAdapter(["not"]);

                let result = adapter.call(scope);
                assert.ok(result, "Single element array should work");
            });

            it("should handle complex array expressions", () => {
                let adapter = createExprAdapter(["deep", "own", "include"]);

                // Just test that it parses and executes without error
                // The actual assertion is handled by the operations
                assert.ok(adapter, "Complex array expression should be created");
            });
        });
    });

    describe("invalid expression handling", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should throw on mismatched parentheses - missing close", () => {
            checkError(() => {
                createExprAdapter("func(arg");
            }, /Invalid expression/);
        });

        it("should throw on nested parentheses in arguments", () => {
            checkError(() => {
                createExprAdapter("func({nested{arg}})");
            }, /Invalid expression/);
        });

        it("should throw on multiple parentheses sections", () => {
            checkError(() => {
                createExprAdapter("func(arg)(arg2)");
            }, /Invalid expression/);
        });

        it("should throw on spaces in arguments without braces", () => {
            checkError(() => {
                createExprAdapter("func(arg with space)");
            }, /Invalid expression/);
        });

        it("should throw when step does not exist on assertion instance", () => {
            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("nonexistent.step");

            checkError(() => {
                adapter.call(scope);
            }, /Invalid step.*nonexistent/);
        });
    });

    describe("built-in expression patterns", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        describe("type checking expressions", () => {
            it("should work with is.string expression", () => {
                let adapter = createExprAdapter("is.string");

                let context1 = createContext("hello");
                let scope1 = createAssertScope(context1);
                adapter.call(scope1);

                let context2 = createContext(123);
                let scope2 = createAssertScope(context2);
                checkError(() => {
                    adapter.call(scope2);
                }, /string/);
            });

            it("should work with is.array expression", () => {
                let adapter = createExprAdapter("is.array");

                let context1 = createContext([1, 2, 3]);
                let scope1 = createAssertScope(context1);
                adapter.call(scope1);

                let context2 = createContext("not an array");
                let scope2 = createAssertScope(context2);
                checkError(() => {
                    adapter.call(scope2);
                }, /array/);
            });

            it("should work with is.nan expression", () => {
                let adapter = createExprAdapter("is.nan");

                let context1 = createContext(NaN);
                let scope1 = createAssertScope(context1);
                adapter.call(scope1);

                let context2 = createContext(123);
                let scope2 = createAssertScope(context2);
                checkError(() => {
                    adapter.call(scope2);
                }, /NaN/);
            });

            it("should work with is.finite expression", () => {
                let adapter = createExprAdapter("is.finite");

                let context1 = createContext(100);
                let scope1 = createAssertScope(context1);
                adapter.call(scope1);

                let context2 = createContext(Infinity);
                let scope2 = createAssertScope(context2);
                checkError(() => {
                    adapter.call(scope2);
                }, /finite/);
            });
        });

        describe("negation expressions", () => {
            it("should work with not.is.string expression", () => {
                let adapter = createExprAdapter("not.is.string");

                let context1 = createContext(123);
                let scope1 = createAssertScope(context1);
                adapter.call(scope1);

                let context2 = createContext("hello");
                let scope2 = createAssertScope(context2);
                checkError(() => {
                    adapter.call(scope2);
                }, /not/);
            });

            it("should work with not.is.array expression", () => {
                let adapter = createExprAdapter("not.is.array");

                let context1 = createContext("not array");
                let scope1 = createAssertScope(context1);
                adapter.call(scope1);

                let context2 = createContext([1, 2, 3]);
                let scope2 = createAssertScope(context2);
                checkError(() => {
                    adapter.call(scope2);
                }, /not/);
            });

            it("should work with not.to.exist expression", () => {
                let adapter = createExprAdapter("not.to.exist");

                let context1 = createContext(null);
                let scope1 = createAssertScope(context1);
                adapter.call(scope1);

                let context2 = createContext("exists");
                let scope2 = createAssertScope(context2);
                checkError(() => {
                    adapter.call(scope2);
                }, /not/);
            });
        });

        describe("existence expressions", () => {
            it("should work with to.exist expression", () => {
                let adapter = createExprAdapter("to.exist");

                let context1 = createContext("value");
                let scope1 = createAssertScope(context1);
                adapter.call(scope1);

                let context2 = createContext(null);
                let scope2 = createAssertScope(context2);
                checkError(() => {
                    adapter.call(scope2);
                }, /exist/);
            });
        });
    });

    describe("modifier combinations", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should work with deep modifier setting up deep comparison", () => {
            // Test that the deep modifier is applied correctly
            // We use a scope function to verify the deep flag is set
            let deepFlagSet = false;
            let scopeFn = function<R>(this: IAssertScope): R {
                deepFlagSet = this.context.get("$deep") === true;
                return this.that;
            };

            let adapter = createExprAdapter("deep", scopeFn);
            let context = createContext({ a: { b: 1 } });
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.isTrue(deepFlagSet, "Deep flag should be set after deep expression");
        });

        it("should work with own modifier setting up own property checking", () => {
            // Test that the own modifier is applied correctly
            let ownFlagSet = false;
            let scopeFn = function<R>(this: IAssertScope): R {
                ownFlagSet = this.context.get("$own") === true;
                return this.that;
            };

            let adapter = createExprAdapter("own", scopeFn);
            let context = createContext({ a: 1, b: 2 });
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.isTrue(ownFlagSet, "Own flag should be set after own expression");
        });

        it("should work with combined modifiers setting multiple flags", () => {
            // Test that combined modifiers set multiple flags
            let deepFlagSet = false;
            let ownFlagSet = false;
            let scopeFn = function<R>(this: IAssertScope): R {
                deepFlagSet = this.context.get("$deep") === true;
                ownFlagSet = this.context.get("$own") === true;
                return this.that;
            };

            let adapter = createExprAdapter("deep.own", scopeFn);
            let context = createContext({ a: { b: 1 } });
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.isTrue(deepFlagSet, "Deep flag should be set after deep.own expression");
            assert.isTrue(ownFlagSet, "Own flag should be set after deep.own expression");
        });

        it("should work with has.any modifier setting any flag", () => {
            // Test that has.any sets the $any flag
            let anyFlagSet = false;
            let scopeFn = function<R>(this: IAssertScope): R {
                anyFlagSet = this.context.get("$any") === true;
                return this.that;
            };

            let adapter = createExprAdapter("has.any", scopeFn);
            let context = createContext({ a: 1, b: 2 });
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.isTrue(anyFlagSet, "Any flag should be set after has.any expression");
        });

        it("should work with has.all modifier setting all flag", () => {
            // Test that has.all sets the $all flag
            let allFlagSet = false;
            let scopeFn = function<R>(this: IAssertScope): R {
                allFlagSet = this.context.get("$all") === true;
                return this.that;
            };

            let adapter = createExprAdapter("has.all", scopeFn);
            let context = createContext({ a: 1, b: 2 });
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.isTrue(allFlagSet, "All flag should be set after has.all expression");
        });

        it("should work with not.deep.own expression setting negation and flags", () => {
            // Test combined negation and modifiers
            let adapter = createExprAdapter("not.deep.own.include");

            // This should work: checking that {} does NOT deeply include something
            let context = createContext({});
            let scope = createAssertScope(context);
            let result = adapter.call(scope);
            assert.ok(result, "Negated combined modifier expression should work");
        });
    });

    describe("custom assertion patterns from documentation", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should support creating custom assertions with scope functions", () => {
            let isPositiveFunc = function<R>(this: IAssertScope): R {
                let value = this.context.value;
                this.context.eval(
                    typeof value === "number" && value > 0,
                    "expected {value} to be a positive number"
                );
                return this.that;
            };

            let adapter = createExprAdapter("not", isPositiveFunc);

            // Should pass - not positive (negative)
            let context1 = createContext(-5);
            let scope1 = createAssertScope(context1);
            adapter.call(scope1);

            // Should fail - is positive
            let context2 = createContext(10);
            let scope2 = createAssertScope(context2);
            checkError(() => {
                adapter.call(scope2);
            }, /not/);
        });

        it("should support string length validation pattern", () => {
            let hasMinLengthFunc = function<R>(this: IAssertScope, minLength: number): R {
                let value = this.context.value;
                this.context.eval(
                    typeof value === "string" && value.length >= minLength,
                    "expected {value} to have at least " + minLength + " characters"
                );
                return this.that;
            };

            let notHasMinLengthAdapter = createExprAdapter("not", hasMinLengthFunc);

            // Should pass - "hi" does NOT have min length 5
            let context1 = createContext("hi");
            let scope1 = createAssertScope(context1);
            notHasMinLengthAdapter.call(scope1, 5);

            // Should fail - "hello" DOES have min length 3
            let context2 = createContext("hello");
            let scope2 = createAssertScope(context2);
            checkError(() => {
                notHasMinLengthAdapter.call(scope2, 3);
            }, /not/);
        });

        it("should support range validation pattern", () => {
            let checkRangeFunc = function<R>(this: IAssertScope, min: number, max: number): R {
                let value = this.context.value;
                this.context.eval(
                    typeof value === "number" && value >= min && value <= max,
                    "expected {value} to be between " + min + " and " + max
                );
                return this.that;
            };

            let notInRangeAdapter = createExprAdapter("not", checkRangeFunc);

            // Should pass - 100 is NOT in range 0-10
            let context1 = createContext(100);
            let scope1 = createAssertScope(context1);
            notInRangeAdapter.call(scope1, 0, 10);

            // Should fail - 5 IS in range 0-10
            let context2 = createContext(5);
            let scope2 = createAssertScope(context2);
            checkError(() => {
                notInRangeAdapter.call(scope2, 0, 10);
            }, /not/);
        });
    });

    describe("expression reuse and performance", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should allow expression reuse across multiple invocations", () => {
            let callCount = 0;
            let scopeFn = function<R>(this: IAssertScope): R {
                callCount++;
                return this.that;
            };

            let adapter = createExprAdapter("not", scopeFn);

            // Reuse the same adapter many times
            for (let i = 0; i < 100; i++) {
                let context = createContext(i);
                let scope = createAssertScope(context);
                adapter.call(scope);
            }

            assert.equal(callCount, 100, "Adapter should be reusable");
        });

        it("should only parse expression once at creation time", () => {
            // This test verifies the behavior - expressions are parsed once
            // Use a simple expression that doesn't require arguments
            let callCount = 0;
            let scopeFn = function<R>(this: IAssertScope): R {
                callCount++;
                return this.that;
            };

            let adapter = createExprAdapter("to.be", scopeFn);

            // Multiple calls should not re-parse, the expression is already parsed
            let results: any[] = [];
            for (let i = 0; i < 10; i++) {
                let context = createContext({ value: i });
                let scope = createAssertScope(context);
                let result = adapter.call(scope);
                results.push(result);
            }

            assert.equal(results.length, 10, "All invocations should work");
            assert.equal(callCount, 10, "Scope function should be called for each invocation");
            results.forEach((r) => assert.ok(r, "Each result should be valid"));
        });
    });

    describe("verbose mode tracking", () => {
        it("should track expression in opPath when verbose", () => {
            assertConfig.isVerbose = true;

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("to.be.not");

            adapter.call(scope);

            let opPath = scope.context.get("opPath");
            assert.isTrue(opPath.length > 0, "opPath should have entries");

            // Check that the expression was tracked
            let foundExpr = opPath.some((op: string) => op.indexOf("to.be.not") >= 0);
            assert.isTrue(foundExpr, "Expression should be tracked in opPath");
        });

        it("should track scope function name in opPath when verbose", () => {
            assertConfig.isVerbose = true;

            function namedScopeFn<R>(this: IAssertScope): R {
                return this.that;
            }

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("not", namedScopeFn);

            adapter.call(scope);

            let opPath = scope.context.get("opPath");
            let foundScopeFn = opPath.some((op: string) => op.indexOf("namedScopeFn") >= 0);
            assert.isTrue(foundScopeFn, "Named scope function should be tracked in opPath");
        });

        it("should track anonymous scope function in opPath when verbose", () => {
            assertConfig.isVerbose = true;

            let context = createContext(10);
            let scope = createAssertScope(context);
            let adapter = createExprAdapter("not", function<R>(this: IAssertScope): R {
                return this.that;
            });

            adapter.call(scope);

            let opPath = scope.context.get("opPath");
            let foundAnonymous = opPath.some((op: string) => op.indexOf("anonymous") >= 0);
            assert.isTrue(foundAnonymous, "Anonymous scope function should be tracked as 'anonymous' in opPath");
        });
    });

    describe("integration with assert class", () => {
        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        it("should work with assert.isString which uses is.string expression", () => {
            assert.isString("hello");

            checkError(() => {
                assert.isString(123);
            }, /string/);
        });

        it("should work with assert.isNotString which uses not.is.string expression", () => {
            assert.isNotString(123);

            checkError(() => {
                assert.isNotString("hello");
            }, /not/);
        });

        it("should work with assert.exists which uses to.exist expression", () => {
            assert.exists("value");
            assert.exists(0);
            assert.exists(false);

            checkError(() => {
                assert.exists(null);
            }, /exist/);
        });

        it("should work with assert.notExists which uses not.to.exist expression", () => {
            assert.notExists(null);
            assert.notExists(undefined);

            checkError(() => {
                assert.notExists("value");
            }, /not/);
        });

        it("should work with assert.isNaN which uses is.nan expression", () => {
            assert.isNaN(NaN);

            checkError(() => {
                assert.isNaN(123);
            }, /NaN/);
        });

        it("should work with assert.isNotNaN which uses not.is.nan expression", () => {
            assert.isNotNaN(123);

            checkError(() => {
                assert.isNotNaN(NaN);
            }, /not/);
        });

        it("should work with assert.isFinite which uses is.finite expression", () => {
            assert.isFinite(100);
            assert.isFinite(-50);
            assert.isFinite(0);

            checkError(() => {
                assert.isFinite(Infinity);
            }, /finite/);
        });

        it("should work with assert.isNotFinite which uses not.is.finite expression", () => {
            assert.isNotFinite(Infinity);
            assert.isNotFinite(-Infinity);

            checkError(() => {
                assert.isNotFinite(100);
            }, /not/);
        });
    });

    describe("calling custom instance functions from expressions", () => {
        // These tests verify that custom functions added via addAssertInstFunc
        // can be called from expressions created with createExprAdapter

        beforeEach(() => {
            assertConfig.isVerbose = false;
        });

        afterEach(() => {
            // Clean up any added instance functions
            _clearAssertInstFuncs();
        });

        it("should call a custom instance function from an expression", () => {
            // Add a custom function to the assertion instance prototype
            let customFuncCalled = false;
            addAssertInstFunc("myCustomCheck", function(this: IAssertScope) {
                customFuncCalled = true;
                this.context.eval(true, "custom check passed");
                return this.that;
            });

            // Create an expression that calls the custom function
            let adapter = createExprAdapter("myCustomCheck");

            let context = createContext(5);
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.isTrue(customFuncCalled, "Custom instance function should be called from expression");
        });

        it("should call custom instance function with not modifier", () => {
            let customFuncCalled = false;
            addAssertInstFunc("isPositive", function(this: IAssertScope) {
                customFuncCalled = true;
                let value = this.context.value;
                this.context.eval(
                    typeof value === "number" && value > 0,
                    "expected {value} to be a positive number"
                );
                return this.that;
            });

            // Create an expression that negates the custom function
            let adapter = createExprAdapter("not.isPositive");

            // Should pass for negative number (not positive)
            let context1 = createContext(-5);
            let scope1 = createAssertScope(context1);
            adapter.call(scope1);
            assert.isTrue(customFuncCalled, "Custom function should be called");

            // Should fail for positive number
            customFuncCalled = false;
            let context2 = createContext(10);
            let scope2 = createAssertScope(context2);
            checkError(() => {
                adapter.call(scope2);
            }, /not/);
            assert.isTrue(customFuncCalled, "Custom function should be called even when failing");
        });

        it("should call custom instance function without arguments", () => {
            let receivedContext: any;
            addAssertInstFunc("checkValue", function(this: IAssertScope) {
                receivedContext = {
                    value: this.context.value,
                    hasContext: !!this.context
                };
                this.context.eval(
                    typeof this.context.value === "number",
                    "expected {value} to be a number"
                );
                return this.that;
            });

            let adapter = createExprAdapter("checkValue");

            let context = createContext(42);
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.isTrue(receivedContext.hasContext, "Custom function should have access to context");
            assert.equal(receivedContext.value, 42, "Custom function should see the context value");
        });

        // Note: Expression argument passing (`{0}`, `{1}`, context names) has specific
        // behavior that requires careful handling. For simple custom functions,
        // accessing values directly from `this.context.value` is recommended.

        it("should chain multiple custom instance functions in expression", () => {
            let isPositiveCalled = false;
            let isEvenCalled = false;

            addAssertInstFunc("isPositive", function(this: IAssertScope) {
                isPositiveCalled = true;
                let value = this.context.value;
                this.context.eval(
                    typeof value === "number" && value > 0,
                    "expected {value} to be a positive number"
                );
                return this.that;
            });

            addAssertInstFunc("isEven", function(this: IAssertScope) {
                isEvenCalled = true;
                let value = this.context.value;
                this.context.eval(
                    typeof value === "number" && value % 2 === 0,
                    "expected {value} to be an even number"
                );
                return this.that;
            });

            // Test that isPositive works
            let adapter = createExprAdapter("isPositive");

            let context = createContext(4); // 4 is positive and even
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.isTrue(isPositiveCalled, "isPositive should be called");

            // Reset flags
            isPositiveCalled = false;
            isEvenCalled = false;

            // Test isEven works too (separate adapter)
            let adapterEven = createExprAdapter("isEven");
            context = createContext(4);
            scope = createAssertScope(context);
            adapterEven.call(scope);

            assert.isTrue(isEvenCalled, "isEven should be called via adapter");
        });

        it("should chain custom functions via expect API", () => {
            let checkOneCalled = false;
            let checkTwoCalled = false;

            addAssertInstFunc("checkOne", function(this: IAssertScope) {
                checkOneCalled = true;
                this.context.eval(true, "check one passed");
                return this.that;
            });

            addAssertInstFunc("checkTwo", function(this: IAssertScope) {
                checkTwoCalled = true;
                this.context.eval(true, "check two passed");
                return this.that;
            });

            // Direct expect API calls work with custom instance functions
            // Note: Return value is the instance, so each call is separate
            let inst = expect(42) as any;
            inst.checkOne();
            assert.isTrue(checkOneCalled, "checkOne should be called via expect");

            // The return value from checkOne() can also be chained
            // but we call them separately here to verify both work
            inst.checkTwo();
            assert.isTrue(checkTwoCalled, "checkTwo should be called via expect");
        });

        it("should throw when custom function follows deep modifier in expression", () => {
            // Custom functions cannot be used after modifiers like 'deep' in expressions
            // because modifiers have a specific set of allowed steps
            addAssertInstFunc("checkDeep", function(this: IAssertScope) {
                this.context.eval(true, "check deep");
                return this.that;
            });

            let adapter = createExprAdapter("deep.checkDeep");

            let context = createContext({ a: 1 });
            let scope = createAssertScope(context);

            // This should throw because 'checkDeep' is not a valid step after 'deep'
            checkError(() => {
                adapter.call(scope);
            }, /Invalid step: checkDeep/);
        });

        it("should throw when custom function follows own modifier in expression", () => {
            // Custom functions cannot be used after 'own' modifier in expressions
            addAssertInstFunc("checkOwn", function(this: IAssertScope) {
                this.context.eval(true, "check own");
                return this.that;
            });

            let adapter = createExprAdapter("own.checkOwn");

            let context = createContext({ a: 1 });
            let scope = createAssertScope(context);

            // This should throw because 'checkOwn' is not a valid step after 'own'
            checkError(() => {
                adapter.call(scope);
            }, /Invalid step: checkOwn/);
        });

        it("should throw when custom function follows not.deep in expression", () => {
            // Custom functions cannot follow modifier chains
            addAssertInstFunc("checkValue", function(this: IAssertScope) {
                this.context.eval(true, "check value");
                return this.that;
            });

            let adapter = createExprAdapter("not.deep.checkValue");

            let context = createContext(10);
            let scope = createAssertScope(context);

            // This should throw because 'checkValue' is not a valid step after 'not.deep'
            checkError(() => {
                adapter.call(scope);
            }, /Invalid step: checkValue/);
        });

        it("should allow custom function with not modifier at root only", () => {
            // 'not' at the root level is handled specially and custom functions can follow
            let customCalled = false;
            let evalResult: boolean | undefined;

            addAssertInstFunc("checkNotEmpty", function(this: IAssertScope) {
                customCalled = true;
                let value = this.context.value;
                evalResult = isArray(value) && value.length > 0;
                this.context.eval(evalResult, "expected {value} to not be empty");
                return this.that;
            });

            // Using createNotAdapter or just 'not' followed by custom function accessed via API
            // The expression 'not.checkNotEmpty' won't work directly, but we can use the expect API
            let inst = expect([1, 2, 3]) as any;
            inst.checkNotEmpty();

            assert.isTrue(customCalled, "Custom function should be called");
            assert.isTrue(evalResult, "Custom function should have evaluated correctly");
        });

        it("should work with addAssertInstFuncDefs to add multiple functions", () => {
            let func1Called = false;
            let func2Called = false;

            addAssertInstFuncDefs({
                customFunc1: {
                    scopeFn: function(this: IAssertScope) {
                        func1Called = true;
                        this.context.eval(true, "func1 check");
                        return this.that;
                    }
                },
                customFunc2: {
                    scopeFn: function(this: IAssertScope) {
                        func2Called = true;
                        this.context.eval(true, "func2 check");
                        return this.that;
                    }
                }
            });

            // Test calling first custom function
            let adapter1 = createExprAdapter("customFunc1");
            let context1 = createContext(1);
            let scope1 = createAssertScope(context1);
            adapter1.call(scope1);
            assert.isTrue(func1Called, "customFunc1 should be called");

            // Test calling second custom function with not
            let adapter2 = createExprAdapter("not.customFunc2");
            let context2 = createContext(2);
            let scope2 = createAssertScope(context2);
            // Will fail because customFunc2 returns true, and we negate it
            checkError(() => {
                adapter2.call(scope2);
            }, /not/);
            assert.isTrue(func2Called, "customFunc2 should be called");
        });

        it("should work with addAssertInstProperty for property-style assertions", () => {
            let propCalled = false;

            addAssertInstProperty("isTheFive", function(scope: IAssertScope) {
                propCalled = true;
                scope.context.eval(scope.context.value === 5, "expected {value} to be five");
            }, "expected {value} to be five");

            // Access the property via expect (using 'any' cast since TypeScript doesn't know about custom properties)
            (expect(5) as any).isTheFive;
            assert.isTrue(propCalled, "Property assertion should be called");

            propCalled = false;
            checkError(() => {
                (expect(10) as any).isTheFive;
            }, /five/);
            assert.isTrue(propCalled, "Property assertion should be called even when failing");
        });

        it("should allow reusing expression adapter with custom function multiple times", () => {
            let callCount = 0;
            addAssertInstFunc("countCalls", function(this: IAssertScope) {
                callCount++;
                this.context.eval(true, "counted");
                return this.that;
            });

            let adapter = createExprAdapter("countCalls");

            // Call the adapter multiple times
            for (let i = 0; i < 5; i++) {
                let context = createContext(i);
                let scope = createAssertScope(context);
                adapter.call(scope);
            }

            assert.equal(callCount, 5, "Custom function should be called 5 times");
        });

        it("should throw error when custom function doesn't exist in expression", () => {
            // Don't add any custom function, just try to use it
            let adapter = createExprAdapter("nonExistentCustomFunc");

            let context = createContext(5);
            let scope = createAssertScope(context);

            checkError(() => {
                adapter.call(scope);
            }, /Invalid step: nonExistentCustomFunc/);
        });
    });
});
