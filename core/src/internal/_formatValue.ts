/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, asString, dumpObj, isFunction, isPrimitive, objDefine } from "@nevware21/ts-utils";
import { EMPTY_STRING } from "../assert/internal/const";
import { eFormatResult, IFormatCtx, IFormattedValue } from "../interface/IFormatter";
import { escapeAnsi, yellow } from "@nevware21/chromacon";
import { IFormatter } from "../interface/IFormatter";
import { IConfigInst } from "../interface/IConfigInst";
import { _defaultFormatters } from "./_defaultFormatters";


function _isVisited(value: any, visited: any[]): boolean {
    if (isPrimitive(value)) {
        return false;
    }

    for (let idx = 0; idx < visited.length; idx++) {
        if (visited[idx] === value) {
            return true;
        }
    }

    return false;
}

/**
 * Perform the default formatting of a value using the provided format context.
 * @param formatCtx The format context to use for formatting the value.
 * @param value The value to format.
 * @returns A string representation of the value.
 */
function _doFormat(formatCtx: IFormatCtx, value: any): string {
    let formattedValue: IFormattedValue;
    let result: string;

    function _format(formatter: IFormatter) {
        try {
            let fn = formatter.value;

            if (isFunction(fn)) {
                let formatted = fn(formatCtx, value);
                if (formatted && (formatted.res === eFormatResult.Ok || formatted.res === eFormatResult.Continue)) {
                    formattedValue = formatted;
                    if (formatted.res === eFormatResult.Ok) {
                        return -1;
                    }
                }
            }
        } catch (e) {
            formattedValue = {
                res: eFormatResult.Failed,
                err: e,
                val: asString(value)
            };
        }
    }
    
    try {
        // Process the custom formatters first
        formatCtx.cfg.$ops.formatMgr.forEach(_format);
        if (!formattedValue || formattedValue.res !== eFormatResult.Ok) {
            // Iterate through the default formatters to find one that can format the value
            arrForEach(_defaultFormatters, _format);
        }

        if (formattedValue) {
            if (formattedValue.res === eFormatResult.Ok || formattedValue.res === eFormatResult.Continue) {
                result = formattedValue.val;
            } else if (formattedValue.res === eFormatResult.Failed) {
                result = dumpObj(formattedValue.err);
            } else {
                result = asString(value);
            }
        } else {
            result = asString(value);
        }
    } catch (e) {
        result = yellow("(" + _doFormat(formatCtx, e) + ")");
    }

    return result;
}

/**
 * @internal
 * @ignore
 * Creates a format context bound to the supplied scope context.
 * The returned context handles circular references while formatting values.
 * @param ctx - The scope context used to resolve formatting options.
 * @returns A format context that can be passed to `_doFormat` or used via its `format` method.
 */
function _createFormatCtx(cfg: IConfigInst): IFormatCtx {
    let visited: any[] = [];

    let formatCtx: IFormatCtx = {
        cfg: cfg,
        format: (value: any): string => {
            let isVisited = _isVisited(value, visited);
            if (isVisited) {
                // Circular reference detected
                return cfg.circularMsg() || EMPTY_STRING;
            }

            visited.push(value);

            let formattedValue: string;
            try {
                formattedValue = _doFormat(formatCtx, value);
            } finally {
                visited.pop();
            }

            return formattedValue;
        }
    };

    return objDefine(formatCtx, "cfg", { v: cfg, w: false });
}

/**
 * @internal
 * @ignore
 * Internal helper to format a value for display in an error messages.
 * @param cfg - Configuration instance containing the formatters to use.
 * @param value - The value to format.
 * @returns - A string representation of the value.
 */
export function _formatValue(cfg: IConfigInst, value: any): string {
    let formatCtx = _createFormatCtx(cfg);
    let formatOpts = formatCtx.cfg.format;
    let result = _doFormat(formatCtx, value);
    
    if (formatOpts && formatOpts.finalize) {
        if (isFunction(formatOpts.finalizeFn)) {
            result = formatOpts.finalizeFn(result);
        } else {
            result = escapeAnsi(result);
        }
    }

    return result;
}
