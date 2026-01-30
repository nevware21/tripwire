/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrAppend, arrForEach, arrIndexOf, isArray } from "@nevware21/ts-utils";
import { IFormatManager } from "../interface/IFormatManager";
import { IFormatter } from "../interface/IFormatter";
import { IRemovable } from "../interface/IRemovable";
import { _noOpFn } from "./_noOp";

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
export function createFormatMgr(parent?: IFormatManager): IFormatManager {
    const _formatters: IFormatter[] = [];

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

    return {
        addFormatter: _addFormatter,
        removeFormatter: _removeFormatter,
        getFormatters: _getFormatters,
        forEach: _forEach,
        reset: _reset
    };
}
