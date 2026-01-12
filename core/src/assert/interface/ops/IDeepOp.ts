/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IOwnOp } from "./IOwnOp";
import { PropertyDescriptorFn, PropertyFn } from "../funcs/PropertyFn";
import { IStrictlyOp } from "./IStrictlyOp";
import { IEqualOp } from "./IEqualOp";
import { IIncludeOp } from "./IIncludeOp";
import { INotOp } from "./INotOp";
import { INestedOp } from "./INestedOp";


/**
 * Interface for deep assertion operations, it extends several other interfaces to
 * provide a comprehensive set of operations and methods for performing deep equality
 * checks and related operations.
 *
 * @template R - The type of the result of the operation.
 */
export interface IDeepOp<R> extends INotOp<IDeepOp<R>>, IEqualOp<R> {

    /**
     * Provides operations to asserts that the value is strictly equal
     * to the specified value.
     */
    strictly: IStrictlyOp<R>,

    /**
     * Provides operations to assert that the value includes a matching value.
     */
    include: IIncludeOp<R>;

    /**
     * Provides operations to assert that the value includes a matching value.
     */
    includes: IIncludeOp<R>;

    /**
     * Provides operations to assert that the value contains a matching value.
     */
    contain: IIncludeOp<R>;

    /**
     * Provides operations to assert that the value contains a matching value.
     */
    contains: IIncludeOp<R>;

    /**
     * Provides operations to assert that the value has the specified property.
     */
    property: PropertyFn;

    /**
     * Provides operations to assert that the value has the specified property descriptor.
     */
    propertyDescriptor: PropertyDescriptorFn;

    /**
     * Provides operations to assert that the evaluation operations exist (are owned)
     * by the current assertion context value.
     */
    own: IOwnOp<R>;

    /**
     * Provides nested property operations using dot notation with deep equality.
     */
    nested: INestedOp<R>;
}
