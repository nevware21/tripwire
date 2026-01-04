/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { getScopeContext, createContext } from "../../../src/assert/scopeContext";
import { expect } from "../../../src/assert/expect";
import { createAssertScope } from "../../../src/assert/assertScope";

describe("getScopeContext", () => {
    it("should return the same context if value is already a context", () => {
        let context = createContext("test");
        let result = getScopeContext(context);
        
        assert.strictEqual(result, context);
    });

    it("should return context from IAssertInst", () => {
        let inst = expect(42);
        let context = getScopeContext(inst);
        
        assert.ok(context);
        assert.equal(context.value, 42);
    });

    it("should return context from IAssertScope", () => {
        let originalContext = createContext("test");
        let scope = createAssertScope(originalContext);
        let result = getScopeContext(scope);
        
        assert.strictEqual(result, originalContext);
    });

    it("should create a new context for plain values", () => {
        let context = getScopeContext(42);
        
        assert.ok(context);
        assert.equal(context.value, 42);
    });

    it("should create a new context for null", () => {
        let context = getScopeContext(null);
        
        assert.ok(context);
        assert.equal(context.value, null);
    });

    it("should create a new context for undefined", () => {
        let context = getScopeContext(undefined);
        
        assert.ok(context);
        assert.equal(context.value, undefined);
    });

    it("should create a new context for objects", () => {
        let obj = { a: 1, b: 2 };
        let context = getScopeContext(obj);
        
        assert.ok(context);
        assert.strictEqual(context.value, obj);
    });

    it("should create a new context for arrays", () => {
        let arr = [1, 2, 3];
        let context = getScopeContext(arr);
        
        assert.ok(context);
        assert.strictEqual(context.value, arr);
    });

    it("should create a new context for strings", () => {
        let context = getScopeContext("hello");
        
        assert.ok(context);
        assert.equal(context.value, "hello");
    });

    it("should create a new context for numbers", () => {
        let context = getScopeContext(3.14);
        
        assert.ok(context);
        assert.equal(context.value, 3.14);
    });

    it("should create a new context for booleans", () => {
        let trueContext = getScopeContext(true);
        let falseContext = getScopeContext(false);
        
        assert.ok(trueContext);
        assert.equal(trueContext.value, true);
        
        assert.ok(falseContext);
        assert.equal(falseContext.value, false);
    });

    it("should handle nested expect instances", () => {
        let inst1 = expect(10);
        let inst2 = expect(inst1);
        
        let context1 = getScopeContext(inst1);
        let context2 = getScopeContext(inst2);
        
        assert.ok(context1);
        assert.ok(context2);
        // They should have different contexts
    });

    it("should work with chained expect operations", () => {
        let inst = expect(10).to.be.equal(10);
        let context = getScopeContext(inst);
        
        assert.ok(context);
    });

    it("should create different contexts for different values", () => {
        let context1 = getScopeContext(1);
        let context2 = getScopeContext(2);
        
        assert.notStrictEqual(context1, context2);
        assert.equal(context1.value, 1);
        assert.equal(context2.value, 2);
    });

    it("should handle functions as values", () => {
        let fn = () => "test";
        let context = getScopeContext(fn);
        
        assert.ok(context);
        assert.strictEqual(context.value, fn);
    });

    it("should handle symbols as values", () => {
        let sym = Symbol("test");
        let context = getScopeContext(sym);
        
        assert.ok(context);
        assert.strictEqual(context.value, sym);
    });

    it("should handle Date objects", () => {
        let date = new Date();
        let context = getScopeContext(date);
        
        assert.ok(context);
        assert.strictEqual(context.value, date);
    });

    it("should handle RegExp objects", () => {
        let regex = /test/g;
        let context = getScopeContext(regex);
        
        assert.ok(context);
        assert.strictEqual(context.value, regex);
    });

    it("should handle Error objects", () => {
        let error = new Error("test");
        let context = getScopeContext(error);
        
        assert.ok(context);
        assert.strictEqual(context.value, error);
    });

    it("should handle Map objects", () => {
        let map = new Map([[1, "one"], [2, "two"]]);
        let context = getScopeContext(map);
        
        assert.ok(context);
        assert.strictEqual(context.value, map);
    });

    it("should handle Set objects", () => {
        let set = new Set([1, 2, 3]);
        let context = getScopeContext(set);
        
        assert.ok(context);
        assert.strictEqual(context.value, set);
    });

    it("should handle WeakMap objects", () => {
        let weakMap = new WeakMap();
        let context = getScopeContext(weakMap);
        
        assert.ok(context);
        assert.strictEqual(context.value, weakMap);
    });

    it("should handle WeakSet objects", () => {
        let weakSet = new WeakSet();
        let context = getScopeContext(weakSet);
        
        assert.ok(context);
        assert.strictEqual(context.value, weakSet);
    });

    it("should handle Promise objects", () => {
        let promise = Promise.resolve(42);
        let context = getScopeContext(promise);
        
        assert.ok(context);
        assert.strictEqual(context.value, promise);
    });

    it("should return valid context with all standard methods", () => {
        let context = getScopeContext("test");
        
        assert.ok(context);
        assert.isFunction(context.getMessage);
        assert.isFunction(context.getEvalMessage);
        assert.isFunction(context.getDetails);
        assert.isFunction(context.eval);
        assert.isFunction(context.fail);
        assert.isFunction(context.setOp);
        assert.isFunction(context.get);
        assert.isFunction(context.set);
        assert.isFunction(context.keys);
        assert.isFunction(context.new);
    });

    it("should return context with correct value property", () => {
        let values = [null, undefined, 0, "", false, [], {}, "test", 42, true];
        
        values.forEach(val => {
            let context = getScopeContext(val);
            assert.ok(context);
            if (val !== val) { // Handle NaN
                assert.ok(context.value !== context.value);
            } else {
                assert.strictEqual(context.value, val);
            }
        });
    });

    it("should handle NaN value", () => {
        let context = getScopeContext(NaN);
        
        assert.ok(context);
        assert.ok(context.value !== context.value); // NaN !== NaN
    });

    it("should handle Infinity", () => {
        let context = getScopeContext(Infinity);
        
        assert.ok(context);
        assert.equal(context.value, Infinity);
    });

    it("should handle -Infinity", () => {
        let context = getScopeContext(-Infinity);
        
        assert.ok(context);
        assert.equal(context.value, -Infinity);
    });

    it("should handle BigInt values", () => {
        let bigInt = BigInt(9007199254740991);
        let context = getScopeContext(bigInt);
        
        assert.ok(context);
        assert.strictEqual(context.value, bigInt);
    });

    it("should work with expect().to chain", () => {
        let inst = expect(5).to;
        let context = getScopeContext(inst);
        
        assert.ok(context);
    });

    it("should work with expect().not chain", () => {
        let inst = expect(5).not;
        let context = getScopeContext(inst);
        
        assert.ok(context);
    });

    it("should work with expect().to.be chain", () => {
        let inst = expect(5).to.be;
        let context = getScopeContext(inst);
        
        assert.ok(context);
    });
});
