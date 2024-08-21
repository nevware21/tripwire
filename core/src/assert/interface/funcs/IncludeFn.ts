/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "../types";

/**
 * Represents a function that asserts whether the value includes a matching value and an optional evaluation message.
 * @template R - The type of the result of the operation.
 * @param match - The match to include.
 * @param evalMsg - The optional evaluation message.
 * @returns The result of the operation, which will generally be the existing
 * {@link IAssertScope.that} object.
 */
export interface IncludeFn<R> {
    (match: any, evalMsg?: MsgSource): R;
}