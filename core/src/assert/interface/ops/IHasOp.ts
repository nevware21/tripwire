/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { PropertyDescriptorFn, PropertyFn } from "../funcs/PropertyFn";
import { SymbolFn } from "../funcs/SymbolFn";
import { IAllOp } from "./IAllOp";
import { IAnyOp } from "./IAnyOp";
import { IOwnOp } from "./IOwnOp";

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
     * Asserts that the object has the [Symbol.iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator)
     * property.
     * @example
     * ```typescript
     * expect({ [Symbol.iterator]: () => {} }).has.iterator();
     * ```
     */
    iterator: SymbolFn;
}
