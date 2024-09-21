/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IScopeContext } from "./IScopeContext";
import { IAssertInst } from "./IAssertInst";
import { MsgSource } from "./types";

/**
 * The `IAssert` interface defines the methods for performing assertions.
 * This interface is used to ensure that certain conditions hold true during runtime.
 * If an assertion fails, an {@link AssertionFailure} is thrown with an optional message.
 * @since 0.1.0
 * @group Assert
 */
export interface IAssertClass<AssertInst extends IAssertInst = IAssertInst> {
    /**
     * Throws an {@link AssertionFailure} with the given message if `expr` is falsy.
     * This method is used to assert that an expression evaluates to a truthy value.
     * @param expr - The expression to evaluate. If the expression is falsy, an {@link AssertionFailure} is thrown.
     * @param initMsg - The message to display if `expr` is falsy. This can be a string or a function returning a string.
     * @asserts That the `expr` is truthy and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert(true); // Passes
     * assert(1); // Passes
     * assert("a"); // Passes
     * assert([]); // Passes
     * assert({}); // Passes
     * assert(new Map()); // Passes
     * assert(new Set()); // Passes
     * assert(new Date()); // Passes
     * assert(false); // Throws AssertionFailure
     * assert(0); // Throws AssertionFailure
     * assert(""); // Throws AssertionFailure
     * assert(null); // Throws AssertionFailure
     * assert(undefined); // Throws AssertionFailure
     * ```
     */
    (expr: any, initMsg?: MsgSource): AssertInst;

    /**
     * Throws an {@link AssertionFailure} exception with then given message and includes
     * the `actual` and `expected` and `operator` in the properties of the exception.
     * This bypases the normal evaluation and will ALWAYS throw an exception, it does not
     * perform any evaluation.
     * @param actual - The actual value
     * @param expected - The expected value
     * @param failMsg - The optional message to include in the exception for the failure.
     * @param operator - The operator used in the evaluation
     */
    (actual: any, expected: any, failMsg?: MsgSource, operator?: string): never;
        

    /**
     * Returns the last executed {@link IScopeContext} of the assertion chain of the immediately preceeding
     * assertion operation. Does not support asynchronous operations as it is always overwritten by the last
     * evaluated scope, used primarily to provide additional context for the error message during unexpected
     * "pass" conditions.
     */
    readonly _$lastContext: IScopeContext;

    /**
     * Throws an {@link AssertionFailure} with the given message.
     * This method is used to explicitly fail an assertion with a custom message.
     * @param initMsg - The message to display. This can be a string or a function returning a string.
     * @throws {@link AssertionFailure} - Always.
     * @example
     * ```typescript
     * assert.fail(); // Throws AssertionFailure
     * assert.fail("Hello Darkness, my old friend"); // Throws AssertionFailure
     * assert.fail(() => "Looks like we have failed again"); // Throws AssertionFailure
     * ```
     */
    fail(initMsg?: MsgSource): never;

    /**
     * Throws an {@link AssertionFailure} with the given message and optional details
     * which are obtained via the `getDetails` function.
     * @param actual - The actual value that was expected
     * @param expected - The expected value that was not found
     * @param failMsg - The message to display.
     * @param operator - The optional operator used in the comparison
     * @throws {@link AssertionFailure} always
     * @example
     * ```typescript
     * assert.fail(1, 2, "Values are not equal"); // Throws AssertionFailure
     * assert.fail(1, 2, "Values are not equal", "=="); // Throws AssertionFailure
     * ```
     */
    fail(actual: any, expected: any, failMsg?: MsgSource, operator?: string): never;

    /**
     * Throws an {@link AssertionFatal} with the given message.
     * This method is used to explicitly fail an assertion with a custom message.
     * @param initMsg - The message to display. This can be a string or a function returning a string.
     * @throws {@link AssertionFatal} - Always.
     * @example
     * ```typescript
     * assert.fatal(); // Throws AssertionFatal
     * assert.fatal("Hello Darkness, my old friend"); // Throws AssertionFatal
     * assert.fatal(() => "Looks like we have failed again"); // Throws AssertionFatal
     * ```
     */
    fatal(initMsg?: MsgSource): never;

