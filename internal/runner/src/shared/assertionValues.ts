/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * The expected and actual values of a failed assertion, as text the interactive page can show side by
 * side. Only the values the error carries are present.
 */
export interface IAssertionValues {
    expected?: string;
    actual?: string;
}

// Long enough for a typical object, short enough that one huge value cannot swamp the page
const _MAX_VALUE_LENGTH = 1000;

// How many levels into nested objects and arrays a value is written before the rest reads [Object]
// or [Array]
const _MAX_DEPTH = 4;

function _limit(text: string): string {
    return text.length > _MAX_VALUE_LENGTH ? text.substring(0, _MAX_VALUE_LENGTH) + "..." : text;
}

/** `target`'s own property `key`, read without running a getter on it -- or undefined. */
function _ownProp(target: any, key: string): PropertyDescriptor | undefined {
    try {
        return Object.getOwnPropertyDescriptor(target, key);
    } catch (e) {
        // A proxy whose trap throws
        return undefined;
    }
}

/** A property as {@link _format} writes it: its value, or what kind of accessor it is. */
function _formatProp(desc: PropertyDescriptor | undefined, depth: number, seen: any[]): string {
    if (!desc) {
        return "undefined";
    }

    if (desc.get || desc.set) {
        return desc.get && desc.set ? "[Getter/Setter]" : (desc.get ? "[Getter]" : "[Setter]");
    }

    return _format(desc.value, depth, seen);
}

/** Each entry `write` gives, joined by commas, ending in "..." once the text is already too long to show. */
function _entries(count: number, write: (idx: number) => string): string {
    var parts: string[] = [];
    var length = 0;
    for (var lp = 0; lp < count; lp++) {
        if (length > _MAX_VALUE_LENGTH) {
            parts.push("...");
            break;
        }

        var part = write(lp);
        length += part.length + 1;
        parts.push(part);
    }

    return parts.join(",");
}

function _format(value: any, depth: number, seen: any[]): string {
    var type = typeof value;
    if (type === "string") {
        return JSON.stringify(value);
    }

    if (type === "symbol") {
        // Explicitly, as Symbol(...) concatenated into a string throws
        return Symbol.prototype.toString.call(value);
    }

    if (value === null || value === undefined || type === "number" || type === "boolean" || type === "bigint") {
        return String(value);
    }

    if (type === "function") {
        var name = _ownProp(value, "name");
        return "[Function" + (name && typeof name.value === "string" && name.value ? ": " + name.value : "") + "]";
    }

    if (seen.indexOf(value) !== -1) {
        return "[Circular]";
    }

    var isArray = Array.isArray(value);
    if (depth >= _MAX_DEPTH) {
        return isArray ? "[Array]" : "[Object]";
    }

    if (value instanceof Date) {
        var time = Date.prototype.getTime.call(value);
        return time === time ? Date.prototype.toISOString.call(value) : "Invalid Date";
    }

    if (value instanceof RegExp) {
        return RegExp.prototype.toString.call(value);
    }

    var inner = seen.concat([ value ]);
    if (isArray) {
        return "[" + _entries(value.length, function(idx) {
            return _formatProp(_ownProp(value, String(idx)), depth + 1, inner);
        }) + "]";
    }

    var keys = Object.keys(value);
    return "{" + _entries(keys.length, function(idx) {
        return JSON.stringify(keys[idx]) + ":" + _formatProp(_ownProp(value, keys[idx]), depth + 1, inner);
    }) + "}";
}

/**
 * A value as it reads in code: strings quoted, numbers, booleans, symbols and the like as written, and
 * objects and arrays in JSON's shape. It runs nothing of the value's own -- no getter (an accessor
 * reads [Getter]), no toJSON, no toString -- and never throws: it runs inside the assertion it
 * describes, which must fail with its own error, and leave the test's values as they were.
 */
export function formatAssertionValue(value: any): string {
    try {
        return _limit(_format(value, 0, []));
    } catch (e) {
        // A revoked proxy, or one whose traps throw
        return "[object]";
    }
}

/**
 * The expected and actual values a failed assertion's error carries, formatted for display, or `null`
 * when it carries neither -- as with an error the code under test threw rather than an assertion. An
 * error whose values are all `undefined` carries nothing worth showing either: `assert.fail()` has an
 * `actual`, but it is never set.
 */
export function getAssertionValues(error: any): IAssertionValues | null {
    try {
        if (!error || typeof error !== "object") {
            return null;
        }

        var hasExpected = "expected" in error;
        var hasActual = "actual" in error;
        if (!(hasExpected && error.expected !== undefined) && !(hasActual && error.actual !== undefined)) {
            return null;
        }

        var values: IAssertionValues = {};
        if (hasExpected) {
            values.expected = formatAssertionValue(error.expected);
        }

        if (hasActual) {
            values.actual = formatAssertionValue(error.actual);
        }

        return values;
    } catch (e) {
        // An error object of the test's own whose properties throw: there is still its message
        return null;
    }
}

/**
 * Adds the values a failed assertion's `error` carries (see {@link getAssertionValues}) to the assert
 * event the test frame or worker sends the page, and returns the event.
 */
export function addAssertionValues<T>(event: T, error: any): T & IAssertionValues {
    var target: any = event;
    var values = getAssertionValues(error);
    if (values && values.expected !== undefined) {
        target.expected = values.expected;
    }

    if (values && values.actual !== undefined) {
        target.actual = values.actual;
    }

    return target;
}
