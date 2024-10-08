/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "@nevware21/tripwire";

export interface Constructor<T> {
    new(...args: any[]): T;
}

export type Operator = string; // "==" | "===" | ">" | ">=" | "<" | "<=" | "!=" | "!==";

export type OperatorComparable = boolean | null | number | string | undefined | Date;

export interface IChaiAssert {
    /**
     * @param expression    Expression to test for truthiness.
     * @param message    Message to display on error.
     */
    (expression: any, message?: MsgSource): asserts expression;

    /**
     * Throws a failure.
     *
     * @param message    Message to display on error.
     * @remarks Node.js assert module-compatible.
     */
    fail(message?: MsgSource): never;

    /**
     * Throws a failure.
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message    Message to display on error.
     * @param operator   Comparison operator, if not strict equality.
     * @remarks Node.js assert module-compatible.
     */
    fail<T>(actual: T, expected: T, message?: MsgSource, operator?: Operator): never;

    /**
     * Asserts that object is truthy.
     *
     * @param value   Object to test.
     * @param message    Message to display on error.
     */
    isOk(value: unknown, message?: MsgSource): asserts value;

    /**
     * Asserts that object is truthy.
     *
     * @param value   Object to test.
     * @param message    Message to display on error.
     */
    ok(value: unknown, message?: MsgSource): asserts value;

    /**
     * Asserts that object is falsy.
     *
     * T   Type of object.
     * @param value   Object to test.
     * @param message    Message to display on error.
     */
    isNotOk<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that object is falsy.
     *
     * T   Type of object.
     * @param value   Object to test.
     * @param message    Message to display on error.
     */
    notOk<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts non-strict equality (==) of actual and expected.
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message   Message to display on error.
     */
    equal<T>(actual: T, expected: T, message?: MsgSource): void;

    /**
     * Asserts non-strict equality (==) of actual and expected.
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message   Message to display on error.
     */
    equals<T>(actual: T, expected: T, message?: MsgSource): void;

    /**
     * Asserts non-strict equality (==) of actual and expected.
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message   Message to display on error.
     */
    eq<T>(actual: T, expected: T, message?: MsgSource): void;

    /**
     * Asserts non-strict inequality (!=) of actual and expected.
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message   Message to display on error.
     */
    notEqual<T>(actual: T, expected: T, message?: MsgSource): void;

    /**
     * Asserts strict equality (===) of actual and expected.
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message   Message to display on error.
     */
    strictEqual<T>(actual: T, expected: T, message?: MsgSource): void;

    /**
     * Asserts strict inequality (!==) of actual and expected.
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message   Message to display on error.
     */
    notStrictEqual<T>(actual: T, expected: T, message?: MsgSource): void;

    /**
     * Asserts that actual is deeply equal to expected.
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message   Message to display on error.
     */
    deepEqual<T>(actual: T, expected: T, message?: MsgSource): void;

    /**
     * Asserts that actual is not deeply equal to expected.
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message   Message to display on error.
     */
    notDeepEqual<T>(actual: T, expected: T, message?: MsgSource): void;

    /**
     * Alias to deepEqual
     *
     * T   Type of the objects.
     * @param actual   Actual value.
     * @param expected   Potential expected value.
     * @param message   Message to display on error.
     */
    deepStrictEqual<T>(actual: T, expected: T, message?: MsgSource): void;

    /**
     * Asserts valueToCheck is strictly greater than (>) valueToBeAbove.
     *
     * @param valueToCheck   Actual value.
     * @param valueToBeAbove   Minimum Potential expected value.
     * @param message   Message to display on error.
     */
    isAbove<T extends number | Date>(valueToCheck: T, valueToBeAbove: T, message?: MsgSource): void;

    /**
     * Asserts valueToCheck is greater than or equal to (>=) valueToBeAtLeast.
     *
     * @param valueToCheck   Actual value.
     * @param valueToBeAtLeast   Minimum Potential expected value.
     * @param message   Message to display on error.
     */
    isAtLeast<T extends number | Date>(valueToCheck: T, valueToBeAtLeast: T, message?: MsgSource): void;

    /**
     * Asserts valueToCheck is strictly less than (<) valueToBeBelow.
     *
     * @param valueToCheck   Actual value.
     * @param valueToBeBelow   Minimum Potential expected value.
     * @param message   Message to display on error.
     */
    isBelow<T extends number | Date>(valueToCheck: T, valueToBeBelow: T, message?: MsgSource): void;

    /**
     * Asserts valueToCheck is less than or equal to (<=) valueToBeAtMost.
     *
     * @param valueToCheck   Actual value.
     * @param valueToBeAtMost   Minimum Potential expected value.
     * @param message   Message to display on error.
     */
    isAtMost<T extends number | Date>(valueToCheck: T, valueToBeAtMost: T, message?: MsgSource): void;

    isIterable<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is true.
     *
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isTrue(value: unknown, message?: MsgSource): asserts value is true;

    /**
     * Asserts that value is false.
     *
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isFalse(value: unknown, message?: MsgSource): asserts value is false;

    /**
     * Asserts that value is not true.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotTrue<T>(value: T, message?: MsgSource): asserts value is Exclude<T, true>;

    /**
     * Asserts that value is not false.
     *
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotFalse<T>(value: T, message?: MsgSource): asserts value is Exclude<T, false>;

    /**
     * Asserts that value is null.
     *
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNull(value: unknown, message?: MsgSource): asserts value is null;

    /**
     * Asserts that value is not null.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotNull<T>(value: T, message?: MsgSource): asserts value is Exclude<T, null>;

    /**
     * Asserts that value is NaN.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNaN<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is not NaN.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotNaN<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that the target is neither null nor undefined.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message    Message to display on error.
     */
    exists<T>(value: T, message?: MsgSource): asserts value is NonNullable<T>;

