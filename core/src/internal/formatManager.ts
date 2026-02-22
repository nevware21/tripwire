/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrAppend, arrForEach, arrIndexOf, asString, dumpObj, getDeferred, ICachedValue, isArray, isFunction, isPrimitive, objDefine } from "@nevware21/ts-utils";
import { IFormatManager } from "../interface/IFormatManager";
import { eFormatResult, IFormatCtx, IFormattedValue, IFormatter } from "../interface/IFormatter";
import { IRemovable } from "../interface/IRemovable";
import { _noOpFn } from "./_noOp";
import { IConfigInst } from "../interface/IConfigInst";
import { EMPTY_STRING } from "../assert/internal/const";
import { escapeAnsi, yellow } from "@nevware21/chromacon";
import { _defaultFormatters } from "./_defaultFormatters";

let _circularTrack: any[];
function _withCircularTrack(fn: () => string): string {
    let currentTrack = _circularTrack;

    _circularTrack = [];
    try {
        return fn();
    } finally {
        _circularTrack = currentTrack;
    }
}

function _isVisited(value: any, visited: any[], maxDepth?: number): boolean {
    let result = false;

    if (!isPrimitive(value)) {
        const depth = visited.length;
        if (depth > 0) {
            if (depth === 1) {
                result = visited[0] === value;
            } else if (maxDepth && depth > maxDepth) {
                // Depth limit optimization - most structures don't go beyond 50 levels
                // This prevents pathological cases while maintaining reasonable depth
                result = true; // Treat as circular to prevent deep recursion
            } else {
                // Search backwards - more likely to find recent values
                // Most circular references are to recently visited objects (better cache locality)
                for (let idx = depth - 1; idx >= 0; idx--) {
                    if (visited[idx] === value) {
                        result = true;
                        break;
                    }
                }
            }
        }
    }

    return result;
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
    let formatCtx: IFormatCtx = {
        cfg: cfg,
        format: (value: any): string => {
            if (!_circularTrack) {
                _circularTrack = [];
            }

            let maxDepth = (cfg.format && cfg.format.maxFormatDepth) || 50;
            let isVisited = _isVisited(value, _circularTrack, maxDepth);
            if (isVisited) {
                // Circular reference detected or max depth exceeded
                return cfg.circularMsg() || EMPTY_STRING;
            }

            _circularTrack.push(value);

            let formattedValue: string;
            try {
                formattedValue = _doFormat(formatCtx, value);
            } finally {
                _circularTrack.pop();
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
 * @param ctx - Scope context containing the configuration and formatters to use.
 * @param value - The value to format.
 * @returns - A string representation of the value.
 */
function _formatCtxValue(formatCtx: IFormatCtx, value: any): string {
    let formatOpts = formatCtx.cfg.format;

    return _withCircularTrack(() => {
        let result = _doFormat(formatCtx, value);

        // Apply finalization if configured
        if (formatOpts && formatOpts.finalize) {
            if (isFunction(formatOpts.finalizeFn)) {
                result = formatOpts.finalizeFn(result);
            } else {
                result = escapeAnsi(result);
            }
        }

        return result;
    });
}

/**
 * Creates a new format manager instance that manages value formatters.
 * Provides centralized formatter registration and retrieval.
 * Supports parent-child hierarchy to allow child managers to inherit formatters from parent managers.
 * Child formatters take precedence over parent formatters (child formatters are checked first).
 *
 * @param parent - Optional parent manager for inheritance
 * @returns A new format manager
 * @since 0.1.5
 * @group Formatter
 */
export function createFormatMgr(cfg: IConfigInst, parent?: IFormatManager): IFormatManager {
    const _formatters: IFormatter[] = [];
    let formatCtx: ICachedValue<IFormatCtx> = getDeferred(() => {
        return _createFormatCtx(cfg);
    });

    function _addFormatter(formatter: IFormatter | Array<IFormatter>): IRemovable {
        arrAppend(_formatters, formatter);

        let result: IRemovable = {
            rm: () => {
                _removeFormatter(formatter);
                result.rm = _noOpFn;
            }
        };

        return result;
    }

    function _removeFormatter(formatter: IFormatter | Array<IFormatter>): void {
        if (isArray(formatter)) {
            arrForEach(formatter, _removeFormatter);
        } else {
            const idx = arrIndexOf(_formatters, formatter);
            if (idx >= 0) {
                _formatters.splice(idx, 1);
            }
        }
    }

    function _forEach(callback: (formatter: IFormatter) => void | number): void {
        let done = false;

        // Add own formatters first (they have higher priority - checked first)
        arrForEach(_formatters, (formatter: IFormatter): void | number => {
            if (callback(formatter) === -1) {
                done = true;
                return -1;
            }
        });

        // Add parent formatters (they have lower priority - checked after own formatters)
        if (parent && !done) {
            parent.forEach(callback);
        }
    }

    function _getFormatters(): Readonly<IFormatter[]> {
        let result: IFormatter[] = [];

        _forEach((formatter) => {
            result.push(formatter);
        });

        return result;
    }

    function _reset(): void {
        _formatters.length = 0;
    }

    function _format(value: any): string {
        return _formatCtxValue(formatCtx.v, value);
    }

    return {
        addFormatter: _addFormatter,
        removeFormatter: _removeFormatter,
        getFormatters: _getFormatters,
        forEach: _forEach,
        reset: _reset,
        format: _format

    };
}
