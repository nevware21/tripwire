/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isArray, isObject, isString, isStrictNullOrUndefined, asString } from "@nevware21/ts-utils";
import { MsgSource } from "../type/MsgSource";
import { IAssertScope } from "../interface/IAssertScope";
import { IPropertyResultOp } from "../interface/ops/IPropertyResultOp";
import { propertyResultOp } from "../ops/propertyResultOp";
import { _deepEqual } from "./equal";

export function _parseNestedPath(value: string): string[] {
    let tokens: string[] = [];
    let inEscape = false;
    let lp = 0;

    while (value && lp < value.length) {
        let ch = value.charAt(lp++);

        if (!inEscape) {
            if (ch === "\\") {
                inEscape = true;
            } else if (ch === ".") {
                // Dot indicates a new token
                tokens.push(value.substring(0, lp-1));
                value = value.substring(lp);
                lp = 0;
            } else if (ch === "[") {
                // Array indexer
                let endIdx = value.indexOf("]", lp);
                if (endIdx !== -1) {
                    let indexer = value.substring(lp, endIdx);
                    if (lp > 1) {
                        tokens.push(value.substring(0, lp-1));
                    }

                    tokens.push(indexer);
                    if (value.length > endIdx + 1 && value[endIdx + 1] === ".") {
                        value = value.substring(endIdx + 2);
                    } else {
                        value = value.substring(endIdx + 1);
                    }

                    if (value.length === 0) {
                        value = null;
                    }

                    lp = 0;
                }
            }
        } else {
            inEscape = false;
            // remove the escape character
            value = value.substring(0, lp-2) + ch + value.substring(lp);
        }
    }

    if (value !== null) {
        tokens.push(value);
    }

    return tokens;
}

/**
 * Helper function to get a nested property value using dot notation
 * @param target - The object to traverse
 * @param path - The dot-separated path to the property
 * @returns An object containing the value and a flag indicating if the property exists
 */
function _getNestedProperty(target: any, path: string): { value: any; exists: boolean } {
    let result = false;
    let current = target;

    if (!isStrictNullOrUndefined(target)) {
        let tokens = _parseNestedPath(asString(path));
        let lp = 0;

        result = true;
        while (result && lp < tokens.length) {
            let token = tokens[lp++];

            if (isStrictNullOrUndefined(current) || (!isObject(current) && !isArray(current)) || !(token in current)) {
                result = false;
            } else {
                current = current[token];
            }
        }
    }

    return { value: result ? current : undefined, exists: result };
}



/**
 * Asserts that the current {@link IScopeContext} value has the specified nested property
 * using dot notation (e.g., "a.b.c").
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param path - The dot-separated path to the property.
 * @param value - The expected value of the property (optional).
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the nested property does not exist.
 * @throws An {@link AssertionFailure} if the property value does not match the expected value (when provided).
 * @since 0.1.5
 */
export function hasNestedPropertyFunc(this: IAssertScope, path: string, value?: any, evalMsg?: MsgSource): IPropertyResultOp {
    let scope = this;
    let context = scope.context;

    context.set("property", path);

    if (!isString(path)) {
        context.fatal(evalMsg || "expected {property} to be a string using nested syntax");
    }

    let valueResult = _getNestedProperty(context.value, path);

    if (arguments.length > 1) {
        context.set("expected", value);
        if (valueResult.exists) {
            context.set("nestedValue", valueResult.value);
            context.eval(valueResult.value == value, evalMsg || "expected {value} to have a nested property {property} equal {expected}, but got {nestedValue}");
        } else {
            // Property doesn't exist - fail the assertion
            context.eval(false, evalMsg || "expected {value} to have a nested property {property} equal {expected}");
        }
    } else {
        // No value provided, just check property existence
        context.eval(valueResult.exists, evalMsg || "expected {value} to have a nested property {property}");
    }

    return propertyResultOp(scope, valueResult.value);
}

