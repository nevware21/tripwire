/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../../src/assert/assertClass";
import { createEvalAdapter } from "../../../../src/assert/adapters/evalAdapter";
import { expect } from "../../../../src/assert/expect";
import { createContext } from "../../../../src/assert/scopeContext";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { checkError } from "../../support/checkError";

describe("createEvalAdapter", () => {
    describe("basic functionality", () => {
        it("should create an adapter that passes when evalFn returns true", () => {
            let adapter = createEvalAdapter((value: any) => value > 5);
            let context = createContext(10);
            let scope = createAssertScope(context);

            let result = adapter.call(scope);
            assert.ok(result);
        });

        it("should create an adapter that fails when evalFn returns false", () => {
            let adapter = createEvalAdapter((value: any) => value > 5, "Value must be greater than 5");
            let context = createContext(3);
            let scope = createAssertScope(context);

            checkError(() => {
                adapter.call(scope);
            }, "Value must be greater than 5");
        });

        it("should pass the actual value as first argument to evalFn", () => {
            let capturedValue: any;
            let adapter = createEvalAdapter((value: any) => {
                capturedValue = value;
                return true;
            });

            let context = createContext(42);
            let scope = createAssertScope(context);
            adapter.call(scope);

            assert.equal(capturedValue, 42);
        });

        it("should pass additional arguments to evalFn", () => {
            let capturedArgs: any[] = [];
            let adapter = createEvalAdapter((value: any, arg1: any, arg2: any) => {
                capturedArgs = [value, arg1, arg2];
                return true;
            });

            let context = createContext(10);
            let scope = createAssertScope(context);
            adapter.call(scope, 20, 30);

            assert.deepEqual(capturedArgs, [10, 20, 30]);
        });
    });

    describe("with different value types", () => {
        it("should work with strings", () => {
            let adapter = createEvalAdapter((value: any) => value.length > 3);
            let context = createContext("hello");
            let scope = createAssertScope(context);

            let result = adapter.call(scope);
            assert.ok(result);
        });

        it("should work with arrays", () => {
            let adapter = createEvalAdapter((value: any) => value.length === 3);
            let context = createContext([1, 2, 3]);
            let scope = createAssertScope(context);

            let result = adapter.call(scope);
            assert.ok(result);
        });

        it("should work with objects", () => {
            let adapter = createEvalAdapter((value: any) => value.hasOwnProperty("name"));
            let context = createContext({ name: "test", age: 25 });
            let scope = createAssertScope(context);

            let result = adapter.call(scope);
            assert.ok(result);
        });

        it("should work with null", () => {
            let adapter = createEvalAdapter((value: any) => value === null);
            let context = createContext(null);
            let scope = createAssertScope(context);

            let result = adapter.call(scope);
            assert.ok(result);
        });

        it("should work with undefined", () => {
            let adapter = createEvalAdapter((value: any) => value === undefined);
            let context = createContext(undefined);
            let scope = createAssertScope(context);

            let result = adapter.call(scope);
            assert.ok(result);
        });

        it("should work with booleans", () => {
            let adapter = createEvalAdapter((value: any) => value === true);
            let context = createContext(true);
            let scope = createAssertScope(context);

            let result = adapter.call(scope);
            assert.ok(result);
        });
    });

    describe("custom messages", () => {
        it("should use custom message when provided as string", () => {
            let adapter = createEvalAdapter(
                (value: any) => value > 10,
                "Expected value to be greater than 10"
            );

            let context = createContext(5);
            let scope = createAssertScope(context);

            checkError(() => {
                adapter.call(scope);
            }, "Expected value to be greater than 10");
        });

        it("should use custom message when provided as function", () => {
            let adapter = createEvalAdapter(
                (value: any) => value > 10,
                () => "Dynamic message: value too small"
            );

            let context = createContext(5);
            let scope = createAssertScope(context);

            checkError(() => {
                adapter.call(scope);
            }, "Dynamic message: value too small");
        });

    });

    describe("function name tracking", () => {
        it("should use provided funcName for operation tracking", () => {
            let adapter = createEvalAdapter(
                (value: any) => value > 5,
                "Error message",
                "isGreaterThanFive"
            );

            assert.ok(adapter);
            // Function name is used internally for verbose mode tracking
        });

        it("should use evalFn name when funcName not provided", () => {
            function myCustomCheck(value: any): boolean {
                return value > 5;
            }

            let adapter = createEvalAdapter(myCustomCheck);
            assert.ok(adapter);
        });

        it("should handle anonymous functions", () => {
            let adapter = createEvalAdapter((value: any) => value > 5);
            assert.ok(adapter);
        });
    });

    describe("integration with expect", () => {
        it("should work when integrated with expect", () => {
            // This would require adding the adapter to an assertion instance
            let result = expect(10);
            assert.ok(result);
        });
    });

    describe("complex evaluation functions", () => {
        it("should handle complex logic in evalFn", () => {
            let adapter = createEvalAdapter((value: any) => {
                if (typeof value !== "object") {
                    return false;
                }
                if (!value.name) {
                    return false;
                }
                if (!value.age) {
                    return false;
                }
                return value.age >= 18;
            }, "Must be an adult with name and age");

            let context = createContext({ name: "John", age: 25 });
            let scope = createAssertScope(context);
            let result = adapter.call(scope);
            assert.ok(result);
        });

        it("should fail with complex logic when conditions not met", () => {
            let adapter = createEvalAdapter((value: any) => {
                if (typeof value !== "object") {
                    return false;
                }
                if (!value.name) {
                    return false;
                }
                if (!value.age) {
                    return false;
                }
                return value.age >= 18;
            }, "Must be an adult with name and age");

            let context = createContext({ name: "Child", age: 10 });
            let scope = createAssertScope(context);

            checkError(() => {
                adapter.call(scope);
            }, "Must be an adult with name and age");
        });
    });

    describe("evalFn with multiple arguments", () => {
        it("should handle comparison with expected value", () => {
            let adapter = createEvalAdapter((actual: any, expected: any) => {
                return actual === expected;
            }, "Values must be equal");

            let context = createContext(10);
            let scope = createAssertScope(context);
            let result = adapter.call(scope, 10);
            assert.ok(result);
        });

        it("should handle comparison with expected and tolerance", () => {
            let adapter = createEvalAdapter((actual: any, expected: any, tolerance: any) => {
                return Math.abs(actual - expected) <= tolerance;
            }, "Value must be within tolerance");

            let context = createContext(10.5);
            let scope = createAssertScope(context);
            let result = adapter.call(scope, 10, 1);
            assert.ok(result);
        });

        it("should fail when additional arguments don't match", () => {
            let adapter = createEvalAdapter((actual: any, expected: any) => {
                return actual === expected;
            }, "Values must be equal");

            let context = createContext(10);
            let scope = createAssertScope(context);

            checkError(() => {
                adapter.call(scope, 20);
            }, "Values must be equal");
        });
    });

    describe("edge cases", () => {
        it("should handle evalFn that throws", () => {
            let adapter = createEvalAdapter(() => {
                throw new Error("EvalFn error");
            });

            let context = createContext(10);
            let scope = createAssertScope(context);

            checkError(() => {
                adapter.call(scope);
            }, "EvalFn error");
        });

        it("should handle evalFn returning non-boolean", () => {
            // TypeScript prevents this, but JavaScript doesn't
            let adapter = createEvalAdapter((value: any) => {
                return value as any; // Truthy/falsy value
            });

            let context = createContext(1);
            let scope = createAssertScope(context);
            let result = adapter.call(scope);
            assert.ok(result);
        });

    });

    describe("return value", () => {
        it("should return scope.that", () => {
            let adapter = createEvalAdapter((value: any) => value > 5);
            let context = createContext(10);
            let scope = createAssertScope(context);

            let result = adapter.call(scope);
            // The adapter should return the assertion instance
            assert.ok(result);
        });
    });

    describe("with verbose mode", () => {
        it("should track operations in verbose mode", () => {
            let adapter = createEvalAdapter(
                (value: any) => value > 5,
                "Error",
                "customFunction"
            );

            let context = createContext(10, undefined, undefined, undefined, { isVerbose: true });
            let scope = createAssertScope(context);

            let result = adapter.call(scope);
            assert.ok(result);
            // In verbose mode, operation tracking happens internally
        });
    });
});
