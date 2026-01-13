/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { brightGreen, brightRed, cyan, dim, gray, green, normal, white, yellow } from "@nevware21/chromacon";
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
import { getScopeContext } from "../../../src/assert/scopeContext";

function _isNonPrintableChar(char: string): boolean {
    const code = char.charCodeAt(0);
    return code < 32 || code > 126;
}

function _showStringDifference(expected: string, actual: string, escape: boolean = true): string {
    let result = EMPTY_STRING;
    let inAnsi = false;

    // expected = stripAnsi(expected);
    // actual = stripAnsi(actual);

    let startOffset = 0;
    if (expected.length > 8) {
        startOffset = actual.indexOf(expected.substring(0, 8));
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

        // If we look like we are starting an ANSI escape sequence, set the inAnsi flag
        if (char1 === "\x1b" && !inAnsi && (lp + startOffset + 1) < actual.length && actual[lp + startOffset + 1] === "[") {
            inAnsi = true;
            result += cyan;
        }

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

            if (_isNonPrintableChar(char1)) {
                let msg = "\\x" + char1.charCodeAt(0).toString(16).padStart(2, "0");
                if (!inAnsi) {
                    result += cyan(msg) + brightRed;
                } else {
                    result += msg;
                }
            } else if (escape && char1 === "\\") {
                result += "\\\\";
            } else {
                result += char1;
            }
        }

        if (inAnsi && char1 === "m") {
            inAnsi = false;
            result += match === 0 ? brightGreen : brightRed;
        }

        lp++;
    }

    if (lp < expected.length) {
        if (match !== 1) {
            result += cyan;
        }
        result += strSubstr(expected, lp);
    }

    result += normal;

    return gray(result);
}

function _colorizeActual(actual: string, expected: string): string {
    let result: string = EMPTY_STRING;
    let inAnsi = false;

    // actual = stripAnsi(actual);
    // expected = stripAnsi(expected);

    let startOffset = 0;
    if (expected.length > 5) {
        startOffset = actual.indexOf(expected.substring(0, 5));
        if (startOffset === -1) {
            startOffset = 0;
        }
    }

    if (startOffset > 0) {
        result = normal + yellow + strLeft(actual, startOffset);
    }

    let lp = 0;
    let match = -1;
    while (lp < expected.length && (lp + startOffset) < actual.length) {
        const char1 = actual[lp + startOffset];
        const char2 = expected[lp];

        // If we look like we are starting an ANSI escape sequence, set the inAnsi flag
        if (char1 === "\x1b" && !inAnsi && (lp + startOffset + 1) < actual.length && actual[lp + startOffset + 1] === "[") {
            inAnsi = true;
            result += cyan;
        }

        if (char1 === char2) {
            if (match !== 0) {
                result += normal + brightGreen;
                match = 0;
            }

            if (_isNonPrintableChar(char1)) {
                let msg = "\\x" + char1.charCodeAt(0).toString(16).padStart(2, "0");
                if (!inAnsi) {
                    result += cyan(msg) + brightGreen;
                } else {
                    result += msg;
                }
            } else if (char1 === "\\") {
                result += "\\\\";
            } else {
                result += char1;
            }
        } else {
            if (match !== 1) {
                result += normal + brightRed;
                match = 1;
            }

            if (_isNonPrintableChar(char1)) {
                let msg = "\\x" + char1.charCodeAt(0).toString(16).padStart(2, "0");
                if (!inAnsi) {
                    result += cyan(msg) + brightRed;
                } else {
                    result += msg;
                }
            } else if (char1 === "\\") {
                result += "\\\\";
            } else {
                result += char1;
            }
        }

        if (inAnsi && char1 === "m") {
            inAnsi = false;
            result += match === 0 ? brightGreen : brightRed;
        }

        lp++;
    }

    if (lp + startOffset < actual.length) {
        if (match !== 1) {
            result += normal + green;
        }
        result += strSubstr(actual, lp + startOffset);
    }

    result += normal;

    return gray(result);
}

export function checkError(fn: () => void, match: string | RegExp | Object, checkFrames?: boolean): void {
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
        let theMessage: string = (e as Error).message;

        if (isString(match)) {
            if (theMessage.indexOf(match) === -1) {
                newErr = new AssertionError(gray(`expected error message to contain [${cyan(match)}]\n - got [${_colorizeActual(theMessage, match)}]\n - diff[${_showStringDifference(match, theMessage)}]`),
                    e,
                    {
                        actual: theMessage,
                        expected: match
                    },
                    stackStart);
            }
        } else if (isRegExp(match)) {
            if (!match.test(theMessage)) {
                newErr = new AssertionError(gray(`expected error message to match [${white(asString(match))}]\n - got [${_colorizeActual(theMessage, theMessage)}]\n - diff[${_showStringDifference(match.source, theMessage, false)}] (regex)`),
                    e,
                    {
                        actual: theMessage,
                        expected: match
                    },
                    stackStart);
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
            expect(theStack).is.string();
            if (CHECK_INTERNAL_STACK_FRAME_REGEX.test(theStack)) {
                let scope = preContext || getScopeContext(assert);
                throw new AssertionError("expected error stack to not contain internal frames - " + _formatValue(scope, theStack), e, null, stackStart);
            }
        }

        return;
    }

    if (preContext !== assert._$lastContext && assert._$lastContext) {
        throw new AssertionError(assert._$lastContext?.getMessage("expected an error to be thrown"), assert._$lastContext?.getDetails(), checkError);
    }

    throw new AssertionError("expected an error to be thrown");
}