/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrIndexOf, arrSlice, isArray, isNullOrUndefined, isObject, objDefine, objForEachKey } from "@nevware21/ts-utils";
import { IAssertConfig, IAssertConfigDefaults } from "./interface/IAssertConfig";
import { cyan } from "@nevware21/chromacon";
import { IFormatter } from "./interface/IFormatter";

function _noOpFn() {
    // No operation function
}

/**
 * @internal
 * @ignore
 * The default configuration values.
 * Note: formatters defaults to empty array - default formatters are automatically
 * used as fallback internally by the formatting logic.
 *
 * Default finalize is false - when set to true without finalizeFn, uses
 * [escapeAnsi](https://nevware21.github.io/chromacon/typedoc/core/functions/escapeAnsi.html)
 * from [@nevware21/chromacon](https://nevware21.github.io/chromacon/).
 */
const DEFAULT_CONFIG: IAssertConfig = (/* $__PURE__ */{
    isVerbose: false,
    fullStack: false,
    defAssertMsg: "assertion failure",
    defFatalMsg: "fatal assertion failure",
    format: {
        finalize: false,
        finalizeFn: undefined,
        formatters: []
    },
    circularMsg: () => cyan("[<Circular>]")
});

function _mergeConfig(target: any, source: any) {
    objForEachKey(source, (key: string) => {
        if (isArray(source[key])) {
            target[key] = arrSlice(source[key], 0)
        } else if (isObject(source[key])) {
            if (!isObject(target[key])) {
                target[key] = {};
            }

            _mergeConfig(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    });

    return target;
}

function _defineProp(target: any, values: any, defaults: any, key: string) {
    objDefine(target, key, {
        g: () => values[key],
        s: (value) => {
            if (isArray(values[key])) {
                values[key] = (isNullOrUndefined(value) ? arrSlice(defaults[key], 0) : value);
            } else if (isObject(values[key])) {
                _mergeConfig(values[key], (isNullOrUndefined(value) ? defaults[key] : value));
            } else {
                values[key] = (isNullOrUndefined(value) ? defaults[key] : value);
            }
        }
    });
}

export const assertConfig: IAssertConfigDefaults = (/* #__PURE__*/function() {
    let theValues: IAssertConfig =  _mergeConfig({}, DEFAULT_CONFIG);

    function _removeFormatter(formatter: IFormatter) {
        let formatters = theValues.format.formatters;
        if (formatters) {
            const index = arrIndexOf(formatters, formatter);
            if (index !== -1) {
                formatters.splice(index, 1);
            }
        }
    }

    function _setupProps() {
        // Provide an accessor for each of the supported configuration values.
        objForEachKey(DEFAULT_CONFIG, (key: keyof IAssertConfig) => {
            _defineProp(theConfig, theValues, DEFAULT_CONFIG, key);
        });
    }

    let theConfig: IAssertConfigDefaults = {
        reset: () => {
            theValues = _mergeConfig({}, DEFAULT_CONFIG);
            _setupProps();
        },
        clone: (options?: IAssertConfig) => {
            // Copy all of the values from the current config to the new config.
            let newConfig = _mergeConfig({}, theValues);
            if (options) {
                _mergeConfig(newConfig, options);
            }

            return newConfig;
        },
        addFormatter: (formatter: IFormatter) => {
            let rmFn: () => void;
            let formatters = theValues.format.formatters;
            if (arrIndexOf(formatters, formatter) === -1) {
                formatters?.push(formatter);
                rmFn = function () {
                    _removeFormatter(formatter);
                };
            }

            return {
                rm: rmFn || _noOpFn
            };
        },
        removeFormatter: _removeFormatter
    };

    _setupProps();

    return theConfig;
})();
