/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { brightGreen, brightRed, dim, gray, green, normal, red, white, yellow } from "@nevware21/chromacon";
import { isObject, isRegExp, isString, objForEachKey, strSubstr, strLeft, strRepeat, asString } from "@nevware21/ts-utils";
import { expect } from "../../../src/assert/expect";
import { AssertionError } from "../../../src/assert/assertionError";
import { assert } from "../../../src/assert/assertClass";
import { EMPTY_STRING } from "../../../src/assert/internal/const";
import { IScopeContext } from "../../../src/assert/interface/IScopeContext";
import { _formatValue } from "../../../src/assert/internal/_formatValue";
import { assertConfig } from "../../../src/assert/config";
import { CHECK_INTERNAL_STACK_FRAME_REGEX } from "../../../src/assert/const";
import { parseStack } from "../../../src/internal/parseStack";

function _showStringDifference(expected: string, actual: string): string {
    let result = EMPTY_STRING;

    let startOffset = 0;
    if (expected.length > 5) {
        startOffset = actual.indexOf(expected.substring(0, 5));
        if (startOffset === -1) {
            startOffset = 0;
        }
    }

    if (startOffset > 0) {
        result = dim(yellow + strRepeat(".", startOffset));
    }

    let lp = 0;
    let match = -1;
    while (lp < expected.length && (lp + startOffset) < actual.length) {
        const char1 = expected[lp];
        const char2 = actual[lp + startOffset];

        if (char1 === char2) {
            if (match !== 0) {
                result += dim + brightGreen;
                match = 0;
            }
            result += ".";
        } else {
            if (match !== 1) {
                result += normal + brightRed;
                match = 1;
            }
            result += char1;
        }
        lp++;
    }

    if (lp < expected.length) {
        if (match !== 1) {
            result += red;
        }
        result += strSubstr(expected, lp);
    }

    result += normal;

    return gray(result);
}

function _colorizeActual(actual: string, expected: string): string {
    let result: string = EMPTY_STRING;

    let startOffset = 0;
    if (expected.length > 5) {
        startOffset = actual.indexOf(expected.substring(0, 5));
        if (startOffset === -1) {
            startOffset = 0;
        }
    }

    if (startOffset > 0) {
        result = normal + green + strLeft(actual, startOffset);
    }

    let lp = 0;
    let match = -1;
    while (lp < expected.length && (lp + startOffset) < actual.length) {
        const char1 = expected[lp];
        const char2 = actual[lp + startOffset];

        if (char1 === char2) {
            if (match !== 0) {
                result += normal + brightGreen;
                match = 0;
            }
            result += char1;
        } else {
            if (match !== 1) {
                result += normal + brightRed;
                match = 1;
            }
            result += char1;
        }
        lp++;
    }

    if (lp < actual.length) {
        if (match !== 1) {
            result += normal + green;
        }
        result += strSubstr(actual, lp);
    }

    result += normal;

    return gray(result);
}

export function checkError(fn: () => void, match?: string | RegExp | Object, checkFrames?: boolean): void {
    let stackStart: Function | undefined = undefined;
    if (!assertConfig.fullStack) {
        stackStart = checkError;
    }

    assert.isFunction(fn, "checkError() fn must be a function");
    
    let preContext: IScopeContext = assert._$lastContext;
    try {
        fn();
    } catch (e) {
        let newErr: Error | null = null;

        if (isString(match)) {
            if (e.message.indexOf(match) === -1) {
                newErr = new AssertionError(gray(`expected error message to contain [${white(match)}]\n - got [${_colorizeActual(e.message, match)}]\n - diff[${_showStringDifference(match, e.message)}]`), e, null, stackStart);
            }
        } else if (isRegExp(match)) {
            if (!match.test(e.message)) {
                newErr = new AssertionError(gray(`expected error message to match [${white(asString(match))}]\n - got [${green(e.message)}]\n - diff[${_showStringDifference(match.source, e.message)}]`), e, null, stackStart);
            }
        } else if (isObject(match)) {
            objForEachKey(match, (key, value) => {
                expect(e).hasProperty(key).equal(value);
            });
        } else {
            newErr = new AssertionError("checkError() match must be a string, RegExp, or object", e, null, stackStart);
        }

        if (newErr) {
            throw newErr;
        }
            
        if (checkFrames !== false) {
            let theStack = parseStack(e.stack).removeInnerStack().formatStack(99);
            expect(theStack).is.string()
            if (CHECK_INTERNAL_STACK_FRAME_REGEX.test(theStack)) {
                throw new AssertionError("expected error stack to not contain internal frames - " + _formatValue(theStack), e, null, stackStart);
            }
        }

        return;
    }

    if (preContext !== assert._$lastContext && assert._$lastContext) {
        throw new AssertionError(assert._$lastContext?.getMessage("expected an error to be thrown"), assert._$lastContext?.getDetails(), checkError);
    }

    throw new AssertionError("expected an error to be thrown");
}