    /**
     * Throws an {@link AssertionFailure} with the given message if `value` is not truthy.
     * This method is used to assert that a value is truthy.
     * @param value - The value to evaluate. If the value is not truthy, an {@link AssertionFailure} is thrown.
     * @param initMsg - The message to display if `value` is not truthy. This can be a string or a function returning a string.
     * @template T - The type of the value.
     * @asserts That the `value` is truthy and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.ok(1); // Passes
     * assert.ok("a"); // Passes
     * assert.ok([]); // Passes
     * assert.ok({}); // Passes
     * assert.ok(new Map()); // Passes
     * assert.ok(new Set()); // Passes
     * assert.ok(new Date()); // Passes
     * assert.ok(true); // Passes
     * assert.ok(false); // Throws AssertionFailure
     * assert.ok(0, "Value should be truthy"); // Throws AssertionFailure with message "Value should be truthy"
     * assert.ok(""); // Throws AssertionFailure
     * assert.ok(null); // Throws AssertionFailure
     * assert.ok(undefined); // Throws AssertionFailure
     * ```
     */
    ok<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * Throws an {@link AssertionFailure} with the given message if `value` is not truthy.
     * This method is used to assert that a value is truthy.
     * @param value - The value to evaluate. If the value is not truthy, an {@link AssertionFailure} is thrown.
     * @param initMsg - The message to display if `value` is not truthy. This can be a string or a function returning a string.
     * @template T - The type of the value.
     * @asserts That the `value` is truthy and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isOk(1); // Passes
     * assert.isOk("a"); // Passes
     * assert.isOk([]); // Passes
     * assert.isOk({}); // Passes
     * assert.isOk(new Map()); // Passes
     * assert.isOk(new Set()); // Passes
     * assert.isOk(new Date()); // Passes
     * assert.isOk(true); // Passes
     * assert.isOk(false); // Throws AssertionFailure
     * assert.isOk(0, "Value should be truthy"); // Throws AssertionFailure with message "Value should be truthy"
     * assert.isOk(""); // Throws AssertionFailure
     * assert.isOk(null); // Throws AssertionFailure
     * assert.isOk(undefined); // Throws AssertionFailure
     * ```
     */
    isOk<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * Throws an {@link AssertionFailure} with the given message if `value` is not falsy.
     * This method is used to assert that a value is falsy.
     * @param value - The value to evaluate. If the value is not falsy, an {@link AssertionFailure} is thrown.
     * @param initMsg - The message to display if `value` is not falsy. This can be a string or a function returning a string.
     * @template T - The type of the value.
     * @asserts That the `value` is not truthy (falsy) and throws {@link AssertionFailure} if it is not.
     * @example
     * assert.isNotOk(0); // Passes
     * assert.isNotOk(1); // Throws AssertionFailure
     * assert.isNotOk(true); // Throws AssertionFailure
     * assert.isNotOk(false); // Passes
     * assert.isNotOk(null); // Passes
     * assert.isNotOk(undefined); // Passes
     * assert.isNotOk(""); // Passes
     * assert.isNotOk("a"); // Throws AssertionFailure
     * assert.isNotOk([]); // Throws AssertionFailure
     * assert.isNotOk([1, 2]); // Throws AssertionFailure
     * assert.isNotOk({}); // Throws AssertionFailure
     * assert.isNotOk({ a: 1 }); // Throws AssertionFailure
     * assert.isNotOk(new Map()); // Throws AssertionFailure
     * assert.isNotOk(new Map([["a", 1]])); // Throws AssertionFailure
     * assert.isNotOk(new Set()); // Throws AssertionFailure
     * assert.isNotOk(new Set([1, 2])); // Throws AssertionFailure
     * assert.isNotOk(new Date()); // Throws AssertionFailure
     */
    isNotOk<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a loose equality check (`==`) between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is not
     * equal to the `expected` value. To perform a strict equality check (`===`), use the
     * {@link assert.strictEqual} method.
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is not equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are loosely (`==`) equal and throws {@link AssertionFailure} if they are not.
     * @example
     * ```typescript
     * assert.equal(1, 1); // Passes
     * assert.equal(1, "1"); // Passes
     * assert.equal(1, 2); // Throws AssertionFailure
     * assert.equal("a", "a"); // Passes
     * assert.equal("a", "b"); // Throws AssertionFailure
     * assert.equal([1, 2], [1, 2]); // Throws AssertionFailure
     * assert.equal({ a: 1 }, { a: 1 }); // Throws AssertionFailure
     * assert.equal({ a: 1 }, { a: 1 }, "Objects are not equal"); // Throws AssertionFailure
     * assert.equal({ a: 1 }, { a: 2 }); // Throws AssertionFailure
     * assert.equal({ a: 1 }, { a: 2 }, "Objects are not equal"); // Throws AssertionFailure
     * assert.equal({ a: 1 }, { b: 1 }); // Throws AssertionFailure
     * assert.equal({ a: 1 }, { b: 1 }, "Objects are not equal"); // Throws AssertionFailure
     * assert.equal({ a: 1 }, { b: 2 }); // Throws AssertionFailure
     * assert.equal({ a: 1 }, { b: 2 }, "Objects are not equal"); // Throws AssertionFailure
     * ```
     */
    equal<T>(actual: T, expected: T | unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a loose equality check (`==`) between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is not
     * equal to the `expected` value. To perform a strict equality check (`===`), use the
     * {@link assert.strictEqual} method.
     * @template T - The type of the value.
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is not equal to `expected`.
     * @asserts That the `actual` and `expected` values are loosely (`==`) equal and throws {@link AssertionFailure} if they are not.
     * @alias equal
     * @example
     * ```typescript
     * assert.equals(1, 1); // Passes
     * assert.equals(1, "1"); // Passes
     * assert.equals(1, 2); // Throws AssertionFailure
     * assert.equals("a", "a"); // Passes
     * assert.equals("a", "b"); // Throws AssertionFailure
     * assert.equals([1, 2], [1, 2]); // Throws AssertionFailure
     * assert.equals({ a: 1 }, { a: 1 }); // Throws AssertionFailure
     * assert.equals({ a: 1 }, { a: 1 }, "Objects are not equal"); // Throws AssertionFailure
     * assert.equals({ a: 1 }, { a: 2 }); // Throws AssertionFailure
     * assert.equals({ a: 1 }, { a: 2 }, "Objects are not equal"); // Throws AssertionFailure
     * assert.equals({ a: 1 }, { b: 1 }); // Throws AssertionFailure
     * assert.equals({ a: 1 }, { b: 1 }, "Objects are not equal"); // Throws AssertionFailure
     * assert.equals({ a: 1 }, { b: 2 }); // Throws AssertionFailure
     * assert.equals({ a: 1 }, { b: 2 }, "Objects are not equal"); // Throws AssertionFailure
     * ```
     */
    equals<T>(actual: T, expected: T | unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a strict equality check (`===`) between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is not
     * exactly equal to the `expected` value. To perform a loose equality check (`==`), use
     * the {@link assert.equal} method.
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is not equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are strictly (`===`) equal and throws {@link AssertionFailure} if they are not.
     * @example
     * ```typescript
     * assert.strictEqual(1, 1); // Passes
     * assert.strictEqual(1, "1"); // Throws AssertionFailure
     * assert.strictEqual(1, 2); // Throws AssertionFailure
     * assert.strictEqual("a", "a"); // Passes
     * assert.strictEqual("a", "b"); // Throws AssertionFailure
     * assert.strictEqual([1, 2], [1, 2]); // Throws AssertionFailure
     * assert.strictEqual([1, 2], [1, 2], "Arrays are not equal"); // Throws AssertionFailure
     * assert.strictEqual({ a: 1 }, { a: 1 }); // Throws AssertionFailure
     * assert.strictEqual({ a: 1 }, { a: 1 }, "Objects are not equal"); // Throws AssertionFailure
     * assert.strictEqual({ a: 1 }, { a: 2 }); // Throws AssertionFailure
     * assert.strictEqual({ a: 1 }, { a: 2 }, "Objects are not equal"); // Throws AssertionFailure
     * assert.strictEqual({ a: 1 }, { b: 1 }); // Throws AssertionFailure
     * assert.strictEqual({ a: 1 }, { b: 1 }, "Objects are not equal"); // Throws AssertionFailure
     * assert.strictEqual({ a: 1 }, { b: 2 }); // Throws AssertionFailure
     * assert.strictEqual({ a: 1 }, { b: 2 }, "Objects are not equal"); // Throws AssertionFailure
     * ```
     */
    strictEqual<T>(actual: T, expected: T | unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a strict equality check (`===`) between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is not
     * exactly equal to the `expected` value. To perform a loose equality check (`==`), use
     * the {@link assert.equal} method.
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is not equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are strictly (`!==`) equal and throws {@link AssertionFailure} if they are not.
     * @alias strictEqual
     */
    strictEquals<T>(actual: T, expected: T | unknown, initMsg?: MsgSource): AssertInst;

  /**
     * Performs a strict in-equality check (`!==`) between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is not
     * exactly equal to the `expected` value. To perform a loose equality check (`==`), use
     * the {@link assert.equal} method.
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is not equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are strictly (`===`) equal and throws {@link AssertionFailure} if they are not.
     */
    notStrictEqual<T>(actual: T, expected: T | unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a deep equality check between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is not
     * deeply equal to the `expected` value. This method compares the values of all properties
     * of objects and elements of arrays.
     *
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is not deeply equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are deeply equal and throws {@link AssertionFailure} if they are not.
     * @example
     * assert.deepEqual({ a: 1 }, { a: 1 }); // Passes
     * assert.deepEqual({ a: 1 }, { a: 2 }); // Throws AssertionFailure
     * assert.deepEqual([1, 2], [1, 2]); // Passes
     * assert.deepEqual([1, 2], [2, 1]); // Throws AssertionFailure
     * assert.deepEqual({ a: { b: 1 } }, { a: { b: 1 } }); // Passes
     * assert.deepEqual({ a: { b: 1 } }, { a: { b: 2 } }); // Throws AssertionFailure
     * assert.deepEqual([{ a: 1 }], [{ a: 1 }]); // Passes
     * assert.deepEqual([{ a: 1 }], [{ a: 2 }]); // Throws AssertionFailure
     */
    deepEqual<T>(actual: T, expected: T | unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a deep equality check between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is not
     * deeply equal to the `expected` value. This method compares the values of all properties
     * of objects and elements of arrays.
     *
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is not deeply equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are deeply equal and throws {@link AssertionFailure} if they are not.
     * @alias deepEqual
     * @example
     * assert.deepEquals({ a: 1 }, { a: 1 }); // Passes
     * assert.deepEquals({ a: 1 }, { a: 2 }); // Throws AssertionFailure
     * assert.deepEquals([1, 2], [1, 2]); // Passes
     * assert.deepEquals([1, 2], [2, 1]); // Throws AssertionFailure
     * assert.deepEquals({ a: { b: 1 } }, { a: { b: 1 } }); // Passes
     * assert.deepEquals({ a: { b: 1 } }, { a: { b: 2 } }); // Throws AssertionFailure
     * assert.deepEquals([{ a: 1 }], [{ a: 1 }]); // Passes
     * assert.deepEquals([{ a: 1 }], [{ a: 2 }]); // Throws AssertionFailure
     */
    deepEquals<T>(actual: T, expected: T | unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a deep strict equality check between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is not
     * deeply strictly equal to the `expected` value. This method compares the values of all properties
     * of objects and elements of arrays, ensuring that both the values and their types are equal.
     *
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is not deeply strictly equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are deeply and strictly equal and throws {@link AssertionFailure} if they are not.
     * @example
     * ```typescript
     * assert.deepStrictEqual({ a: 1 }, { a: 1 }); // Passes
     * assert.deepStrictEqual({ a: 1 }, { a: "1" }); // Throws AssertionFailure
     * assert.deepStrictEqual([1, 2], [1, 2]); // Passes
     * assert.deepStrictEqual([1, 2], [2, 1]); // Throws AssertionFailure
     * assert.deepStrictEqual({ a: { b: 1 } }, { a: { b: 1 } }); // Passes
     * assert.deepStrictEqual({ a: { b: 1 } }, { a: { b: "1" } }); // Throws AssertionFailure
     * assert.deepStrictEqual([{ a: 1 }], [{ a: 1 }]); // Passes
     * assert.deepStrictEqual([{ a: 1 }], [{ a: "1" }]); // Throws AssertionFailure
     * ```
     */
    deepStrictEqual<T>(actual: T, expected: T | unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a deep strict equality check between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is not
     * deeply strictly equal to the `expected` value. This method compares the values of all properties
     * of objects and elements of arrays, ensuring that both the values and their types are equal.
     *
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is not deeply strictly equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are deeply and strictly equal and throws {@link AssertionFailure} if they are not.
     * @example
     * ```typescript
     * assert.deepStrictEquals({ a: 1 }, { a: 1 }); // Passes
     * assert.deepStrictEquals({ a: 1 }, { a: "1" }); // Throws AssertionFailure
     * assert.deepStrictEquals([1, 2], [1, 2]); // Passes
     * assert.deepStrictEquals([1, 2], [2, 1]); // Throws AssertionFailure
     * assert.deepStrictEquals({ a: { b: 1 } }, { a: { b: 1 } }); // Passes
     * assert.deepStrictEquals({ a: { b: 1 } }, { a: { b: "1" } }); // Throws AssertionFailure
     * assert.deepStrictEquals([{ a: 1 }], [{ a: 1 }]); // Passes
     * assert.deepStrictEquals([{ a: 1 }], [{ a: "1" }]); // Throws AssertionFailure
     * ```
     */
    deepStrictEquals<T>(actual: T, expected: T | unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Throws an {@link AssertionFailure} with the given message if `actual` is equal to `expected`.
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are not loosely (`!=`) equal and throws {@link AssertionFailure} if they are.
     * @example
     * assert.notEqual(1, 1); // Throws AssertionFailure
     * assert.notEqual(1, 2); // Passes
     * assert.notEqual("a", "a"); // Throws AssertionFailure
     * assert.notEqual("a", "b"); // Passes
     * assert.notEqual([1, 2], [1, 2]); // Passes
     * assert.notEqual([1, 2], [1, 2], "Arrays are equal"); // Throws AssertionFailure
     * assert.notEqual({ a: 1 }, { a: 1 }); // Passes
     * assert.notEqual({ a: 1 }, { a: 1 }, "Objects are equal"); // Throws AssertionFailure
     * assert.notEqual({ a: 1 }, { a: 2 }); // Passes
     * assert.notEqual({ a: 1 }, { a: 2 }, "Objects are equal"); // Throws AssertionFailure
     * assert.notEqual({ a: 1 }, { b: 1 }); // Passes
     * assert.notEqual({ a: 1 }, { b: 1 }, "Objects are equal"); // Throws AssertionFailure
     * assert.notEqual({ a: 1 }, { b: 2 }); // Passes
     * assert.notEqual({ a: 1 }, { b: 2 }, "Objects are equal"); // Throws AssertionFailure
     */
    notEqual<T>(actual: T, expected: T, initMsg?: MsgSource): AssertInst;

    /**
     * Throws an {@link AssertionFailure} with the given message if `actual` is equal to `expected`.
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are not loosely (`!=`) equal and throws {@link AssertionFailure} if they are.
     * @alias notEqual
     * @example
     * assert.notEquals(1, 1); // Throws AssertionFailure
     * assert.notEquals(1, 2); // Passes
     * assert.notEquals("a", "a"); // Throws AssertionFailure
     * assert.notEquals("a", "b"); // Passes
     * assert.notEquals([1, 2], [1, 2]); // Passes
     * assert.notEquals([1, 2], [1, 2], "Arrays are equal"); // Throws AssertionFailure
     * assert.notEquals({ a: 1 }, { a: 1 }); // Passes
     * assert.notEquals({ a: 1 }, { a: 1 }, "Objects are equal"); // Throws AssertionFailure
     * assert.notEquals({ a: 1 }, { a: 2 }); // Passes
     * assert.notEquals({ a: 1 }, { a: 2 }, "Objects are equal"); // Throws AssertionFailure
     * assert.notEquals({ a: 1 }, { b: 1 }); // Passes
     * assert.notEquals({ a: 1 }, { b: 1 }, "Objects are equal"); // Throws AssertionFailure
     * assert.notEquals({ a: 1 }, { b: 2 }); // Passes
     * assert.notEquals({ a: 1 }, { b: 2 }, "Objects are equal"); // Throws AssertionFailure
     */
    notEquals<T>(actual: T, expected: T, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a deep inequality check between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is
     * deeply equal to the `expected` value. This method compares the values of all properties
     * of objects and elements of arrays.
     *
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is deeply equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are not deeply equal and throws {@link AssertionFailure} if they are.
     * @example
     * ```typescript
     * assert.notDeepEqual({ a: 1 }, { a: 2 }); // Passes
     * assert.notDeepEqual({ a: 1 }, { a: 1 }); // Throws AssertionFailure
     * assert.notDeepEqual([1, 2], [2, 1]); // Passes
     * assert.notDeepEqual([1, 2], [1, 2]); // Throws AssertionFailure
     * assert.notDeepEqual({ a: { b: 1 } }, { a: { b: 2 } }); // Passes
     * assert.notDeepEqual({ a: { b: 1 } }, { a: { b: 1 } }); // Throws AssertionFailure
     * assert.notDeepEqual([{ a: 1 }], [{ a: 2 }]); // Passes
     * assert.notDeepEqual([{ a: 1 }], [{ a: 1 }]); // Throws AssertionFailure
     * ```
     */
    notDeepEqual<T>(actual: T, expected: T, initMsg?: MsgSource): AssertInst;

    /**
     * Performs a deep inequality check between the `actual` and `expected` values,
     * throwing an {@link AssertionFailure} with the given message when the `actual` value is
     * deeply equal to the `expected` value. This method compares the values of all properties
     * of objects and elements of arrays.
     *
     * @param actual - The actual value.
     * @param expected - The expected value.
     * @param initMsg - The message to display if `actual` is deeply equal to `expected`.
     * @template T - The type of the values.
     * @asserts That the `actual` and `expected` values are not deeply equal and throws {@link AssertionFailure} if they are.
     * @alias notDeepEqual
     * @example
     * ```typescript
     * assert.notDeepEquals({ a: 1 }, { a: 2 }); // Passes
     * assert.notDeepEquals({ a: 1 }, { a: 1 }); // Throws AssertionFailure
     * assert.notDeepEquals([1, 2], [2, 1]); // Passes
     * assert.notDeepEquals([1, 2], [1, 2]); // Throws AssertionFailure
     * assert.notDeepEquals({ a: { b: 1 } }, { a: { b: 2 } }); // Passes
     * assert.notDeepEquals({ a: { b: 1 } }, { a: { b: 1 } }); // Throws AssertionFailure
     * assert.notDeepEquals([{ a: 1 }], [{ a: 2 }]); // Passes
     * assert.notDeepEquals([{ a: 1 }], [{ a: 1 }]); // Throws AssertionFailure
     * ```
     */
    notDeepEquals<T>(actual: T, expected: T, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is `true`.
     *
     * This method checks if the provided value is strictly equal to `true`. If the value is not `true`,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is strictly `true` and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isTrue(true); // Passes
     * assert.isTrue(false); // Throws AssertionFailure
     * assert.isTrue(1); // Throws AssertionFailure
     * assert.isTrue("true"); // Throws AssertionFailure
     * ```
     */
    isTrue(value: unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is `false`.
     *
     * This method checks if the provided value is strictly equal to `false`. If the value is not `false`,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is strictly `false` and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isFalse(false); // Passes
     * assert.isFalse(true); // Throws AssertionFailure
     * assert.isFalse(0); // Throws AssertionFailure
     * assert.isFalse(""); // Throws AssertionFailure
     * ```
     */
    isFalse(value: unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is not `true`.
     *
     * This method checks if the provided value is not strictly equal to `true`. If the value is `true`,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is not strictly `true` and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotTrue(false); // Passes
     * assert.isNotTrue(0); // Passes
     * assert.isNotTrue(""); // Passes
     * assert.isNotTrue(true); // Throws AssertionFailure
     * ```
     */
    isNotTrue(value: unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is not `false`.
     *
     * This method checks if the provided value is not strictly equal to `false`. If the value is `false`,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is not strictly `false` and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotFalse(true); // Passes
     * assert.isNotFalse(1); // Passes
     * assert.isNotFalse("false"); // Passes
     * assert.isNotFalse(false); // Throws AssertionFailure
     * ```
     */
    isNotFalse(value: unknown, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is `null`.
     *
     * This method checks if the provided value is strictly equal to `null`. If the value is not `null`,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is strictly `null` and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isNull(null); // Passes
     * assert.isNull(undefined); // Throws AssertionFailure
     * assert.isNull(0); // Throws AssertionFailure
     * assert.isNull(""); // Throws AssertionFailure
     * ```
     */
    isNull<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is not `null`.
     *
     * This method checks if the provided value is not strictly equal to `null`. If the value is `null`,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is not strictly `null` and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotNull(1); // Passes
     * assert.isNotNull("string"); // Passes
     * assert.isNotNull(undefined); // Passes
     * assert.isNotNull(null); // Throws AssertionFailure
     * ```
     */
    isNotNull<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is strictly `undefined`.
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is strictly `undefined` and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isUndefined(undefined); // Passes
     * assert.isUndefined(null); // Throws AssertionFailure
     * assert.isUndefined(0); // Throws AssertionFailure
     * assert.isUndefined(""); // Throws AssertionFailure
     * ```
     */
    isUndefined<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is not strictly `undefined`.
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is not strictly `undefined` and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotUndefined(1); // Passes
     * assert.isNotUndefined("string"); // Passes
     * assert.isNotUndefined(null); // Passes
     * assert.isNotUndefined(undefined); // Throws AssertionFailure
     * ```
     */
    isNotUndefined<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the provided value is empty, for strings, arrays, and objects, it checks if their
     * length or size is zero. If the value is not empty, it throws an {@link AssertionFailure} with the
     * given message.
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is empty and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isEmpty(""); // Passes
     * assert.isEmpty([]); // Passes
     * assert.isEmpty({}); // Passes
     * assert.isEmpty("non-empty"); // Throws AssertionFailure
     * assert.isEmpty([1, 2, 3]); // Throws AssertionFailure
     * assert.isEmpty({ key: "value" }); // Throws AssertionFailure
     * ```
     */
    isEmpty(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the provided value is not empty, for strings, arrays, and objects, it checks if their
     * length or size is greater than zero. If the value is empty, it throws an {@link AssertionFailure} with the
     * given message.
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is not empty and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotEmpty("non-empty"); // Passes
     * assert.isNotEmpty([1, 2, 3]); // Passes
     * assert.isNotEmpty({ key: "value" }); // Passes
     * assert.isNotEmpty(""); // Throws AssertionFailure
     * assert.isNotEmpty([]); // Throws AssertionFailure
     * assert.isNotEmpty({}); // Throws AssertionFailure
     * ```
     */
    isNotEmpty(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the provided value is sealed and cannot have any new properties added to it.
     * If the value is not sealed, it throws an {@link AssertionFailure} with the given message.
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is sealed and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isSealed(Object.seal({})); // Passes
     * assert.isSealed(Object.seal([])); // Passes
     * assert.isSealed(Object.seal({ key: "value" })); // Passes
     * assert.isSealed({}); // Throws AssertionFailure
     * assert.isSealed([]); // Throws AssertionFailure
     * assert.isSealed({ key: "value" }); // Throws AssertionFailure
     * ```
     */
    isSealed(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the provided value is not sealed and can have new properties added to it.
     * If the value is sealed, it throws an {@link AssertionFailure} with the given message.
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is not sealed and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotSealed({}); // Passes
     * assert.isNotSealed([]); // Passes
     * assert.isNotSealed({ key: "value" }); // Passes
     * assert.isNotSealed(Object.seal({})); // Throws AssertionFailure
     * assert.isNotSealed(Object.seal([])); // Throws AssertionFailure
     * assert.isNotSealed(Object.seal({ key: "value" })); // Throws AssertionFailure
     * ```
     */
    isNotSealed(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the provided value is frozen and cannot have new properties added to it
     * and its existing properties cannot be removed. If the value is not frozen, it throws an
     * {@link AssertionFailure} with the given message.
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is frozen and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isFrozen(Object.freeze({})); // Passes
     * assert.isFrozen(Object.freeze([])); // Passes
     * assert.isFrozen(Object.freeze("string")); // Passes
     * assert.isFrozen(Object.freeze({ key: "value" })); // Passes
     * assert.isFrozen({}); // Throws AssertionFailure
     * assert.isFrozen([]); // Throws AssertionFailure
     * assert.isFrozen("string"); // Throws AssertionFailure
     * assert.isFrozen({ key: "value" }); // Throws AssertionFailure
     * ```
     */
    isFrozen(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the provided value is not frozen and can have new properties added to it
     * and its existing properties can be removed. If the value is frozen, it throws an
     * {@link AssertionFailure} with the given message.
     * @param value - The value to check.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is not frozen and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotFrozen({}); // Passes
     * assert.isNotFrozen([]); // Passes
     * assert.isNotFrozen("string"); // Passes
     * assert.isNotFrozen({ key: "value" }); // Passes
     * assert.isNotFrozen(Object.freeze({})); // Throws AssertionFailure
     * assert.isNotFrozen(Object.freeze([])); // Throws AssertionFailure
     * assert.isNotFrozen(Object.freeze("string")); // Throws AssertionFailure
     * assert.isNotFrozen(Object.freeze({ key: "value" })); // Throws AssertionFailure
     * ```
     */
    isNotFrozen(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * This method checks if the provided value is a function. If the value is not a function,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to evaluate.
     * @param initMsg - The message to display if `value` is not a function.
     * @asserts That the `value` is a function and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isFunction(() => {}); // Passes
     * assert.isFunction(function() {}); // Passes
     * assert.isFunction(async function() {}); // Passes
     * assert.isFunction(null); // Throws AssertionFailure
     * assert.isFunction(123); // Throws AssertionFailure
     * assert.isFunction("string"); // Throws AssertionFailure
     * ```
     */
    isFunction(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * This method checks if the provided value is not a function. If the value is a function,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to evaluate.
     * @param initMsg - The message to display if `value` is a function.
     * @asserts That the `value` is not a function and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotFunction(null); // Passes
     * assert.isNotFunction(123); // Passes
     * assert.isNotFunction("string"); // Passes
     * assert.isNotFunction(() => {}); // Throws AssertionFailure
     * assert.isNotFunction(function() {}); // Throws AssertionFailure
     * assert.isNotFunction(async function() {}); // Throws AssertionFailure
     * ```
     */
    isNotFunction(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * This method checks if the provided value is an object. If the value is not an object,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to evaluate.
     * @param initMsg - The message to display if `value` is not an object.
     * @asserts That the `value` is an object and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isObject({}); // Passes
     * assert.isObject([]); // Passes
     * assert.isObject(null); // Throws AssertionFailure
     * assert.isObject(123); // Throws AssertionFailure
     * assert.isObject("string"); // Throws AssertionFailure
     * ```
     */
    isObject<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * This method checks if the provided value is not an object. If the value is an object,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to evaluate.
     * @param initMsg - The message to display if `value` is an object.
     * @asserts That the `value` is not an object and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotObject(null); // Passes
     * assert.isNotObject(123); // Passes
     * assert.isNotObject("string"); // Passes
     * assert.isNotObject({}); // Throws AssertionFailure
     * assert.isNotObject([]); // Throws AssertionFailure
     * ```
     */
    isNotObject<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * This method checks if the provided value is a plain object. If the value is not a plain object,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * A plain object is an object created by the object literal `{}` or with `new Object()`.
     * It does not include instances of classes, arrays, or other objects.
     *
     * @param value - The value to evaluate.
     * @param initMsg - The message to display if `value` is not a plain object.
     * @asserts That the `value` is a plain object and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isPlainObject({}); // Passes
     * assert.isPlainObject(Object.create(null)); // Passes
     * assert.isPlainObject(new Object()); // Passes
     * assert.isPlainObject([]); // Throws AssertionFailure
     * assert.isPlainObject(null); // Throws AssertionFailure
     * assert.isPlainObject(123); // Throws AssertionFailure
     * assert.isPlainObject("string"); // Throws AssertionFailure
     * ```
     */
    isPlainObject<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * This method checks if the provided value is not a plain object. If the value is a plain object,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * A plain object is an object created by the object literal `{}` or with `new Object()`.
     * It does not include instances of classes, arrays, or other objects.
     *
     * @param value - The value to evaluate.
     * @param initMsg - The message to display if `value` is a plain object.
     * @asserts That the `value` is not a plain object and throws {@link AssertionFailure} if it is.
     * @example
     * ```typescript
     * assert.isNotPlainObject([]); // Passes
     * assert.isNotPlainObject(null); // Passes
     * assert.isNotPlainObject(123); // Passes
     * assert.isNotPlainObject("string"); // Passes
     * assert.isNotPlainObject({}); // Throws AssertionFailure
     * assert.isNotPlainObject(Object.create(null)); // Throws AssertionFailure
     * assert.isNotPlainObject(new Object()); // Throws AssertionFailure
     * ```
     */
    isNotPlainObject<T>(value: T, initMsg?: MsgSource): AssertInst;

    /**
     * This method checks if the provided value is an instance of the specified error or error constructor.
     * If the value is not an instance of the specified error or error constructor, it throws an {@link AssertionFailure}
     * with the given message.
     *
     * @param value - The value to evaluate.
     * @param errorLike - The error or error constructor to check against.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` is an instance of the specified error or error constructor and throws {@link AssertionFailure} if it is not.
     * @example
     * ```typescript
     * assert.isError(new Error()); // Passes
     * assert.isError(new TypeError(), TypeError); // Passes
     * assert.isError(new Error(), TypeError); // Throws AssertionFailure
     * assert.isError({}, Error); // Throws AssertionFailure
     * assert.isError(null, Error); // Throws AssertionFailure
     * ```
     */
    isError<T>(value: T, errorLike?: Error | ErrorConstructor, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the value is a string.
     * @param value - The value to check.
     * @param initMsg - The custom message to display if the assertion fails.
     * @throws {AssertionError} If the value is not a string.
     * @example
     * ```typescript
     * assert.isString("hello"); // Passes
     * assert.isString(123); // Throws AssertionError
     * assert.isString(null); // Throws AssertionError
     * assert.isString(undefined); // Throws AssertionError
     * ```
     */
    isString(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the value is not a string.
     * @param value - The value to check.
     * @param initMsg - The custom message to display if the assertion fails.
     * @throws {AssertionError} If the value is a string.
     * @example
     * ```typescript
     * assert.isNotString(123); // Passes
     * assert.isNotString({}); // Passes
     * assert.isNotString("hello"); // Throws AssertionError
     * assert.isNotString(null); // Passes
     * assert.isNotString(undefined); // Passes
     * ```
     */
    isNotString(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the value is an array.
     * @param value - The value to check.
     * @param initMsg - The custom message to display if the assertion fails.
     * @throws {AssertionError} If the value is not a number.
     * @example
     * ```typescript
     * assert.isArray([]); // Passes
     * assert.isArray([1, 2, 3]); // Passes
     * assert.isArray({}); // Throws AssertionError
     * assert.isArray(null); // Throws AssertionError
     * assert.isArray(undefined); // Throws AssertionError
     * ```
     */
    isArray(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the value is not an array.
     * @param value - The value to check.
     * @param initMsg - The custom message to display if the assertion fails.
     * @throws {AssertionError} If the value is an array.
     * @example
     * ```typescript
     * assert.isNotArray({}); // Passes
     * assert.isNotArray(123); // Passes
     * assert.isNotArray("hello"); // Passes
     * assert.isNotArray(null); // Passes
     * assert.isNotArray(undefined); // Passes
     * assert.isNotArray([]); // Throws AssertionError
     * assert.isNotArray([1, 2, 3]); // Throws AssertionError
     * ```
     */
    isNotArray(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts whether the value is extensible indicating whether
     * new properties can be added to it.
     * Primive values are not extensible.
     * @param value - The value to check.
     * @param initMsg - The custom message to display if the assertion fails.
     * @throws {AssertionError} If the value is not extensible.
     * @example
     * ```typescript
     * assert.isExtensible({}); // Passes
     * assert.isExtensible([]); // Passes
     * assert.isExtensible(Object.create(null)); // Passes
     * assert.isExtensible(Object.freeze({})); // Throws AssertionError
     * assert.isExtensible(Object.seal({})); // Throws AssertionError
     * ```
     */
    isExtensible(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts whether the value is not extensible indicating whether
     * new properties can be added to it.
     * Primive values are not extensible.
     * @param value - The value to check.
     * @param initMsg - The custom message to display if the assertion fails
     * @throws {AssertionError} If the value is extensible.
     * @example
     * ```typescript
     * assert.isNotExtensible(Object.freeze({})); // Passes
     * assert.isNotExtensible(Object.seal({})); // Passes
     * assert.isNotExtensible({}); // Throws AssertionError
     * assert.isNotExtensible([]); // Throws AssertionError
     * assert.isNotExtensible(Object.create(null)); // Throws AssertionError
     * ```
     */
    isNotExtensible(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is an iterable, meaning it has a
     * Symbol.iterator property.
     * @param value - The value to check.
     * @param initMsg - The custom message to display if the assertion fails.
     * @throws {AssertionError} If the value is not an iterable.
     * @example
     * ```typescript
     * assert.isIterable([]); // Passes
     * assert.isIterable(new Map()); // Passes
     * assert.isIterable(new Set()); // Passes
     * assert.isIterable({ [Symbol.iterator]: () => {} }); // Passes
     * assert.isIterable({}); // Throws AssertionError
     * assert.isIterable(null); // Throws AssertionError
     * assert.isIterable(undefined); // Throws AssertionError
     * ```
     */
    isIterable(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given value is not an iterable, meaning it does not have a
     * Symbol.iterator property.
     * @param value - The value to check.
     * @param initMsg - The custom message to display if the assertion fails.
     * @throws {AssertionError} If the value is an iterable.
     * @example
     * ```typescript
     * assert.isNotIterable({}); // Passes
     * assert.isNotIterable(null); // Passes
     * assert.isNotIterable(undefined); // Passes
     * assert.isNotIterable([]); // Throws AssertionError
     * assert.isNotIterable(new Map()); // Throws AssertionError
     * assert.isNotIterable(new Set()); // Throws AssertionError
     * assert.isNotIterable({ [Symbol.iterator]: () => {} }); // Throws AssertionError
     * ```
     */
     isNotIterable(value: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given function throws an error that matches the specified error constructor,
     * error instance, and / or the message includes the content or matches the regex pattern.
     * If the function does not throw an error, or if the thrown error does not
     * match the specified criteria, it throws an {@link AssertionFailure} with the given message.
     * Both the `errorLike` and `msgMatch` parameters are optional, so this method can be used to
     * assert that the function throws an error without checking the error type or message.
     * @param fn - The function to execute and check for thrown errors.
     * @param errorLike - The error constructor, error instance, or message pattern to check against.
     * @param msgMatch - The partial message  or pattern to check against the error message.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the function throws an error that matches the specified criteria and throws {@link AssertionFailure} if it does not.
     * @example
     * ```typescript
     * assert.throws(() => { throw new Error("test"); }); // Passes
     * assert.throws(() => { throw new TypeError("test"); }, TypeError); // Passes
     * assert.throws(() => { throw new Error("test"); }, /test/); // Passes
     * assert.throws(() => { throw new Error("test"); }, Error, "test"); // Passes
     * assert.throws(() => {}); // Throws AssertionFailure
     * assert.throws(() => { throw new Error("test"); }, TypeError); // Throws AssertionFailure
     * assert.throws(() => { throw new Error("test"); }, /nomatch/); // Throws AssertionFailure
     * ```
     */
    throws(fn: () => void, errorLike?: ErrorConstructor | Error | null, msgMatch?: string | RegExp | null, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the given function throws an error and that the message contains the content
     * or matches the regex pattern.
     * If the function does not throw an error, or if the thrown error does not
     * match the specified criteria, it throws an {@link AssertionFailure} with the given message.
     * The `msgMatch` parameter is optional, so this method can be used to assert that the
     * function throws an error without checking the error type or message.
     * @param fn - The function to execute and check for thrown errors.
     * @param msgMatch - The partial message  or pattern to check against the error message.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the function throws an error that matches the specified criteria and throws {@link AssertionFailure} if it does not.
     * @example
     * ```typescript
     * assert.throws(() => { throw new Error("test"); }); // Passes
     * assert.throws(() => { throw new TypeError("test"); }, TypeError); // Passes
     * assert.throws(() => { throw new Error("test"); }, /test/); // Passes
     * assert.throws(() => { throw new Error("test"); }, Error, "test"); // Passes
     * assert.throws(() => {}); // Throws AssertionFailure
     * assert.throws(() => { throw new Error("test"); }, TypeError); // Throws AssertionFailure
     * assert.throws(() => { throw new Error("test"); }, /nomatch/); // Throws AssertionFailure
     * ```
     */
    throws(fn: () => void, msgMatch?: string | RegExp | null, initMsg?: MsgSource): AssertInst;
    
    /**
     * Asserts that the provided value matches the specified regular expression.
     * If the value does not match the regular expression, it throws an {@link AssertionFailure}
     * with the given message.
     *
     * @param value - The value to evaluate.
     * @param regexp - The regular expression to match against.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` matches the regular expression and throws {@link AssertionFailure} if it does not.
     * @example
     * ```typescript
     * assert.match("hello world", /hello/); // Passes
     * assert.match("hello world", /^hello world$/); // Passes
     * assert.match("hello world", /world$/); // Passes
     * assert.match("hello world", /nomatch/); // Throws AssertionFailure
     * ```
     */
    match<T>(value: T, regexp: RegExp, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the provided value includes the specified `match`. The value can be
     * a string, array, or any other type that supports the `includes` method. If the
     * value does not include the match, it throws an {@link AssertionFailure} with the given message.
     *
     * @param value - The value to evaluate.
     * @param match - The value to check for inclusion.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` includes the `match` and throws {@link AssertionFailure} if it does not.
     * @example
     * ```typescript
     * assert.includes("hello world", "world"); // Passes
     * assert.includes([1, 2, 3], 2); // Passes
     * assert.includes("hello world", "nomatch"); // Throws AssertionFailure
     * assert.includes([1, 2, 3], 4); // Throws AssertionFailure
     * ```
     */
    includes<T>(value: T, match: any, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the provided value has the specified property. If the value does
     * not have the property, it throws an {@link AssertionFailure} with the given message.
     *
     * @param target - The value to evaluate.
     * @param name - The name of the property to check for.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` has the specified property and throws {@link AssertionFailure} if it does not.
     * @example
     * ```typescript
     * assert.hasProperty({ a: 1, b: 2 }, "a"); // Passes
     * assert.hasProperty({ a: 1, b: 2 }, "b"); // Passes
     * assert.hasProperty({ a: 1, b: 2 }, "c"); // Throws AssertionFailure
     * assert.hasProperty([1, 2, 3], "length"); // Passes
     * assert.hasProperty([1, 2, 3], "nomatch"); // Throws AssertionFailure
     * ```
     */
    hasProperty<T>(target: T, name: string, value?: T[keyof T] | undefined, initMsg?: MsgSource): AssertInst;

    /**
     * Asserts that the provided value has the specified own property (i.e., a
     * property that is not inherited). If the value does not have the own property,
     * it throws an {@link AssertionFailure} with the given message.
     *
     * @param target - The value to evaluate.
     * @param name - The name of the own property to check for.
     * @param initMsg - The message to display if the assertion fails.
     * @asserts That the `value` has the specified own property and throws {@link AssertionFailure} if it does not.
     * @example
     * ```typescript
     * assert.hasOwnProperty({ a: 1, b: 2 }, "a"); // Passes
     * assert.hasOwnProperty({ a: 1, b: 2 }, "b"); // Passes
     * assert.hasOwnProperty({ a: 1, b: 2 }, "c"); // Throws AssertionFailure
     * assert.hasOwnProperty(Object.create({ a: 1 }), "a"); // Throws AssertionFailure
     * ```
     */
    hasOwnProperty<T>(target: T, name: string, value?: T[keyof T] | undefined, initMsg?: MsgSource): AssertInst;
}

export type IExtendedAssert<T = any> = IAssertClass<IAssertInst & T> & T;