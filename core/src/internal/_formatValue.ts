/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IScopeContext } from "../assert/interface/IScopeContext";

/**
 * @internal
 * @ignore
 * Internal helper to format a value for display in an error messages.
 * @param ctx - Scope context containing the configuration and formatters to use.
 * @param value - The value to format.
 * @returns - A string representation of the value.
 */
export function _formatValue(ctx: IScopeContext, value: any): string {
    return ctx.opts.$ops.formatMgr.format(value);
}