    /**
     * Asserts that the target is either null or undefined.
     *
     * @param value   Actual value.
     * @param message    Message to display on error.
     */
    notExists(value: unknown, message?: MsgSource): asserts value is
        | null
        | undefined;

    /**
     * Asserts that value is undefined.
     *
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isUndefined(value: unknown, message?: MsgSource): asserts value is undefined;

    /**
     * Asserts that value is not undefined.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isDefined<T>(value: T, message?: MsgSource): asserts value is Exclude<T, undefined>;

    /**
     * Asserts that value is a function.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isFunction<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is not a function.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotFunction<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is a callable function, which means that
     * it is a function or an async function, GeneratorFunction, or
     * async GeneratorFunction.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isCallable<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is not a callable function, which means that
     * it is not a function or an async function, GeneratorFunction, or
     * async GeneratorFunction.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotCallable<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is an object of type 'Object'
     * (as revealed by Object.prototype.toString).
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     * @remarks The assertion does not match subclassed objects.
     */
    isObject<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is not an object of type 'Object'
     * (as revealed by Object.prototype.toString).
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotObject<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is an array.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isArray<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is not an array.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotArray<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is a string.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isString<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is not a string.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotString<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is a number.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNumber<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is not a number.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotNumber<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is a finite number.
     * Unlike `.isNumber`, this will fail for `NaN` and `Infinity`.
     *
     * T   Type of value
     * @param value    Actual value
     * @param message   Message to display on error.
     */
    isFinite<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is a boolean.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isBoolean<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value is not a boolean.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param message   Message to display on error.
     */
    isNotBoolean<T>(value: T, message?: MsgSource): void;

    /**
     * Asserts that value's type is name, as determined by Object.prototype.toString.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param name   Potential expected type name of value.
     * @param message   Message to display on error.
     */
    typeOf<T>(value: T, name: string, message?: MsgSource): void;

    /**
     * Asserts that value's type is not name, as determined by Object.prototype.toString.
     *
     * T   Type of value.
     * @param value   Actual value.
     * @param name   Potential expected type name of value.
     * @param message   Message to display on error.
     */
    notTypeOf<T>(value: T, name: string, message?: MsgSource): void;

    /**
     * Asserts that value is an instance of constructor.
     *
     * T   Expected type of value.
     * @param value   Actual value.
     * @param constructor   Potential expected contructor of value.
     * @param message   Message to display on error.
     */
    instanceOf<T>(
        value: unknown,
        constructor: Constructor<T>,
        message?: MsgSource,
    ): asserts value is T;

    /**
     * Asserts that value is not an instance of constructor.
     *
     * T   Type of value.
     * U   Type that value shouldn't be an instance of.
     * @param value   Actual value.
     * @param type   Potential expected contructor of value.
     * @param message   Message to display on error.
     */
    notInstanceOf<T, U>(value: T, type: Constructor<U>, message?: MsgSource): asserts value is Exclude<T, U>;

    /**
     * Asserts that haystack includes needle.
     *
     * @param haystack   Container string.
     * @param needle   Potential substring of haystack.
     * @param message   Message to display on error.
     */
    include(haystack: string, needle: string, message?: MsgSource): void;

    /**
     * Asserts that haystack includes needle.
     *
     * T   Type of values in haystack.
     * @param haystack   Container array, set or map.
     * @param needle   Potential value contained in haystack.
     * @param message   Message to display on error.
     */
    include<T>(
        haystack: readonly T[] | ReadonlySet<T> | ReadonlyMap<any, T>,
        needle: T,
        message?: MsgSource,
    ): void;

    /**
     * Asserts that haystack includes needle.
     *
     * T   Type of values in haystack.
     * @param haystack   WeakSet container.
     * @param needle   Potential value contained in haystack.
     * @param message   Message to display on error.
     */
    include<T extends object>(haystack: WeakSet<T>, needle: T, message?: MsgSource): void;

    /**
     * Asserts that haystack includes needle.
     *
     * T   Type of haystack.
     * @param haystack   Object.
     * @param needle   Potential subset of the haystack's properties.
     * @param message   Message to display on error.
     */
    include<T>(haystack: T, needle: Partial<T>, message?: MsgSource): void;

    /**
     * Asserts that haystack does not includes needle.
     *
     * @param haystack   Container string.
     * @param needle   Potential substring of haystack.
     * @param message   Message to display on error.
     */
    notInclude(haystack: string, needle: string, message?: MsgSource): void;

    /**
     * Asserts that haystack does not includes needle.
     *
     * T   Type of values in haystack.
     * @param haystack   Container array, set or map.
     * @param needle   Potential value contained in haystack.
     * @param message   Message to display on error.
     */
    notInclude<T>(
        haystack: readonly T[] | ReadonlySet<T> | ReadonlyMap<any, T>,
        needle: T,
        message?: MsgSource,
    ): void;

    /**
     * Asserts that haystack does not includes needle.
     *
     * T   Type of values in haystack.
     * @param haystack   WeakSet container.
     * @param needle   Potential value contained in haystack.
     * @param message   Message to display on error.
     */
    notInclude<T extends object>(haystack: WeakSet<T>, needle: T, message?: MsgSource): void;

    /**
     * Asserts that haystack does not includes needle.
     *
     * T   Type of haystack.
     * @param haystack   Object.
     * @param needle   Potential subset of the haystack's properties.
     * @param message   Message to display on error.
     */
    notInclude<T>(haystack: T, needle: Partial<T>, message?: MsgSource): void;

