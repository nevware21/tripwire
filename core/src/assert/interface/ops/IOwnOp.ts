/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IIncludeOp } from "./IIncludeOp";
import { PropertyDescriptorFn, PropertyFn } from "../funcs/PropertyFn";
import { SymbolFn } from "../funcs/SymbolFn";

/**
 * Represents an interface that provides assertion operations based on the
 * existence of `own` properties on an object.
 * @template R - The type of the result of the operation.
 */
export interface IOwnOp<R> {

    /**
     * A property assertion that validates the existence of a property on an object.
     * @param name The name of the property to validate.
     *
     */
    contain: IIncludeOp<R>;

    /**
     * A property assertion that validates the existence of a property on an object.
     * @param name The name of the property to validate.
     *
     */
    contains: IIncludeOp<R>;

    /**
     * A property assertion that validates the existence of a property on an object.
     * @param name The name of the property to validate.
     *
     */
    include: IIncludeOp<R>;

    /**
     * A property assertion that validates the existence of a property on an object.
     * @param name The name of the property to validate.
     *
     */
    includes: IIncludeOp<R>;

    /**
     * A property assertion that validates the existence of a property on an object.
     * @param name The name of the property to validate.
     *
     */
    property: PropertyFn;

    /**
     * A property assertion that validates the existence of a property descriptor on an object.
     * @param name The name of the property to validate.
     *
     */
    propertyDescriptor: PropertyDescriptorFn;

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
