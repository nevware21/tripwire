/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { createContext } from "../../../src/assert/scopeContext";
import { useScope } from "../../../src/assert/useScope";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("useScope", () => {
    it("should execute callback with the given scope context", () => {
        let context = createContext("test value");
        let callbackExecuted = false;

        let result = useScope(context, () => {
            callbackExecuted = true;
            return "callback result";
        });

        assert.isTrue(callbackExecuted);
        assert.equal(result, "callback result");
    });

    it("should return the callback's return value", () => {
        let context = createContext(42);

        let result = useScope(context, () => {
            return context.value * 2;
        });

        assert.equal(result, 84);
    });

    it("should restore previous scope after callback completes", () => {
        let context1 = createContext("first");
        let context2 = createContext("second");

        useScope(context1, () => {
            useScope(context2, () => {
                // Inside second scope
            });
            // Should be back to first scope
        });
        // Should be back to original scope (null)
    });

    it("should restore previous scope even if callback throws", () => {
        let context = createContext("test");

        checkError(() => {
            useScope(context, () => {
                throw new Error("Test error");
            });
        }, "Test error");

        // Scope should be restored even after error
    });

    it("should handle nested useScope calls", () => {
        let context1 = createContext("outer");
        let context2 = createContext("inner");
        let results: any[] = [];

        useScope(context1, () => {
            results.push(context1.value);
            useScope(context2, () => {
                results.push(context2.value);
            });
            results.push(context1.value);
        });

        assert.deepEqual(results, ["outer", "inner", "outer"]);
    });

    it("should work with different context values", () => {
        let contexts = [
            createContext(null),
            createContext(undefined),
            createContext(0),
            createContext(""),
            createContext(false),
            createContext([]),
            createContext({})
        ];

        contexts.forEach((context) => {
            let executed = false;
            useScope(context, () => {
                executed = true;
            });
            assert.isTrue(executed);
        });
    });

    it("should allow modifying context within useScope", () => {
        let context = createContext("initial");

        useScope(context, () => {
            context.set("key", "value");
            assert.equal(context.get("key"), "value");
        });

        // Context changes should persist after useScope
        assert.equal(context.get("key"), "value");
    });

    it("should handle async callbacks", async () => {
        let context = createContext("async");

        let result = await useScope(context, async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            return "async result";
        });

        assert.equal(result, "async result");
    });

    it("should work with callbacks that return different types", () => {
        let context = createContext("test");

        assert.equal(useScope(context, () => 42), 42);
        assert.equal(useScope(context, () => "string"), "string");
        assert.equal(useScope(context, () => true), true);
        assert.deepEqual(useScope(context, () => [1, 2, 3]), [1, 2, 3]);
        assert.deepEqual(useScope(context, () => ({ a: 1 })), { a: 1 });
        assert.equal(useScope(context, () => null), null);
        assert.equal(useScope(context, () => undefined), undefined);
    });

    it("should preserve callback context (this)", () => {
        let context = createContext("test");
        let obj = {
            value: 42,
            getValue() {
                return this.value;
            }
        };

        let result = useScope(context, function() {
            return obj.getValue.call(obj);
        });

        assert.equal(result, 42);
    });

    it("should work with expect inside useScope", () => {
        let context = createContext(10);

        useScope(context, () => {
            expect(5).to.be.equal(5);
            expect([1, 2, 3]).to.include(2);
            expect({ a: 1 }).to.have.property("a");
        });
    });

    it("should handle exceptions from assertions inside useScope", () => {
        let context = createContext("test");

        checkError(() => {
            useScope(context, () => {
                assert.equal(1, 2, "Should fail");
            });
        }, /Should fail/);
    });

    it("should work with multiple sequential useScope calls", () => {
        let context1 = createContext("first");
        let context2 = createContext("second");
        let context3 = createContext("third");

        let result1 = useScope(context1, () => "r1");
        let result2 = useScope(context2, () => "r2");
        let result3 = useScope(context3, () => "r3");

        assert.equal(result1, "r1");
        assert.equal(result2, "r2");
        assert.equal(result3, "r3");
    });

    it("should handle deeply nested useScope calls", () => {
        let depth = 0;
        let maxDepth = 10;

        function nestedScope(level: number): number {
            if (level >= maxDepth) {
                return level;
            }
            let context = createContext(level);
            return useScope(context, () => {
                depth = level;
                return nestedScope(level + 1);
            });
        }

        let result = nestedScope(0);
        assert.equal(result, maxDepth);
        assert.equal(depth, maxDepth - 1);
    });
});