    /**
     * Asserts that haystack includes needle. Deep equality is used.
     *
     * @param haystack   Container string.
     * @param needle   Potential substring of haystack.
     * @param message   Message to display on error.
     *
     * @deprecated Does not have any effect on string. Use {@link Assert#include} instead.
     */
    deepInclude(haystack: string, needle: string, message?: MsgSource): void;

    /**
     * Asserts that haystack includes needle. Deep equality is used.
     *
     * T   Type of values in haystack.
     * @param haystack   Container array, set or map.
     * @param needle   Potential value contained in haystack.
     * @param message   Message to display on error.
     */
    deepInclude<T>(
        haystack: readonly T[] | ReadonlySet<T> | ReadonlyMap<any, T>,
        needle: T,
        message?: MsgSource,
    ): void;

    /**
     * Asserts that haystack does not includes needle.
     *
     * T   Type of haystack.
     * @param haystack   Object.
     * @param needle   Potential subset of the haystack's properties.
     * @param message   Message to display on error.
     */
    deepInclude<T>(haystack: T, needle: T extends WeakSet<any> ? never : Partial<T>, message?: MsgSource): void;

    /**
     * Asserts that haystack does not includes needle. Deep equality is used.
     *
     * @param haystack   Container string.
     * @param needle   Potential substring of haystack.
     * @param message   Message to display on error.
     *
     * @deprecated Does not have any effect on string. Use {@link Assert#notInclude} instead.
     */
    notDeepInclude(haystack: string, needle: string, message?: MsgSource): void;

    /**
     * Asserts that haystack does not includes needle. Deep equality is used.
     *
     * T   Type of values in haystack.
     * @param haystack   Container array, set or map.
     * @param needle   Potential value contained in haystack.
     * @param message   Message to display on error.
     */
    notDeepInclude<T>(
        haystack: readonly T[] | ReadonlySet<T> | ReadonlyMap<any, T>,
        needle: T,
        message?: MsgSource,
    ): void;

    /**
     * Asserts that haystack does not includes needle. Deep equality is used.
     *
     * T   Type of haystack.
     * @param haystack   Object.
     * @param needle   Potential subset of the haystack's properties.
     * @param message   Message to display on error.
     */
    notDeepInclude<T>(haystack: T, needle: T extends WeakSet<any> ? never : Partial<T>, message?: MsgSource): void;

    /**
     * Asserts that ‘haystack’ includes ‘needle’. Can be used to assert the inclusion of a subset of properties in an object.
     *
     * Enables the use of dot- and bracket-notation for referencing nested properties.
     * ‘[]’ and ‘.’ in property names can be escaped using double backslashes.Asserts that ‘haystack’ includes ‘needle’.
     * Can be used to assert the inclusion of a subset of properties in an object.
     * Enables the use of dot- and bracket-notation for referencing nested properties.
     * ‘[]’ and ‘.’ in property names can be escaped using double backslashes.
     *
     * @param haystack
     * @param needle
     * @param message   Message to display on error.
     */
    nestedInclude(haystack: any, needle: any, message?: MsgSource): void;

    /**
     * Asserts that ‘haystack’ does not include ‘needle’. Can be used to assert the absence of a subset of properties in an object.
     *
     * Enables the use of dot- and bracket-notation for referencing nested properties.
     * ‘[]’ and ‘.’ in property names can be escaped using double backslashes.Asserts that ‘haystack’ includes ‘needle’.
     * Can be used to assert the inclusion of a subset of properties in an object.
     * Enables the use of dot- and bracket-notation for referencing nested properties.
     * ‘[]’ and ‘.’ in property names can be escaped using double backslashes.
     *
     * @param haystack
     * @param needle
     * @param message   Message to display on error.
     */
    notNestedInclude(haystack: any, needle: any, message?: MsgSource): void;

    /**
     * Asserts that ‘haystack’ includes ‘needle’. Can be used to assert the inclusion of a subset of properties in an object while checking for deep equality
     *
     * Enables the use of dot- and bracket-notation for referencing nested properties.
     * ‘[]’ and ‘.’ in property names can be escaped using double backslashes.Asserts that ‘haystack’ includes ‘needle’.
     * Can be used to assert the inclusion of a subset of properties in an object.
     * Enables the use of dot- and bracket-notation for referencing nested properties.
     * ‘[]’ and ‘.’ in property names can be escaped using double backslashes.
     *
     * @param haystack
     * @param needle
     * @param message   Message to display on error.
     */
    deepNestedInclude(haystack: any, needle: any, message?: MsgSource): void;

    /**
     * Asserts that ‘haystack’ does not include ‘needle’. Can be used to assert the absence of a subset of properties in an object while checking for deep equality.
     *
     * Enables the use of dot- and bracket-notation for referencing nested properties.
     * ‘[]’ and ‘.’ in property names can be escaped using double backslashes.Asserts that ‘haystack’ includes ‘needle’.
     * Can be used to assert the inclusion of a subset of properties in an object.
     * Enables the use of dot- and bracket-notation for referencing nested properties.
     * ‘[]’ and ‘.’ in property names can be escaped using double backslashes.
     *
     * @param haystack
     * @param needle
     * @param message   Message to display on error.
     */
    notDeepNestedInclude(haystack: any, needle: any, message?: MsgSource): void;

    /**
     * Asserts that ‘haystack’ includes ‘needle’. Can be used to assert the inclusion of a subset of properties in an object while ignoring inherited properties.
     *
     * @param haystack
     * @param needle
     * @param message   Message to display on error.
     */
    ownInclude(haystack: any, needle: any, message?: MsgSource): void;

