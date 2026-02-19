/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrSlice, getDeferred, ICachedValue, isArray, isNullOrUndefined, isObject, isPlainObject,
    objDefine, objForEachKey, objIs
} from "@nevware21/ts-utils";
import { IConfig } from "../interface/IConfig";
import { IConfigInst } from "../interface/IConfigInst";
import { IFormatter } from "../interface/IFormatter";
import { IFormatManager } from "../interface/IFormatManager";
import { createFormatMgr } from "../internal/formatManager";
import { IConfigApi } from "../interface/IConfigApi";

function _mergeConfig(target: any, source: any, isRoot: boolean) {
    if (!isNullOrUndefined(source)) {
        objForEachKey(source, (key: string) => {
            // Skip the $ops property
            if (!isRoot || (isRoot && key !== "$ops")) {
                if (isArray(source[key])) {
                    target[key] = arrSlice(source[key], 0);
                } else if (isObject(source[key])) {
                    if (!isObject(target[key])) {
                        target[key] = {};
                    }

                    _mergeConfig(target[key], source[key], false);
                } else {
                    target[key] = source[key];
                }
            }
        });
    }

    return target;
}

function _defineProp(target: any, values: any, defaults: any, key: string, isRoot: boolean) {
    let theDefaults = defaults[key];
    let cachedValue: any;
    let newTarget: any;

    function _get() {
        let result = values[key];
        if (isPlainObject(result)) {
            // If we have an object, we need to setup the properties on it
            // but only once per object instance (property value)
            // The objIs check is to handle the case instead of the object being merged with new values
            // we get are assigned a new object instance (unexpected, but possible)
            if (!newTarget || !objIs(result, cachedValue)) {
                cachedValue = result;
                // Effectively we are lazily creating a new config accessor object for this property
                newTarget = _setupProps({}, cachedValue, theDefaults, false);
            }

            result = newTarget;
        }

        return result;
    }

    function _set(value: any) {
        if (isArray(values[key])) {
            // Reset the array to either the original default or the new array (No merge)
            values[key] = (isNullOrUndefined(value) ? arrSlice(defaults[key], 0) : value);
        } else if (isPlainObject(values[key])) {
            // Merge the new values onto the existing object, may or may not be a new object and
            // may or may not be a partial object. If the value is null or undefined, we reset to the defaults
            // IMPORTANT: We do NOT replace the object reference as any previous "bindings" would be lost
            // So we always merge into the existing object
            _mergeConfig(values[key], (isNullOrUndefined(value) ? defaults[key] : value), false);
        } else {
            // Set the new value or reset to the default
            values[key] = (isNullOrUndefined(value) ? defaults[key] : value);
        }
    }

    // Define a property with getter and setter for non-array, non-object values
    objDefine(target, key, {
        g: _get,
        s: _set
    });
}

/**
 * Create getters and setters for each of the configuration properties, excluding `$ops`.
 * Using `theValues` as the backing store for the actual values of the configuration.
 * @param target - The target configuration object
 * @param theValues - The backing store for the configuration values
 * @returns A configured {@link IConfig} object
 */
function _setupProps(target: any, theValues: any, defaultValues: Readonly<IConfig>, isRoot: boolean): IConfig {
    // Provide an accessor for each of the supported configuration values.
    objForEachKey(defaultValues, (key: keyof IConfig) => {
        if (!isRoot || (isRoot && key !== "$ops")) {
            _defineProp(target, theValues, defaultValues, key, isRoot);
        }
    });

    return target;
}

export function _createConfig(getDefaults: () => Readonly<IConfig>, parentFormatMgr?: ICachedValue<IFormatManager>): IConfigInst {
    let defaultValues = getDefaults();
    let theValues = _mergeConfig({}, defaultValues, true);
    let formatMgr: IFormatManager;
    let theConfig: IConfigInst;

    function _getFormatMgr(): IFormatManager {
        if (!formatMgr) {
            formatMgr = createFormatMgr(theConfig, parentFormatMgr ? parentFormatMgr.v : null);
        }

        return formatMgr;
    }

    let baseConfig = _setupProps({}, theValues, defaultValues, true);
    let theConfigApi: IConfigApi<IConfigInst> = {
        formatMgr: null,
        reset: () => {
            // we should be able to just reset the values back to the defaults
            _mergeConfig(theValues, defaultValues, true);

            if (formatMgr) {
                // Clears all of the custom formatters restoring the defaults
                formatMgr.reset();
            }
        },
        clone: (options?: IConfig) => {
            return _createConfig(() => {
                // Copy all of the values from the current config to the new config.
                let newValues = _mergeConfig({}, theValues, true);
                if (options) {
                    // Apply any overrides
                    _mergeConfig(newValues, options, true);
                }

                return newValues;
            },
            getDeferred(_getFormatMgr));
        },
        addFormatter: (formatter: IFormatter | Array<IFormatter>) => {
            return _getFormatMgr().addFormatter(formatter);
        }
    };

    objDefine(theConfigApi, "formatMgr", {
        g: () => {
            return _getFormatMgr();
        }
    });

    // Make sure we don't accidentally expose the internal format manager instance and cause issues
    // with cloning and dumping the config.
    objDefine(theConfigApi as any, "toJSON", {
        v: () => {
            return theConfig.$ops.formatMgr.format(theConfigApi);
        }
    });

    theConfig = objDefine(baseConfig as IConfigInst, "$ops", {
        v: theConfigApi
        // e: false
    });

    return theConfig;
}
