/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * @internal
 * Internal list of banned properties that cannot be used as operation names.
 */
const _bannedProperties = ["length"];

/**
 * @internal
 * Internal function to check if a property is banned.
 * @param name - The name of the property to check.
 * @returns - True if the property is banned, otherwise false.
 */
export function _isBannedProperty(name: string) {
    return _bannedProperties.indexOf(name) !== -1;
}

/**
 * @internal
 * Internal function to check if the target object is a banned prototype or
 * constructor.
 * @param target - The target object to check.
 * @returns - True if the prototype is banned, otherwise false.
 */
export function _isBannedPrototype(target: any) {
    return !target ||
        target === Object.prototype ||
        target === Array.prototype ||
        target === Function.prototype ||
        target === String.prototype ||
        target === Number.prototype ||
        target === Boolean.prototype ||
        target === Date.prototype ||
        target === RegExp.prototype ||
        target === Error.prototype ||
        target === Object || // This is the base object class
        target === Function || // This is the base function class
        target === String || // This is the base string class
        target === Number || // This is the base number class
        target === Boolean || // This is the base boolean class
        target === Date || // This is the base date class
        target === RegExp || // This is the base regexp class
        target === Error; // This is the base error class
}