    /**
     * Asserts that ‘haystack’ includes ‘needle’. Can be used to assert the absence of a subset of properties in an object while ignoring inherited properties.
     *
     * @param haystack
     * @param needle
     * @param message   Message to display on error.
     */
    notOwnInclude(haystack: any, needle: any, message?: MsgSource): void;

    /**
     * Asserts that ‘haystack’ includes ‘needle’. Can be used to assert the inclusion of a subset of properties in an object while ignoring inherited properties and checking for deep
     *
     * @param haystack
     * @param needle
     * @param message   Message to display on error.
     */
    deepOwnInclude(haystack: any, needle: any, message?: MsgSource): void;

    /**
     * Asserts that ‘haystack’ includes ‘needle’. Can be used to assert the absence of a subset of properties in an object while ignoring inherited properties and checking for deep equality.
     *
     * @param haystack
     * @param needle
     * @param message   Message to display on error.
     */
    notDeepOwnInclude(haystack: any, needle: any, message?: MsgSource): void;

    /**
     * Asserts that value matches the regular expression regexp.
     *
     * @param value   Actual value.
     * @param regexp   Potential match of value.
     * @param message   Message to display on error.
     */
    match(value: string, regexp: RegExp, message?: MsgSource): void;

    /**
     * Asserts that value does not match the regular expression regexp.
     *
     * @param expected   Actual value.
     * @param regexp   Potential match of value.
     * @param message   Message to display on error.
     */
    notMatch(expected: any, regexp: RegExp, message?: MsgSource): void;

    /**
     * Asserts that object has a property named by property.
     *
     * T   Type of object.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param message   Message to display on error.
     */
    property<T>(object: T, property: string, /* keyof T */ message?: MsgSource): void;

    /**
     * Asserts that object has its own property named by property.
     *
     * T   Type of object.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param message   Message to display on error.
     */
    ownProperty<T>(object: T, property: string, /* keyof T */ message?: MsgSource): void;

    /**
     * Asserts that object has a property named by property.
     *
     * T   Type of object.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param message   Message to display on error.
     */
    notProperty<T>(object: T, property: string, /* keyof T */ message?: MsgSource): void;

    /**
     * Asserts that object does not have it's own property named by property.
     *
     * T   Type of object.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param message   Message to display on error.
     */
    notOwnProperty<T>(object: T, property: string, /* keyof T */ message?: MsgSource): void;

    /**
     * Asserts that object has a property named by property, which can be a string
     * using dot- and bracket-notation for deep reference.
     *
     * T   Type of object.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param message   Message to display on error.
     */
    deepProperty<T>(object: T, property: string, message?: MsgSource): void;

    /**
     * Asserts that object does not have a property named by property, which can be a
     * string using dot- and bracket-notation for deep reference.
     *
     * T   Type of object.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param message   Message to display on error.
     */
    notDeepProperty<T>(object: T, property: string, message?: MsgSource): void;

    /**
     * Asserts that object has a property named by property with value given by value.
     *
     * T   Type of object.
     * V   Type of value.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param value   Potential expected property value.
     * @param message   Message to display on error.
     */
    propertyVal<T, V>(object: T, property: string, /* keyof T */ value: V, message?: MsgSource): void;

    /**
     * Asserts that object has it's own property named by property with value given by value.
     *
     * T   Type of object.
     * V   Type of value.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param value   Potential expected property value.
     * @param message   Message to display on error.
     */
    ownPropertyVal<T, V>(object: T, property: string, /* keyof T */ value: V, message?: MsgSource): void;

    deepOwnPropertyVal<T, V>(object: T, property: string, value: V, message?: MsgSource): void;

    /**
     * Asserts that object has a property named by property with value given by value.
     *
     * T   Type of object.
     * V   Type of value.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param value   Potential expected property value.
     * @param message   Message to display on error.
     */
    notPropertyVal<T, V>(object: T, property: string, /* keyof T */ value: V, message?: MsgSource): void;

    notDeepOwnPropertyVal<T, V>(object: T, property: string, value: V, message?: MsgSource): void;
    
    /**
     * Asserts that object does not have it's own property named by property with value given by value.
     *
     * T   Type of object.
     * V   Type of value.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param value   Potential expected property value.
     * @param message   Message to display on error.
     */
    notOwnPropertyVal<T, V>(object: T, property: string, /* keyof T */ value: V, message?: MsgSource): void;

    /**
     * Asserts that object has a property named by property, which can be a string
     * using dot- and bracket-notation for deep reference.
     *
     * T   Type of object.
     * V   Type of value.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param value   Potential expected property value.
     * @param message   Message to display on error.
     */
    deepPropertyVal<T, V>(object: T, property: string, value: V, message?: MsgSource): void;

    /**
     * Asserts that object does not have a property named by property, which can be a
     * string using dot- and bracket-notation for deep reference.
     *
     * T   Type of object.
     * V   Type of value.
     * @param object   Container object.
     * @param property   Potential contained property of object.
     * @param value   Potential expected property value.
     * @param message   Message to display on error.
     */
    notDeepPropertyVal<T, V>(object: T, property: string, value: V, message?: MsgSource): void;

    /**
     * Asserts that object has a length property with the expected value.
     *
     * T   Type of object.
     * @param object   Container object.
     * @param length   Potential expected length of object.
     * @param message   Message to display on error.
     */
    lengthOf<T extends { readonly length?: number | undefined } | { readonly size?: number | undefined }>(
        object: T,
        length: number,
        message?: MsgSource,
    ): void;