/**
 * Asserts that the current {@link IScopeContext} value has the specified nested property
 * using dot notation and its value deeply equals the expected value.
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param path - The dot-separated path to the property.
 * @param value - The expected value of the property.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The new "instance" (object) to be used as the `this` for the chained operations.
 * @throws An {@link AssertionFailure} if the nested property does not exist.
 * @throws An {@link AssertionFailure} if the property value does not deeply equal the expected value.
 * @since 0.1.5
 */
export function hasDeepNestedPropertyFunc(this: IAssertScope, path: string, value?: any, evalMsg?: MsgSource): IPropertyResultOp {
    let scope = this;
    let context = scope.context;

    context.set("property", path);

    if (!isString(path)) {
        context.fatal(evalMsg || "expected {property} to be a string using nested syntax");
    }

    let valueResult = _getNestedProperty(context.value, path);

    if (arguments.length > 1) {
        context.set("expected", value);
        if (valueResult.exists) {
            context.set("nestedValue", valueResult.value);
            context.eval(valueResult.exists && _deepEqual(valueResult.value, value), evalMsg || "expected {value} to have a nested property {property} deeply equal {expected}, but got {nestedValue}");
        } else {
            // Property doesn't exist - fail the assertion
            context.eval(false, evalMsg || "expected {value} to have a nested property {property} deeply equal {expected}");
        }
    } else {
        // No value provided, just check property existence
        context.eval(valueResult.exists, evalMsg || "expected {value} to have a nested property {property}");
    }

    return propertyResultOp(scope, valueResult.value);
}

/**
 * Asserts that the value contains the expected using nested property matching.
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param expected - The object with properties to match.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The assertion scope.
 * @throws An {@link AssertionFailure} if the value does not contain the expected.
 * @since 0.1.5
 */
export function nestedIncludeFunc(this: IAssertScope, expected: any, evalMsg?: MsgSource): any {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    if (!isObject(expected)) {
        context.set("expected", expected);
        context.eval(false, evalMsg || "expected {expected} to be an object");
        return scope.that;
    }

    // Check each property in expected against value
    for (let key in expected) {
        if (expected.hasOwnProperty(key)) {
            let expectedValue = expected[key];
            let valueResult = _getNestedProperty(value, key);

            context.set("property", key);
            context.set("expected", expectedValue);
            if (valueResult.exists) {
                context.set("nestedValue", valueResult.value);
                context.eval(valueResult.exists && valueResult.value == expectedValue, evalMsg || "expected {value} to have a nested property {property} equal {expected}, but got {nestedValue}");
            } else {
                context.eval(false, evalMsg || "expected {value} to have a nested property {property} equal {expected}, but the property does not exist");
            }
        }
    }

    return scope.that;
}

/**
 * Asserts that the value contains the expected using deep nested property matching.
 * @param this - The current {@link IAssertScope} assertion scope.
 * @param expected - The object with properties to match.
 * @param evalMsg - The message to display if the assertion fails.
 * @returns The assertion scope.
 * @throws An {@link AssertionFailure} if the value does not contain the expected.
 * @since 0.1.5
 */
export function deepNestedIncludeFunc(this: IAssertScope, expected: any, evalMsg?: MsgSource): any {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    if (!isObject(expected)) {
        context.set("expected", expected);
        context.eval(false, evalMsg || "expected {expected} to be an object");
        return scope.that;
    }

    // Check each property in expected against value
    for (let key in expected) {
        if (expected.hasOwnProperty(key)) {
            let expectedValue = expected[key];
            let valueResult = _getNestedProperty(value, key);

            context.set("property", key);
            context.set("expected", expectedValue);
            if (valueResult.exists) {
                context.set("nestedValue", valueResult.value);
                context.eval(valueResult.exists && _deepEqual(valueResult.value, expectedValue), evalMsg || "expected {value} to have a nested property {property} deeply equal {expected}, but got {nestedValue}");
            } else {
                context.eval(false, evalMsg || "expected {value} to have a nested property {property} deeply equal {expected}, but the property does not exist");
            }
        }
    }

    return scope.that;
}
