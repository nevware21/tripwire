/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { hasSymbolFunc, hasOwnSymbolFunc } from "../../../../src/assert/funcs/hasSymbol";
import { createContext } from "../../../../src/assert/scopeContext";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { checkError } from "../../support/checkError";
import { assert } from "../../../../src/assert/assertClass";

describe("hasSymbolFunc", () => {
    const testSymbol = Symbol("test");
    const testSymbol2 = Symbol("test2");

    describe("basic functionality", () => {
        it("should pass when object has the specified symbol property", () => {
            let obj: any = {};
            obj[testSymbol] = "value";

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });

        it("should fail when object does not have the specified symbol property", () => {
            let obj = {};

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            checkError(() => {
                fn.call(scope);
            }, /expected/);
        });

        it("should pass when object has the symbol property with specific value", () => {
            let obj: any = {};
            obj[testSymbol] = 42;

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });
    });

    describe("with different value types", () => {
        it("should fail when value is null", () => {
            let context = createContext(null);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            checkError(() => {
                fn.call(scope);
            }, /expected/);
        });

        it("should fail when value is undefined", () => {
            let context = createContext(undefined);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            checkError(() => {
                fn.call(scope);
            }, /expected/);
        });

        it("should work with array having symbol property", () => {
            let arr: any = [1, 2, 3];
            arr[testSymbol] = "array value";

            let context = createContext(arr);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });

        it("should work with function having symbol property", () => {
            let func: any = function() {};
            func[testSymbol] = "function value";

            let context = createContext(func);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });

        it("should work with class instance having symbol property", () => {
            class TestClass {
                [testSymbol]: string = "class value";
            }
            let instance = new TestClass();

            let context = createContext(instance);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });
    });

    describe("property result operation", () => {
        it("should return property result with the symbol value", () => {
            let obj: any = {};
            obj[testSymbol] = "test value";

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });
    });

    describe("custom messages", () => {
        it("should use custom error message when provided", () => {
            let obj = {};

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol);
            
            checkError(() => {
                fn.call(scope, "Custom symbol error");
            }, /Custom symbol error/);
        });
    });

    describe("multiple symbols", () => {
        it("should correctly identify different symbols", () => {
            let obj: any = {};
            obj[testSymbol] = "value1";
            obj[testSymbol2] = "value2";

            let context1 = createContext(obj);
            let scope1 = createAssertScope(context1);
            let fn1 = hasSymbolFunc(testSymbol);
            let result1 = fn1.call(scope1);
            assert.ok(result1);

            let context2 = createContext(obj);
            let scope2 = createAssertScope(context2);
            let fn2 = hasSymbolFunc(testSymbol2);
            let result2 = fn2.call(scope2);
            assert.ok(result2);
        });

        it("should fail when checking for non-existent symbol", () => {
            let obj: any = {};
            obj[testSymbol] = "value1";

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasSymbolFunc(testSymbol2);
            
            checkError(() => {
                fn.call(scope);
            }, /expected/);
        });
    });
});

describe("hasOwnSymbolFunc", () => {
    const testSymbol = Symbol("test");
    const testSymbol2 = Symbol("test2");

    describe("basic functionality", () => {
        it("should pass when object has its own symbol property", () => {
            let obj: any = {};
            obj[testSymbol] = "value";

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });

        it("should fail when object does not have the specified own symbol property", () => {
            let obj = {};

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            checkError(() => {
                fn.call(scope);
            }, /expected/);
        });

        it("should fail when symbol property is inherited", () => {
            let proto: any = {};
            proto[testSymbol] = "inherited value";
            
            let obj = Object.create(proto);

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            checkError(() => {
                fn.call(scope);
            }, /expected/);
        });
    });

    describe("with different value types", () => {
        it("should fail when value is null", () => {
            let context = createContext(null);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            checkError(() => {
                fn.call(scope);
            }, /expected/);
        });

        it("should fail when value is undefined", () => {
            let context = createContext(undefined);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            checkError(() => {
                fn.call(scope);
            }, /expected/);
        });

        it("should work with array having own symbol property", () => {
            let arr: any = [1, 2, 3];
            arr[testSymbol] = "array value";

            let context = createContext(arr);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });

        it("should work with function having own symbol property", () => {
            let func: any = function() {};
            func[testSymbol] = "function value";

            let context = createContext(func);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });
    });

    describe("property result operation", () => {
        it("should return property result with the symbol value", () => {
            let obj: any = {};
            obj[testSymbol] = "test value";

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });

        it("should handle undefined symbol values", () => {
            let obj: any = {};
            obj[testSymbol] = undefined;

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });
    });

    describe("custom messages", () => {
        it("should use custom error message when provided", () => {
            let obj = {};

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            checkError(() => {
                fn.call(scope, "Custom own symbol error");
            }, /Custom own symbol error/);
        });
    });

    describe("own vs inherited properties", () => {
        it("should pass for own property but fail for inherited", () => {
            let proto: any = {};
            proto[testSymbol2] = "inherited";
            
            let obj: any = Object.create(proto);
            obj[testSymbol] = "own";

            // Should pass for own symbol
            let context1 = createContext(obj);
            let scope1 = createAssertScope(context1);
            let fn1 = hasOwnSymbolFunc(testSymbol);
            let result1 = fn1.call(scope1);
            assert.ok(result1);

            // Should fail for inherited symbol
            let context2 = createContext(obj);
            let scope2 = createAssertScope(context2);
            let fn2 = hasOwnSymbolFunc(testSymbol2);
            checkError(() => {
                fn2.call(scope2);
            }, /expected/);
        });

        it("should work with Object.defineProperty", () => {
            let obj = {};
            Object.defineProperty(obj, testSymbol, {
                value: "defined value",
                writable: true,
                enumerable: false,
                configurable: true
            });

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(testSymbol);
            
            let result = fn.call(scope);
            assert.ok(result);
        });
    });

    describe("edge cases", () => {
        it("should handle well-known symbols", () => {
            let obj: any = {};
            obj[Symbol.iterator] = function*() {
                yield 1;
                yield 2;
            };

            let context = createContext(obj);
            let scope = createAssertScope(context);
            let fn = hasOwnSymbolFunc(Symbol.iterator);
            
            let result = fn.call(scope);
            assert.ok(result);
        });

        it("should handle symbols with same description but different identity", () => {
            const sym1 = Symbol("test");
            const sym2 = Symbol("test");
            
            let obj: any = {};
            obj[sym1] = "value1";

            let context = createContext(obj);
            let scope = createAssertScope(context);
            
            // Should pass for sym1
            let fn1 = hasOwnSymbolFunc(sym1);
            let result1 = fn1.call(scope);
            assert.ok(result1);

            // Should fail for sym2 (even though descriptions are same)
            let fn2 = hasOwnSymbolFunc(sym2);
            checkError(() => {
                fn2.call(scope);
            }, /expected/);
        });
    });
});