    /**
     * Asserts that fn will throw an error.
     *
     * @param fn   Function that may throw.
     * @param errMsgMatcher   Expected error message matcher.
     * @param ignored   Ignored parameter.
     * @param message   Message to display on error.
     */
    throw(fn: () => void, errMsgMatcher?: RegExp | string, ignored?: any, message?: MsgSource): void;

    /**
     * Asserts that fn will throw an error.
     *
     * @param fn   Function that may throw.
     * @param errorLike   Expected error constructor or error instance.
     * @param errMsgMatcher   Expected error message matcher.
     * @param message   Message to display on error.
     */
    throw(
        fn: () => void,
        errorLike?: ErrorConstructor | Error | null,
        errMsgMatcher?: RegExp | string | null,
        message?: MsgSource,
    ): void;

    /**
     * Asserts that fn will throw an error.
     *
     * @param fn   Function that may throw.
     * @param errMsgMatcher   Expected error message matcher.
     * @param ignored   Ignored parameter.
     * @param message   Message to display on error.
     */
    throws(fn: () => void, errMsgMatcher?: RegExp | string, ignored?: any, message?: MsgSource): void;

    /**
     * Asserts that fn will throw an error.
     *
     * @param fn   Function that may throw.
     * @param errorLike   Expected error constructor or error instance.
     * @param errMsgMatcher   Expected error message matcher.
     * @param message   Message to display on error.
     */
    throws(
        fn: () => void,
        errorLike?: ErrorConstructor | Error | null,
        errMsgMatcher?: RegExp | string | null,
        message?: MsgSource,
    ): void;

    /**
     * Asserts that fn will throw an error.
     *
     * @param fn   Function that may throw.
     * @param errMsgMatcher   Expected error message matcher.
     * @param ignored   Ignored parameter.
     * @param message   Message to display on error.
     */
    Throw(fn: () => void, errMsgMatcher?: RegExp | string, ignored?: any, message?: MsgSource): void;

    /**
     * Asserts that fn will throw an error.
     *
     * @param fn   Function that may throw.
     * @param errorLike   Expected error constructor or error instance.
     * @param errMsgMatcher   Expected error message matcher.
     * @param message   Message to display on error.
     */
    Throw(
        fn: () => void,
        errorLike?: ErrorConstructor | Error | null,
        errMsgMatcher?: RegExp | string | null,
        message?: MsgSource,
    ): void;

    /**
     * Asserts that fn will not throw an error.
     *
     * @param fn   Function that may throw.
     * @param errMsgMatcher   Expected error message matcher.
     * @param ignored   Ignored parameter.
     * @param message   Message to display on error.
     */
    doesNotThrow(fn: () => void, errMsgMatcher?: RegExp | string, ignored?: any, message?: MsgSource): void;

    /**
     * Asserts that fn will not throw an error.
     *
     * @param fn   Function that may throw.
     * @param errorLike   Expected error constructor or error instance.
     * @param errMsgMatcher   Expected error message matcher.
     * @param message   Message to display on error.
     */
    doesNotThrow(
        fn: () => void,
        errorLike?: ErrorConstructor | Error | null,
        errMsgMatcher?: RegExp | string | null,
        message?: MsgSource,
    ): void;

    /**
     * Compares two values using operator.
     *
     * @param val1   Left value during comparison.
     * @param operator   Comparison operator.
     * @param val2   Right value during comparison.
     * @param message   Message to display on error.
     */
    operator(val1: OperatorComparable, operator: Operator, val2: OperatorComparable, message?: MsgSource): void;

    /**
     * Asserts that the target is equal to expected, to within a +/- delta range.
     *
     * @param actual   Actual value
     * @param expected   Potential expected value.
     * @param delta   Maximum differenced between values.
     * @param message   Message to display on error.
     */
    closeTo(actual: number, expected: number, delta: number, message?: MsgSource): void;

    /**
     * Asserts that the target is equal to expected, to within a +/- delta range.
     *
     * @param actual   Actual value
     * @param expected   Potential expected value.
     * @param delta   Maximum differenced between values.
     * @param message   Message to display on error.
     */
    approximately(actual: number, expected: number, delta: number, message?: MsgSource): void;

    /**
     * Asserts that set1 and set2 have the same members. Order is not take into account.
     *
     * T   Type of set values.
     * @param set1   Actual set of values.
     * @param set2   Potential expected set of values.
     * @param message   Message to display on error.
     */
    sameMembers<T>(set1: T[], set2: T[], message?: MsgSource): void;

    notSameMembers<T>(set1: T[], set2: T[], message?: MsgSource): void;
    
    /**
     * Asserts that set1 and set2 have the same members using deep equality checking.
     * Order is not take into account.
     *
     * T   Type of set values.
     * @param set1   Actual set of values.
     * @param set2   Potential expected set of values.
     * @param message   Message to display on error.
     */
    sameDeepMembers<T>(set1: T[], set2: T[], message?: MsgSource): void;

    /**
     * Asserts that `set1` and `set2` don't have the same members in any order.
     * Uses a deep equality check.
     *
     *  T   Type of set values.
     * @param set1
     * @param set2
     * @param message
     */
    notSameDeepMembers<T>(set1: T[], set2: T[], message?: MsgSource): void;

    /**
     * Asserts that set1 and set2 have the same members in the same order.
     * Uses a strict equality check (===).
     *
     * T   Type of set values.
     * @param set1   Actual set of values.
     * @param set2   Potential expected set of values.
     * @param message   Message to display on error.
     */
    sameOrderedMembers<T>(set1: T[], set2: T[], message?: MsgSource): void;

