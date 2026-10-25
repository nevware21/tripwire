/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IConfigInst } from "../interfaces/IConfigInst";

/**
 * @internal
 * @ignore
 * Internal helper to format a value for display in an error messages.
 * @param opts - Configuration instance containing the formatters to use.
 * @param value - The value to format.
 * @returns - A string representation of the value.
 */
export function _formatValue(opts: IConfigInst, value: any): string {
    return opts.$ops.formatMgr.format(value);
}
