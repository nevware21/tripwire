/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAllOp } from "./IAllOp";
import { IAnyOp } from "./IAnyOp";
import { IncludeFn } from "../funcs/IncludeFn";
import { MsgSource } from "../../type/MsgSource";
import { ArrayLikeOrSizedIterable } from "../../type/ArrayLikeOrIterable";

/**
 * Represents the include operations for the assertion scope.
 * @since 0.1.2
 * @template R - The type of the result of the operation.
 */
export interface IIncludeOp<R> extends IncludeFn<R> {

    /**
     * Provides access to additional operations based on the {@link IAllOp} interface
     * for the assertion scope.
     */
    any: IAnyOp<R>;

    /**
     * Provides access to additional operations based on the {@link IAnyOp} interface
     * for the assertion scope.
     */
    all: IAllOp<R>;

    /**
     * Asserts that the target collection includes all members of the expected collection (order doesn't matter).
     * Uses strict equality (===) for comparison.
     * Both target and expected must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
     * @since 0.1.5
     * @param expected - The expected subset collection to check for (must be an {@link ArrayLikeOrSizedIterable}).
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([1, 2, 3, 4]).includes.members([2, 3]);  // Passes - all members present
     * expect([1, 2, 3]).includes.members([1, 4]);     // Fails - 4 not present
     * ```
     */
    members(expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R;

    /**
     * Asserts that the target collection includes all members of the expected collection in the same order
     * (but may have additional members in between).
     * Uses strict equality (===) for comparison.
     * Both target and expected must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
     * @since 0.1.5
     * @param expected - The expected subset collection to check for (must be an {@link ArrayLikeOrSizedIterable}).
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([1, 2, 3, 4]).includes.orderedMembers([1, 2, 3]);  // Passes
     * expect([1, 2, 3, 4]).includes.orderedMembers([2, 4]);     // Passes - with gaps
     * expect([1, 2, 3, 4]).includes.orderedMembers([3, 2]);     // Fails - wrong order
     * ```
     */
    orderedMembers(expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R;

    /**
     * Asserts that the target collection has the same members as the expected collection, regardless of order.
     * Uses deep equality when in deep context, strict equality otherwise.
     * Both target and expected must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
     * @since 0.1.5
     * @param expected - The expected collection to compare against (must be an {@link ArrayLikeOrSizedIterable}).
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([{a: 1}, {b: 2}]).has.deep.include.sameMembers([{b: 2}, {a: 1}]);  // Passes
     * expect([[1, 2], [3, 4]]).has.deep.include.sameMembers([[3, 4], [1, 2]]);  // Passes
     * ```
     */
    sameMembers(expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R;

    /**
     * Asserts that the target collection has the same members in the same order as the expected collection.
     * Uses deep equality when in deep context, strict equality otherwise.
     * Both target and expected must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
     * @since 0.1.5
     * @param expected - The expected collection to compare against (must be an {@link ArrayLikeOrSizedIterable}).
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([{a: 1}, {b: 2}]).has.deep.include.sameOrderedMembers([{a: 1}, {b: 2}]);  // Passes
     * expect([{a: 1}, {b: 2}]).has.deep.include.sameOrderedMembers([{b: 2}, {a: 1}]);  // Fails - different order
     * ```
     */
    sameOrderedMembers(expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R;

    /**
     * Asserts that the target collection starts with the expected members in consecutive order from the beginning.
     * Uses deep equality when in deep context, strict equality otherwise.
     * Both target and expected must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
     * @since 0.1.5
     * @param expected - The expected starting sequence (must be an {@link ArrayLikeOrSizedIterable}).
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([1, 2, 3, 4]).includes.startsWithMembers([1, 2]);  // Passes
     * expect([1, 2, 3, 4]).includes.startsWithMembers([2, 3]);  // Fails - doesn't start with [2, 3]
     * ```
     */
    startsWithMembers(expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R;

    /**
     * Asserts that the target collection ends with the expected members in consecutive order at the end.
     * Uses deep equality when in deep context, strict equality otherwise.
     * Both target and expected must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
     * @since 0.1.5
     * @param expected - The expected ending sequence (must be an {@link ArrayLikeOrSizedIterable}).
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([1, 2, 3, 4]).includes.endsWithMembers([3, 4]);  // Passes
     * expect([1, 2, 3, 4]).includes.endsWithMembers([2, 3]);  // Fails - doesn't end with [2, 3]
     * ```
     */
    endsWithMembers(expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R;

    /**
     * Asserts that the target collection contains a subsequence matching the expected members.
     * The members must appear in the specified order but don't need to be consecutive -
     * other elements can appear between them.
     * Uses deep equality when in deep context, strict equality otherwise.
     * Both target and expected must conform to {@link ArrayLikeOrSizedIterable} but can be different concrete types.
     * @since 0.1.5
     * @param expected - The expected ordered subsequence (must be an {@link ArrayLikeOrSizedIterable}).
     * @param evalMsg - Optional error message.
     * @example
     * ```typescript
     * expect([1, 2, 3, 4, 5]).includes.subsequence([2, 4, 5]);  // Passes - in order with gaps
     * expect([1, 2, 3, 4, 5]).includes.subsequence([5, 3, 1]);  // Fails - wrong order
     * expect([{a: 1}, {b: 2}, {c: 3}]).deep.includes.subsequence([{a: 1}, {c: 3}]);  // Passes with deep equality
     * ```
     */
    subsequence(expected: ArrayLikeOrSizedIterable, evalMsg?: MsgSource): R;
}