    /**
     * Asserts that set1 and set2 don’t have the same members in the same order.
     * Uses a strict equality check (===).
     *
     * T   Type of set values.
     * @param set1   Actual set of values.
     * @param set2   Potential expected set of values.
     * @param message   Message to display on error.
     */
    notSameOrderedMembers<T>(set1: T[], set2: T[], message?: MsgSource): void;

    /**
     * Asserts that set1 and set2 have the same members in the same order.
     * Uses a deep equality check.
     *
     * T   Type of set values.
     * @param set1   Actual set of values.
     * @param set2   Potential expected set of values.
     * @param message   Message to display on error.
     */
    sameDeepOrderedMembers<T>(set1: T[], set2: T[], message?: MsgSource): void;

    /**
     * Asserts that set1 and set2 don’t have the same members in the same order.
     * Uses a deep equality check.
     *
     * T   Type of set values.
     * @param set1   Actual set of values.
     * @param set2   Potential expected set of values.
     * @param message   Message to display on error.
     */
    notSameDeepOrderedMembers<T>(set1: T[], set2: T[], message?: MsgSource): void;

    /**
     * Asserts that subset is included in superset in the same order beginning with the first element in superset.
     * Uses a strict equality check (===).
     *
     * T   Type of set values.
     * @param superset   Actual set of values.
     * @param subset   Potential contained set of values.
     * @param message   Message to display on error.
     */
    includeOrderedMembers<T>(superset: T[], subset: T[], message?: MsgSource): void;

    /**
     * Asserts that subset isn’t included in superset in the same order beginning with the first element in superset.
     * Uses a strict equality check (===).
     *
     * T   Type of set values.
     * @param superset   Actual set of values.
     * @param subset   Potential contained set of values.
     * @param message   Message to display on error.
     */
    notIncludeOrderedMembers<T>(superset: T[], subset: T[], message?: MsgSource): void;

    /**
     * Asserts that subset is included in superset in the same order beginning with the first element in superset.
     * Uses a deep equality check.
     *
     * T   Type of set values.
     * @param superset   Actual set of values.
     * @param subset   Potential contained set of values.
     * @param message   Message to display on error.
     */
    includeDeepOrderedMembers<T>(superset: T[], subset: T[], message?: MsgSource): void;

    /**
     * Asserts that subset isn’t included in superset in the same order beginning with the first element in superset.
     * Uses a deep equality check.
     *
     * T   Type of set values.
     * @param superset   Actual set of values.
     * @param subset   Potential contained set of values.
     * @param message   Message to display on error.
     */
    notIncludeDeepOrderedMembers<T>(superset: T[], subset: T[], message?: MsgSource): void;

    /**
     * Asserts that subset is included in superset. Order is not take into account.
     *
     * T   Type of set values.
     * @param superset   Actual set of values.
     * @param subset   Potential contained set of values.
     * @param message   Message to display on error.
     */
    includeMembers<T>(superset: T[], subset: T[], message?: MsgSource): void;

    /**
     * Asserts that subset isn’t included in superset in any order.
     * Uses a strict equality check (===). Duplicates are ignored.
     *
     * T   Type of set values.
     * @param superset   Actual set of values.
     * @param subset   Potential not contained set of values.
     * @param message   Message to display on error.
     */
    notIncludeMembers<T>(superset: T[], subset: T[], message?: MsgSource): void;

    /**
     * Asserts that subset is included in superset using deep equality checking.
     * Order is not take into account.
     *
     * T   Type of set values.
     * @param superset   Actual set of values.
     * @param subset   Potential contained set of values.
     * @param message   Message to display on error.
     */
    includeDeepMembers<T>(superset: T[], subset: T[], message?: MsgSource): void;

    /**
     * Asserts that `subset` isn't included in `superset` in any order. Uses a
     * deep equality check. Duplicates are ignored.
     *
     * assert.notIncludeDeepMembers([ { a: 1 }, { b: 2 }, { c: 3 } ], [ { b: 2 }, { f: 5 } ], 'not include deep members');
     *
     * T   Type of set values.
     * @param superset   Actual set of values.
     * @param subset   Potential contained set of values.
     * @param message   Message to display on error.
     */
    notIncludeDeepMembers<T>(superset: T[], subset: T[], message?: MsgSource): void;

    /**
     * Asserts that non-object, non-array value inList appears in the flat array list.
     *
     * T   Type of list values.
     * @param inList   Value expected to be in the list.
     * @param list   List of values.
     * @param message   Message to display on error.
     */
    oneOf<T>(inList: T, list: T[], message?: MsgSource): void;

    /**
     * Asserts that a function changes the value of a property.
     *
     * T   Type of object.
     * @param modifier   Function to run.
     * @param object   Container object.
     * @param property   Property of object expected to be modified.
     * @param message   Message to display on error.
     */
    changes<T>(modifier: Function, object: T, property: string, /* keyof T */ message?: MsgSource): void;

    /**
     * Asserts that a function changes the value of a property by an amount (delta).
     *
     * @param modifier function
     * @param object or getter function
     * @param property name _optional_
     * @param change amount (delta)
     * @param message _optional_
     */
    changesBy<T>(
        modifier: Function,
        object: T,
        property: string,
        /* keyof T */ change: number,
        message?: MsgSource,
    ): void;
    changesBy<T>(modifier: Function, object: T, change: number, message?: MsgSource): void;

    /**
     * Asserts that a function does not change the value of a property.
     *
     * T   Type of object.
     * @param modifier   Function to run.
     * @param object   Container object.
     * @param property   Property of object expected not to be modified.
     * @param message   Message to display on error.
     */
    doesNotChange<T>(modifier: Function, object: T, property: string, /* keyof T */ message?: MsgSource): void;

