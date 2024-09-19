/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IEqualOp } from "./IEqualOp";
import { INotOp } from "./INotOp";
import { IIsTypeOp } from "./ITypeOp";

/**
 * Represents an interface for operations on an assertion scope confirming the type of a value.
 * @template R - The type of the result of the operation.
 */
export interface IIsOp<R> extends INotOp<IIsOp<R>>, IEqualOp<R>, IIsTypeOp<R> {

    /**
     * A decorative / alias operation which returns the current instance, useful for
     * chaining operations to provide a more descriptive description of the operations
     * being performed within your tests.
     * @returns - The current instance.
     * @example
     * ```typescript
     * expect(1).is.a.number();
     * expect(1).to.be.a.number();
     *
     * // This is equivalent to not using this decorator operation
     * expect(1).is.number()
     * expect(1).to.be.number();
     * ```
     */
    a: this;

    /**
     * A decorative / alias operation which returns the current instance, useful for
     * chaining operations to provide a more descriptive description of the operations
     * being performed within your tests.
     * @returns - The current instance.
     * @example
     * ```typescript
     * expect(1).is.an.object();
     * expect(1).to.be.an.array();
     *
     * // This is equivalent to not using this decorator operation
     * expect(1).is.object()
     * expect(1).to.be.array();
     * ```
     */
    an: this;
}
