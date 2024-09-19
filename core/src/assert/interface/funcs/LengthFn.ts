/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../types";

/**
 * Represents a function that asserts the length of a value.
 * @template R - The type of the result of the operation.
 * @param length - The expected length of the value.
 * @param evalMsg - Optional. The message to display if the assertion fails.
 * @returns The result of the operation, which will generally be the existing
 * {@link IAssertScope.that} object.
 */
export interface LengthFn<R> {
    (length: number, evalMsg?: MsgSource): R;
}