    changesButNotBy<T>(modifier: Function, object: T, property: string, /* keyof T */ change: number, message?: MsgSource): void;
    changesButNotBy<T>(modifier: Function, object: T, change: number, message?: MsgSource): void;
    
    /**
     * Asserts that a function increases an object property.
     *
     * T   Type of object.
     * @param modifier   Function to run.
     * @param object   Container object.
     * @param property   Property of object expected to be increased.
     * @param message   Message to display on error.
     */
    increases<T>(modifier: Function, object: T, property?: string, /* keyof T */ message?: MsgSource): void;

    /**
     * Asserts that a function increases a numeric object property or a function's return value by an amount (delta).
     *
     * T   Type of object or function.
     * @param modifier function
     * @param object or getter function
     * @param property name _optional_
     * @param change amount (delta)
     * @param message _optional_
     */
    increasesBy<T>(
        modifier: Function,
        object: T,
        property: string,
        /* keyof T */ change: number,
        message?: MsgSource,
    ): void;
    increasesBy<T>(modifier: Function, object: T, change: number, message?: MsgSource): void;

    /**
     * Asserts that a function does not increase an object property.
     *
     * T   Type of object.
     * @param modifier   Function to run.
     * @param object   Container object.
     * @param property   Property of object expected not to be increased.
     * @param message   Message to display on error.
     */
    doesNotIncrease<T>(modifier: Function, object: T, property?: string, /* keyof T */ message?: MsgSource): void;

    /**
     * Asserts that a function does not increase a numeric object property or function's return value by an amount (delta).
     *
     * T   Type of object or function.
     * @param modifier function
     * @param object or getter function
     * @param property name _optional_
     * @param change amount (delta)
     * @param message _optional_
     */

    increasesButNotBy<T>(
        modifier: Function,
        object: T,
        property: string,
        /* keyof T */ change: number,
        message?: MsgSource,
    ): void;
    increasesButNotBy<T>(modifier: Function, object: T, change: number, message?: MsgSource): void;

    /**
     * Asserts that a function decreases an object property.
     *
     * T   Type of object.
     * @param modifier   Function to run.
     * @param object   Container object.
     * @param property   Property of object expected to be decreased.
     * @param message   Message to display on error.
     */
    decreases<T>(modifier: Function, object: T, property?: string, /* keyof T */ message?: MsgSource): void;

    /**
     * Asserts that a function decreases a numeric object property or a function's return value by an amount (delta)
     *
     * T   Type of object or function.
     * @param modifier function
     * @param object or getter function
     * @param property name _optional_
     * @param change amount (delta)
     * @param message _optional_
     */

    decreasesBy<T>(
        modifier: Function,
        object: T,
        property: string,
        /* keyof T */ change: number,
        message?: MsgSource,
    ): void;
    decreasesBy<T>(modifier: Function, object: T, change: number, message?: MsgSource): void;

    /**
     * Asserts that a function does not decrease an object property.
     *
     * T   Type of object.
     * @param modifier   Function to run.
     * @param object   Container object.
     * @param property   Property of object expected not to be decreased.
     * @param message   Message to display on error.
     */
    doesNotDecrease<T>(modifier: Function, object: T, property?: string, /* keyof T */ message?: MsgSource): void;

    /**
     * Asserts that a function does not decreases a numeric object property or a function's return value by an amount (delta)
     *
     * T   Type of object or function.
     * @param modifier function
     * @param object or getter function
     * @param property name _optional_
     * @param change amount (delta)
     * @param message _optional_
     */

    doesNotDecreaseBy<T>(
        modifier: Function,
        object: T,
        property: string,
        /* keyof T */ change: number,
        message?: MsgSource,
    ): void;
    doesNotDecreaseBy<T>(modifier: Function, object: T, change: number, message?: MsgSource): void;

    /**
     * Asserts that a function does not decreases a numeric object property or a function's return value by an amount (delta)
     *
     * T   Type of object or function.
     * @param modifier function
     * @param object or getter function
     * @param property name _optional_
     * @param change amount (delta)
     * @param message _optional_
     */

    decreasesButNotBy<T>(
        modifier: Function,
        object: T,
        property: string,
        /* keyof T */ change: number,
        message?: MsgSource,
    ): void;
    decreasesButNotBy<T>(modifier: Function, object: T, change: number, message?: MsgSource): void;

    /**
     * Asserts if value is not a false value, and throws if it is a true value.
     *
     * T   Type of object.
     * @param object   Actual value.
     * @param message   Message to display on error.
     * @remarks This is added to allow for chai to be a drop-in replacement for
     *          Node’s assert class.
     */
    ifError<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is extensible (can have new properties added to it).
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    isExtensible<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is extensible (can have new properties added to it).
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    extensible<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is not extensible.
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    isNotExtensible<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is not extensible.
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    notExtensible<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is sealed (can have new properties added to it
     * and its existing properties cannot be removed).
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    isSealed<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is sealed (can have new properties added to it
     * and its existing properties cannot be removed).
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    sealed<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is not sealed.
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    isNotSealed<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is not sealed.
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    notSealed<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is frozen (cannot have new properties added to it
     * and its existing properties cannot be removed).
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    isFrozen<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is frozen (cannot have new properties added to it
     * and its existing properties cannot be removed).
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    frozen<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is not frozen (cannot have new properties added to it
     * and its existing properties cannot be removed).
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    isNotFrozen<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that object is not frozen (cannot have new properties added to it
     * and its existing properties cannot be removed).
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    notFrozen<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that the target does not contain any values. For arrays and
     * strings, it checks the length property. For Map and Set instances, it
     * checks the size property. For non-function objects, it gets the count
     * of own enumerable string keys.
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    isEmpty<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that the target does not contain any values. For arrays and
     * strings, it checks the length property. For Map and Set instances, it
     * checks the size property. For non-function objects, it gets the count
     * of own enumerable string keys.
     *
     * T   Type of object
     * @param object   Actual value.
     * @param message   Message to display on error.
     */
    empty<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that the target contains values. For arrays and strings, it checks
     * the length property. For Map and Set instances, it checks the size property.
     * For non-function objects, it gets the count of own enumerable string keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param message    Message to display on error.
     */
    isNotEmpty<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that the target contains values. For arrays and strings, it checks
     * the length property. For Map and Set instances, it checks the size property.
     * For non-function objects, it gets the count of own enumerable string keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param message    Message to display on error.
     */
    notEmpty<T>(object: T, message?: MsgSource): void;

