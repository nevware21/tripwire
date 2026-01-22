/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isFunction, isString } from "@nevware21/ts-utils";
import { MsgSource } from "../type/MsgSource";

/**
 * @internal
 * Helper function to determine if a value is a MsgSource (string or zero-arg function returning string).
 * @param value - The value to check.
 * @returns True if the value is a MsgSource, false otherwise.
 */
export function _isMsgSource(value: any): value is MsgSource {
    if (isString(value) || (isFunction(value) && value.length === 0)) {
        return true;
    }

    return false;
}