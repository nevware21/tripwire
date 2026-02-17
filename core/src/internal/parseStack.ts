/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrSlice, isString, objDefineProps, strIndexOf, strSubstring, strTrim } from "@nevware21/ts-utils";
import { EMPTY_STRING } from "../assert/internal/const";

// eslint-disable-next-line security/detect-unsafe-regex
const rStackLine = /^\s{0,20}at\s{1,10}(\w+\.)?(\w+)\s/;
const rIsStackDetailLine = /^\s{0,20}at\s/;
const rInnerException = /Inner Exception.*/;

export interface IParsedStack {
    readonly stack: string;
    name: string;
    message: string;
    trailMessage: string;
    readonly lines: string[];

    formatStack(maxLines?: number): string;
    trimStack(funcName: string): IParsedStack;
    removeInnerStack(): IParsedStack;
}

/**
 * Parse the given strack string into a structured object
 * @param stack - The raw stack string
 * @returns - The parsed stack object
 */
export function parseStack(stack: string | undefined): IParsedStack {
    let theStack = stack;
    let theMessage: string = null;
    let theName: string = null;
    let trailingMessage: string = null;
    let stackLines: string[] = [];
    let isParsed = false;
    let regnStack = false;

    function _parseStackDetail() {
        if (!isParsed) {
            let lines = isString(stack) ? stack.split("\n") : [];
            let linesLen = lines.length;
            let idx = 0;
            let startLine = -1;
            let lastLine = -1;
            while (idx < linesLen) {
                let line = lines[idx];
                if (rIsStackDetailLine.test(line)) {
                    if (!theMessage) {
                        // Message was all lines before this one
                        theMessage = arrSlice(lines, 0, idx).join("\n");
                    }

                    if (startLine === -1) {
                        startLine = idx;
                    }

                    lastLine = idx;
                } else if (theMessage) {
                    trailingMessage = lines.slice(idx).join("\n");
                    break;
                }

                idx++;
            }

            stackLines = [];
            if (startLine >= 0) {
                stackLines = arrSlice(lines, startLine, lastLine + 1);
            } else {
                // No stack so everything is the message
                theMessage = arrSlice(lines).join("\n");
            }

            isParsed = true;

            let nameIdx = strIndexOf(theMessage, ": ");
            if (nameIdx >= 0) {
                // Simple validation to ensure we really have a leading "name"
                if (/^\w*:\s/.test(theMessage.substring(0, nameIdx + 2))) {
                    theName = strSubstring(theMessage, 0, nameIdx);
                    theMessage = strSubstring(theMessage, nameIdx + 2);
                }
            }
        }
    }

    let parsedStack: IParsedStack = {} as IParsedStack;
    return objDefineProps(parsedStack, {
        stack: {
            g: () => {
                if (regnStack) {
                    theStack = _formatStack(theName, theMessage, stackLines, trailingMessage, 99);
                    regnStack = false;
                }

                return theStack;
            }
        },
        name: {
            g: () => {
                _parseStackDetail();
                return theName || "<unknown>";
            },
            s: (value: string) => {
                _parseStackDetail();
                if (value !== theName) {
                    theName = value;
                    regnStack = true;
                }
            }
        },
        message: {
            g: () => {
                _parseStackDetail();
                return theMessage || EMPTY_STRING;
            },
            s: (value: string) => {
                _parseStackDetail();
                if (value !== theMessage) {
                    theMessage = value;
                    regnStack = true;
                }
            }
        },
        trailMessage: {
            g: () => {
                _parseStackDetail();
                return trailingMessage || EMPTY_STRING;
            },
            s: (value: string) => {
                _parseStackDetail();
                if (value !== trailingMessage) {
                    trailingMessage = value;
                    regnStack = true;
                }
            }
        },
        lines: {
            g: () => {
                _parseStackDetail();
                return stackLines || [];
            }
        },
        formatStack: {
            g: () => {
                return function (maxLines?: number) {
                    _parseStackDetail();
                    return _formatStack(theName, theMessage, stackLines || [], trailingMessage || EMPTY_STRING, maxLines);
                };
            }
        },
        trimStack: {
            g: () => {
                return (funcName: string) => {
                    _parseStackDetail();
                    _trimStack(stackLines, funcName);
                    return parsedStack;
                };
            }
        },
        removeInnerStack: {
            g: () => {
                return () => {
                    _parseStackDetail();
                    if (trailingMessage) {
                        let trailLines = trailingMessage.split("\n");
                        for (let lp = 0; lp < trailLines.length; lp++) {
                            if (rInnerException.test(trailLines[lp])) {
                                trailLines = arrSlice(trailLines, 0, lp);
                                break;
                            }
                        }

                        trailingMessage = trailLines.join("\n");
                        if (strTrim(trailingMessage) === EMPTY_STRING) {
                            trailingMessage = null;
                        }
                    }

                    return parsedStack;
                };
            }
        }
    });
}

function _formatStack(name: string, message: string, lines: string[], trailMessage: string, maxLines?: number): string {
    let formattedStack = name ? name + ": " + message : message;
    let numLines = maxLines || Error.stackTraceLimit || 10;
    let theLines = arrSlice(lines, 0, numLines);
    if (formattedStack && theLines.length > 0) {
        formattedStack += "\n";
        formattedStack += arrSlice(theLines, 0, numLines).join("\n");
    }

    if (trailMessage) {
        formattedStack += "\n";
        formattedStack += trailMessage;
    }

    return formattedStack;
}

/**
 * Internal function to trim the stack to the given function name
 * @param stackLines - The stack lines
 * @param funcName - The function name to trim to
 */
function _trimStack(stackLines: string[], funcName: string) {
    // Try and find the function name in the stack
    for (let lp = 0; lp < stackLines.length; lp++) {
        let matches = rStackLine.exec(stackLines[lp]);
        if (matches && matches.length > 2 && matches[2] == funcName) {
            stackLines.splice(0, lp);
            break;
        }
    }
}