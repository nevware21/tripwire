/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../types";
import { IPropertyResultOp } from "./IPropertyResultOp";

/**
 * Represents an interface that provides assertion operations for nested properties
 * using dot notation (e.g., "a.b.c").
 * @template R - The type of the result of the operation.
 * @since 0.1.5
 */
export interface INestedOp<R> {
    /**
     * Asserts that the object has a nested property using dot notation.
     * When a value is provided, also checks that the property value equals the expected value.
     * @param path - The dot-separated path to the property (e.g., "a.b.c").
     * @param value - The expected value of the property (optional).
     * @param evalMsg - The message to display if the assertion fails.
     * @returns The property result operation for chaining.
     * @since 0.1.5
     * @example
     * ```typescript
     * expect({ a: { b: { c: 1 } } }).to.have.nested.property('a.b.c');
     * expect({ a: { b: { c: 1 } } }).to.have.nested.property('a.b.c', 1);
     * expect({ a: { b: 2 } }).to.not.have.nested.property('a.b.c');
     * ```
     */
    property(path: string, value?: any, evalMsg?: MsgSource): IPropertyResultOp;

    /**
     * Asserts that the value contains the expected using nested property matching.
     * Each property in the expected is matched against the value using dot notation.
     * @param expected - The object with properties to match.
     * @param evalMsg - The message to display if the assertion fails.
     * @returns The assertion result.
     * @since 0.1.5
     * @example
     * ```typescript
     * expect({ a: { b: { c: 1 } } }).to.nested.include({ 'a.b.c': 1 });
     * expect({ a: { b: { c: 1 } }, d: 2 }).to.nested.include({ 'a.b': { c: 1 } });
     * ```
     */
    include(expected: any, evalMsg?: MsgSource): R;

    /**
     * Alias for `include`.
     * @param expected - The object with properties to match.
     * @param evalMsg - The message to display if the assertion fails.
     * @returns The assertion result.
     * @since 0.1.5
     */
    includes(expected: any, evalMsg?: MsgSource): R;

    /**
     * Alias for `include`.
     * @param expected - The object with properties to match.
     * @param evalMsg - The message to display if the assertion fails.
     * @returns The assertion result.
     * @since 0.1.5
     */
    contain(expected: any, evalMsg?: MsgSource): R;

    /**
     * Alias for `include`.
     * @param expected - The object with properties to match.
     * @param evalMsg - The message to display if the assertion fails.
     * @returns The assertion result.
     * @since 0.1.5
     */
    contains(expected: any, evalMsg?: MsgSource): R;
}
