/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAllOp } from "./IAllOp";
import { IAnyOp } from "./IAnyOp";
import { INestedOp } from "./INestedOp";
import { IOwnOp } from "./IOwnOp";
import { MsgSource } from "../../../types/MsgSource";

/**
 * The `own` operation reached through `has` (`expect(value).has.own`): every assertion of {@link IOwnOp},
 * which checks the object's own properties and never its prototype chain, plus the `has` assertions
 * that make sense against own properties alone - `all`, `any`, `nested`, `lengthOf` and `sizeOf`.
 * @template R - The type of the result of the operation.
 * @since 0.2.0
 */
export interface IHasOwnOp<R> extends IOwnOp<R> {

    /**
     * Provides the `all` assertion operations over the object's own keys.
     * @example
     * ```typescript
     * expect({ a: 1, b: 2 }).has.own.all.keys('a', 'b');
     * ```
     */
    all: IAllOp<R>;

    /**
     * Provides the `any` assertion operations over the object's own keys.
     * @example
     * ```typescript
     * expect({ a: 1, b: 2 }).has.own.any.keys('a', 'c');
     * ```
     */
    any: IAnyOp<R>;

    /**
     * Provides the `nested` assertion operations.
     * @example
     * ```typescript
     * expect({ a: { b: 1 } }).has.own.nested.property('a.b');
     * ```
     */
    nested: INestedOp<R>;

    /**
     * Asserts that the target has a length or size property equal to the given number.
     * Works with arrays, strings, Maps, Sets, and any object with a length or size property.
     * @param length - The expected length or size.
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([1, 2, 3]).has.own.lengthOf(3);
     * ```
     */
    lengthOf(length: number, evalMsg?: MsgSource): R;

    /**
     * Asserts that the target has a size or length property equal to the given number.
     * Works with arrays, strings, Maps, Sets, and any object with a length or size property.
     * @param size - The expected size or length.
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect(new Set([1, 2])).has.own.sizeOf(2);
     * ```
     */
    sizeOf(size: number, evalMsg?: MsgSource): R;
}