    /**
     * Asserts that `object` has at least one of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    hasAnyKeys<T>(object: T, keys: Array<Object | string> | { [key: string]: any }, message?: MsgSource): void;

    /**
     * Asserts that `object` has all and only all of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    hasAllKeys<T>(object: T, keys: Array<Object | string> | { [key: string]: any }, message?: MsgSource): void;

    /**
     * Asserts that `object` has all of the `keys` provided but may have more keys not listed.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    containsAllKeys<T>(object: T, keys: Array<Object | string> | { [key: string]: any }, message?: MsgSource): void;

    /**
     * Asserts that `object` has none of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    doesNotHaveAnyKeys<T>(object: T, keys: Array<Object | string> | { [key: string]: any }, message?: MsgSource): void;

    /**
     * Asserts that `object` does not have at least one of the `keys` provided.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    doesNotHaveAllKeys<T>(object: T, keys: Array<Object | string> | { [key: string]: any }, message?: MsgSource): void;

    /**
     * Asserts that `object` has at least one of the `keys` provided.
     * Since Sets and Maps can have objects as keys you can use this assertion to perform
     * a deep comparison.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    hasAnyDeepKeys<T>(object: T, keys: Array<Object | string> | { [key: string]: any }, message?: MsgSource): void;

    /**
     * Asserts that `object` has all and only all of the `keys` provided.
     * Since Sets and Maps can have objects as keys you can use this assertion to perform
     * a deep comparison.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    hasAllDeepKeys<T>(object: T, keys: Array<Object | string> | { [key: string]: any }, message?: MsgSource): void;

    /**
     * Asserts that `object` contains all of the `keys` provided.
     * Since Sets and Maps can have objects as keys you can use this assertion to perform
     * a deep comparison.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    containsAllDeepKeys<T>(
        object: T,
        keys: Array<Object | string> | { [key: string]: any },
        message?: MsgSource,
    ): void;

    /**
     * Asserts that `object` contains all of the `keys` provided.
     * Since Sets and Maps can have objects as keys you can use this assertion to perform
     * a deep comparison.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    doesNotHaveAnyDeepKeys<T>(
        object: T,
        keys: Array<Object | string> | { [key: string]: any },
        message?: MsgSource,
    ): void;

    /**
     * Asserts that `object` contains all of the `keys` provided.
     * Since Sets and Maps can have objects as keys you can use this assertion to perform
     * a deep comparison.
     * You can also provide a single object instead of a `keys` array and its keys
     * will be used as the expected set of keys.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param keys   Keys to check
     * @param message    Message to display on error.
     */
    doesNotHaveAllDeepKeys<T>(
        object: T,
        keys: Array<Object | string> | { [key: string]: any },
        message?: MsgSource,
    ): void;

    /**
     * Asserts that object has a direct or inherited property named by property,
     * which can be a string using dot- and bracket-notation for nested reference.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param property    Property to test.
     * @param message    Message to display on error.
     */
    nestedProperty<T>(object: T, property: string, message?: MsgSource): void;

    /**
     * Asserts that object does not have a property named by property,
     * which can be a string using dot- and bracket-notation for nested reference.
     * The property cannot exist on the object nor anywhere in its prototype chain.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param property    Property to test.
     * @param message    Message to display on error.
     */
    notNestedProperty<T>(object: T, property: string, message?: MsgSource): void;

    /**
     * Asserts that object has a property named by property with value given by value.
     * property can use dot- and bracket-notation for nested reference. Uses a strict equality check (===).
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param property    Property to test.
     * @param value    Value to test.
     * @param message    Message to display on error.
     */
    nestedPropertyVal<T>(object: T, property: string, value: any, message?: MsgSource): void;

    /**
     * Asserts that object does not have a property named by property with value given by value.
     * property can use dot- and bracket-notation for nested reference. Uses a strict equality check (===).
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param property    Property to test.
     * @param value    Value to test.
     * @param message    Message to display on error.
     */
    notNestedPropertyVal<T>(object: T, property: string, value: any, message?: MsgSource): void;

    /**
     * Asserts that object has a property named by property with a value given by value.
     * property can use dot- and bracket-notation for nested reference. Uses a deep equality check.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param property    Property to test.
     * @param value    Value to test.
     * @param message    Message to display on error.
     */
    deepNestedPropertyVal<T>(object: T, property: string, value: any, message?: MsgSource): void;

    /**
     * Asserts that object does not have a property named by property with value given by value.
     * property can use dot- and bracket-notation for nested reference. Uses a deep equality check.
     *
     * T   Type of object.
     * @param object   Object to test.
     * @param property    Property to test.
     * @param value    Value to test.
     * @param message    Message to display on error.
     */
    notDeepNestedPropertyVal<T>(object: T, property: string, value: any, message?: MsgSource): void;
}
