/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { PropertyDescriptorFn, PropertyFn } from "../funcs/PropertyFn";
import { SymbolFn } from "../funcs/SymbolFn";
import { IAllOp } from "./IAllOp";
import { IAnyOp } from "./IAnyOp";
import { IOwnOp } from "./IOwnOp";
import { INestedOp } from "./INestedOp";
import { MsgSource } from "../types";

/**
 * Provides the 'has' operation for the assert scope.
 */
export interface IHasOp<R> {

    /**
     * Provides the `all` assertion operations.
     * @example
     * ```typescript
     * expect({ a: 1, b: 2 }).has.all.keys('a', 'b');
     * ```
     */
    all: IAllOp<R>;

    /**
     * Provides the `any` assertion operations.
     * @example
     * ```typescript
     * expect({ a: 1, b: 2 }).has.any.keys('a', 'b');
     * ```
     */
    any: IAnyOp<R>

    /**
     * Asserts that the object has the specified property.
     * @example
     * ```typescript
     * expect({ a: 1, b: 2 }).has.property('a');
     * ```
     */
    property: PropertyFn;

    /**
     * Asserts that the object has the specified property descriptor.
     * @example
     * ```typescript
     * expect({ a: 1, b: 2 }).has.propertyDescriptor('a');
     * ```
     */
    propertyDescriptor: PropertyDescriptorFn;

    /**
     * Asserts that the object has the specified own property.
     * @example
     * ```typescript
     * expect({ a: 1, b: 2 }).has.own.property('a');
     * ```
     */
    own: IOwnOp<R>;

    /**
     * Provides nested property operations using dot notation.
     * @example
     * ```typescript
     * expect({ a: { b: { c: 1 } } }).has.nested.property('a.b.c');
     * expect({ a: { b: { c: 1 } } }).to.have.nested.property('a.b.c', 1);
     * ```
     */
    nested: INestedOp<R>;

    /**
     * Asserts that the object has the [Symbol.iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator)
     * property.
     * @example
     * ```typescript
     * expect({ [Symbol.iterator]: () => {} }).has.iterator();
     * ```
     */
    iterator: SymbolFn;

    /**
     * Asserts that the target has a length or size property equal to the given number.
     * Works with arrays, strings, Maps, Sets, and any object with a length or size property.
     * @since 0.1.5
     * @param length - The expected length or size.
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([1, 2, 3]).has.lengthOf(3);           // Passes - array length is 3
     * expect("hello").has.lengthOf(5);             // Passes - string length is 5
     * expect(new Map([["a", 1]])).has.lengthOf(1); // Passes - Map size is 1
     * expect(new Set([1, 2])).has.lengthOf(2);     // Passes - Set size is 2
     * ```
     */
    lengthOf(n: number, evalMsg?: MsgSource): R;

    /**
     * Asserts that the target has a size or length property equal to the given number.
     * Works with arrays, strings, Maps, Sets, and any object with a length or size property.
     * @since 0.1.5
     * @param size - The expected size or length.
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([1, 2, 3]).has.sizeOf(3);           // Passes - array length is 3
     * expect("hello").has.sizeOf(5);             // Passes - string length is 5
     * expect(new Map([["a", 1]])).has.sizeOf(1); // Passes - Map size is 1
     * expect(new Set([1, 2])).has.sizeOf(2);     // Passes - Set size is 2
     * ```
     */
    sizeOf(n: number, evalMsg?: MsgSource): R;
}
