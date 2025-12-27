/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { assertConfig } from "../../../src/assert/config";
import { checkError } from "../support/checkError";
import { IFormatter, eFormatResult } from "../../../src/assert/interface/IFormatter";
import { escapeAnsi, gray, red, replaceAnsi } from "@nevware21/chromacon";
import { isString } from "@nevware21/ts-utils";

describe("assert format options", function () {
    describe("finalize", function () {
        let originalFormat: any;

        beforeEach(function () {
            originalFormat = assertConfig.format;
        });

        afterEach(function () {
            assertConfig.format = originalFormat;
        });

        it("should escape ANSI codes when finalize is true", function () {
            assertConfig.format = {
                finalize: true
            };

            // Create an object with ANSI escape codes in a string value
            const objWithAnsi = { message: "\x1b[31mRed Text\x1b[0m" };

            checkError(function () {
                assert.equal(objWithAnsi, { message: "Different" });
            }, "expected {message:\"\\x1b[31mRed Text\\x1b[0m\"} to equal {message:\"Different\"}");
        });

        it("should not escape ANSI codes when finalize is false", function () {
            assertConfig.format = {
                finalize: false
            };

            // Create an object with ANSI escape codes in a string value
            const objWithAnsi = { message: "\x1b[31mRed Text\x1b[0m" };

            checkError(function () {
                assert.equal(objWithAnsi, { message: "Different" });
            }, /expected \{message:".*Red Text.*"\} to equal \{message:"Different"\}/);
        });

        it("should escape ANSI codes in circular references when finalize is true", function () {
            assertConfig.format = {
                finalize: true
            };

            const obj1: any = { a: 1 };
            obj1.self = obj1;

            const obj2: any = { a: 2 };
            obj2.self = obj2;

            checkError(function () {
                assert.deepEqual(obj1, obj2);
            }, /expected \{a:1,self:\{a:1,self:.*\}\} to deeply equal \{a:2,self:\{a:2,self:.*\}\}/);
        });

        it("should handle escapeAnsi with deeply nested objects", function () {
            assertConfig.format = {
                finalize: true
            };

            const obj1 = {
                nested: {
                    deep: {
                        value: "\x1b[32mGreen\x1b[0m"
                    }
                }
            };

            const obj2 = {
                nested: {
                    deep: {
                        value: "Plain"
                    }
                }
            };

            checkError(function () {
                assert.deepEqual(obj1, obj2);
            }, "expected {nested:{deep:{value:\"\\x1b[32mGreen\\x1b[0m\"}}} to deeply equal {nested:{deep:{value:\"Plain\"}}}");
        });

        it("should handle escapeAnsi with arrays containing ANSI codes", function () {
            assertConfig.format = {
                finalize: true
            };

            const arr1 = ["\x1b[34mBlue\x1b[0m", "normal"];
            const arr2 = ["different", "normal"];

            checkError(function () {
                assert.deepEqual(arr1, arr2);
            }, "expected [\"\\x1b[34mBlue\\x1b[0m\",\"normal\"] to deeply equal [\"different\",\"normal\"]");
        });

        it("should handle escapeAnsi being set to undefined (default behavior)", function () {
            assertConfig.format = {
                finalize: undefined
            };

            const obj = { value: "\x1b[35mMagenta\x1b[0m" };

            checkError(function () {
                assert.equal(obj, { value: "Plain" });
            }, /expected \{value:".*Magenta.*"\} to equal \{value:"Plain"\}/);
        });

        it("should handle escapeAnsi with complex objects", function () {
            assertConfig.format = {
                finalize: true
            };

            const complex = {
                strings: ["\x1b[31mError\x1b[0m", "\x1b[32mSuccess\x1b[0m"],
                nested: {
                    message: "\x1b[33mWarning\x1b[0m"
                },
                number: 42
            };

            const expected = {
                strings: ["Different", "Values"],
                nested: {
                    message: "Plain"
                },
                number: 100
            };

            checkError(function () {
                assert.deepEqual(complex, expected);
            }, "expected {strings:[\"\\x1b[31mError\\x1b[0m\",\"\\x1b[32mSuccess\\x1b[0m\"],nested:{message:\"\\x1b[33mWarning\\x1b[0m\"},number:42} to deeply equal {strings:[\"Different\",\"Values\"],nested:{message:\"Plain\"},number:100}");
        });
    });

    describe("custom formatters", function () {
        let originalFormat: any;

        beforeEach(function () {
            originalFormat = assertConfig.format;
        });

        afterEach(function () {
            assertConfig.format = originalFormat;
        });

        it("should use custom formatter that finalizes ANSI codes in gray", function () {
            // Custom formatter that escapes ANSI codes and wraps them in gray
            const ansiEscapeFormatter: IFormatter = {
                name: "ansiEscapeFormatter",
                value: (ctx, value) => {
                    if (isString(value)) {
                        // Escape ANSI codes and wrap in gray
                        const escaped = replaceAnsi(value, (match) => gray(escapeAnsi(match)));
                        return {
                            res: eFormatResult.Ok,
                            val: "\"" + escaped + "\""
                        };
                    }
                    return { res: eFormatResult.Skip };
                }
            };

            assertConfig.format = {
                finalize: false,
                formatters: [ansiEscapeFormatter]
            };

            const objWithAnsi = { message: red("Red Text") };
            const expected =  gray("\\x1b[31m") + "Red Text" + gray("\\x1b[39m");

            checkError(function () {
                assert.equal(objWithAnsi, { message: "Different" });
            }, `expected {message:"${expected}"} to equal {message:"Different"}`);
        });

        it("should chain formatters with Continue result", function () {
            // First formatter provides basic formatting but signals Continue
            const basicFormatter: IFormatter = {
                name: "basicFormatter",
                value: (ctx, value) => {
                    if (isString(value)) {
                        return {
                            res: eFormatResult.Continue,
                            val: `"${value}"`
                        };
                    }
                    return { res: eFormatResult.Skip };
                }
            };

            // Second formatter that enhances strings with ANSI codes
            const ansiEnhancer: IFormatter = {
                name: "ansiEnhancer",
                value: (ctx, value) => {
                    if (isString(value)) {
                        const escaped = replaceAnsi(value, (match) => gray(escapeAnsi(match)));
                        return {
                            res: eFormatResult.Ok,
                            val: "\"" + escaped + "\""
                        };
                    }
                    return { res: eFormatResult.Skip };
                }
            };

            assertConfig.format = {
                formatters: [basicFormatter, ansiEnhancer]
            };

            const obj = { text: "\x1b[35mMagenta\x1b[0m" };

            checkError(function () {
                assert.equal(obj, { text: "Plain" });
            }, "expected {text:\"\x1b[90m\\x1b[35m\x1b[39mMagenta\x1b[90m\\x1b[0m\x1b[39m\"} to equal {text:\"Plain\"}");
        });

        it("should use formatter that handles specific object types", function () {
            class CustomClass {
                constructor(public value: string) {}
            }

            const customClassFormatter: IFormatter = {
                name: "customClassFormatter",
                value: (ctx, value) => {
                    if (value instanceof CustomClass) {
                        return {
                            res: eFormatResult.Ok,
                            val: `[CustomClass: "${value.value}"]`
                        };
                    }
                    return { res: eFormatResult.Skip };
                }
            };

            assertConfig.format = {
                formatters: [customClassFormatter]
            };

            const custom1 = new CustomClass("value1");
            const custom2 = new CustomClass("value2");

            checkError(function () {
                assert.equal(custom1, custom2);
            }, "expected [CustomClass: \"value1\"] to equal [CustomClass: \"value2\"]");
        });

        it("should use multiple custom formatters with escaping", function () {
            // Formatter for numbers - prefix with "NUM:"
            const numberFormatter: IFormatter = {
                name: "numberFormatter",
                value: (ctx, value) => {
                    if (typeof value === "number") {
                        return {
                            res: eFormatResult.Ok,
                            val: `NUM:${value}`
                        };
                    }
                    return { res: eFormatResult.Skip };
                }
            };

            // Formatter for strings with ANSI - escape and color gray
            const stringAnsiFormatter: IFormatter = {
                name: "stringAnsiFormatter",
                value: (ctx, value) => {
                    if (isString(value)) {
                        const escaped = replaceAnsi(value, (match) => gray(escapeAnsi(match)));
                        return {
                            res: eFormatResult.Ok,
                            val: `\"${escaped}\"`
                        };
                    }
                    return { res: eFormatResult.Skip };
                }
            };

            assertConfig.format = {
                formatters: [numberFormatter, stringAnsiFormatter]
            };

            const obj = {
                count: 42,
                message: "\x1b[33mWarning\x1b[0m"
            };

            const expected = {
                count: 100,
                message: "Plain"
            };

            checkError(function () {
                assert.deepEqual(obj, expected);
            }, /expected \{count:NUM:42,message:.*\\x1b\[33m.*Warning.*\\x1b\[0m.*\} to deeply equal \{count:NUM:100,message:"Plain"\}/);
        });

        it("should handle formatter that returns Failed result", function () {
            const failingFormatter: IFormatter = {
                name: "failingFormatter",
                value: (ctx, value) => {
                    if (typeof value === "bigint") {
                        return {
                            res: eFormatResult.Failed,
                            err: new Error("Cannot format bigint")
                        };
                    }
                    return { res: eFormatResult.Skip };
                }
            };

            assertConfig.format = {
                formatters: [failingFormatter]
            };

            // This should fall back to default formatting since the formatter fails
            const obj = { id: BigInt(12345) };
            const expected = { id: BigInt(67890) };

            checkError(function () {
                assert.deepEqual(obj, expected);
            }, /expected \{id:.*\} to deeply equal \{id:.*\}/);
        });

        it("should finalize ANSI in custom formatter with finalize option", function () {
            const customFormatter: IFormatter = {
                name: "customFormatter",
                value: (ctx, value) => {
                    if (typeof value === "string" && value.startsWith("SPECIAL:")) {
                        const content = value.substring(8);
                        return {
                            res: eFormatResult.Ok,
                            val: `[SPECIAL:${gray(content)}]`
                        };
                    }
                    return { res: eFormatResult.Skip };
                }
            };

            assertConfig.format = {
                finalize: true,
                formatters: [customFormatter]
            };

            const obj = { tag: "SPECIAL:\x1b[36mCyan\x1b[0m" };

            checkError(function () {
                assert.equal(obj, { tag: "Different" });
            }, /expected \{tag:\[SPECIAL:.*Cyan.*\]\} to equal \{tag:"Different"\}/);
        });
    });

    describe("custom finalizeFn", function () {
        let originalFormat: any;

        beforeEach(function () {
            assertConfig.reset();
            originalFormat = assertConfig.format;
        });

        afterEach(function () {
            assertConfig.format = originalFormat;
        });

        it("should use custom finalizeFn when finalize is true", function () {
            // Custom finalize function that wraps finalized content in brackets
            const customEscape = (value: string): string => {
                const escaped = escapeAnsi(value);
                return `[ESCAPED:${escaped}]`;
            };

            assertConfig.format = {
                finalize: true,
                finalizeFn: customEscape
            };

            const objWithAnsi = { message: "\x1b[31mRed Text\x1b[0m" };

            checkError(function () {
                assert.equal(objWithAnsi, { message: "Different" });
            }, "expected [ESCAPED:{message:\"\\x1b[31mRed Text\\x1b[0m\"}] to equal [ESCAPED:{message:\"Different\"}]");
        });

        it("should not call finalizeFn when finalize is false", function () {
            let escapeCalled = false;
            const customEscape = (value: string): string => {
                escapeCalled = true;
                return escapeAnsi(value);
            };

            assertConfig.format = {
                finalize: false,
                finalizeFn: customEscape
            };

            const objWithAnsi = { message: "\x1b[31mRed Text\x1b[0m" };

            checkError(function () {
                assert.equal(objWithAnsi, { message: "Different" });
            }, /expected \{message:".*Red Text.*"\} to equal \{message:"Different"\}/);

            assert.equal(escapeCalled, false, "finalizeFn should not be called when finalize is false");
        });

        it("should use finalizeFn with custom gray coloring", function () {
            // Custom finalize that colors the escaped codes in gray
            const customEscapeGray = (value: string): string => {
                return replaceAnsi(value, (match) => gray(escapeAnsi(match)));
            };

            assertConfig.format = {
                finalize: true,
                finalizeFn: customEscapeGray
            };

            const obj = {
                text: "\x1b[33mWarning\x1b[0m",
                code: 404
            };

            checkError(function () {
                assert.equal(obj, { text: "Plain", code: 200 });
            }, /expected .*text:".*\\x1b\[33m.*Warning.*\\x1b\[0m.*",code:404.* to equal .*text:"Plain",code:200.*/);
        });

        it("should use finalizeFn with deeply nested objects", function () {
            const customEscape = (value: string): string => {
                return `<<${escapeAnsi(value)}>>`;
            };

            assertConfig.format = {
                finalize: true,
                finalizeFn: customEscape
            };

            const obj = {
                level1: {
                    level2: {
                        message: "\x1b[32mSuccess\x1b[0m"
                    }
                }
            };

            checkError(function () {
                assert.deepEqual(obj, { level1: { level2: { message: "Plain" } } });
            }, "expected <<{level1:{level2:{message:\"\\x1b[32mSuccess\\x1b[0m\"}}}>> to deeply equal <<{level1:{level2:{message:\"Plain\"}}}>>");
        });

        it("should use finalizeFn with arrays", function () {
            const customEscape = (value: string): string => {
                const escaped = escapeAnsi(value);
                return `{${escaped}}`;
            };

            assertConfig.format = {
                finalize: true,
                finalizeFn: customEscape
            };

            const arr1 = ["\x1b[34mBlue\x1b[0m", "\x1b[35mMagenta\x1b[0m"];
            const arr2 = ["Different1", "Different2"];

            checkError(function () {
                assert.deepEqual(arr1, arr2);
            }, "expected {[\"\\x1b[34mBlue\\x1b[0m\",\"\\x1b[35mMagenta\\x1b[0m\"]} to deeply equal {[\"Different1\",\"Different2\"]}");
        });

        it("should combine finalizeFn with custom formatters", function () {
            const customEscape = (value: string): string => {
                return `[${escapeAnsi(value)}]`;
            };

            const numberFormatter: IFormatter = {
                name: "numberFormatter",
                value: (ctx, value) => {
                    if (typeof value === "number") {
                        return {
                            res: eFormatResult.Ok,
                            val: `#${value}#`
                        };
                    }
                    return { res: eFormatResult.Skip };
                }
            };

            assertConfig.format = {
                finalize: true,
                finalizeFn: customEscape,
                formatters: [numberFormatter]
            };

            const obj = {
                id: 42,
                status: "\x1b[31mError\x1b[0m"
            };

            checkError(function () {
                assert.deepEqual(obj, { id: 100, status: "OK" });
            }, "expected [{id:#42#,status:\"\\x1b[31mError\\x1b[0m\"}] to deeply equal [{id:#100#,status:\"OK\"}]");
        });

        it("should use finalizeFn that preserves colored text", function () {
            // Finalize function that only escapes the codes but keeps the text colored
            const customEscape = (value: string): string => {
                return replaceAnsi(value, (match, offset, str) => {
                    // Escape the ANSI code and wrap in a different color
                    return red(escapeAnsi(match));
                });
            };

            assertConfig.format = {
                finalize: true,
                finalizeFn: customEscape
            };

            const obj = { message: "\x1b[36mCyan Text\x1b[0m" };

            checkError(function () {
                assert.equal(obj, { message: "Plain" });
            }, /expected .*message:".*\\x1b\[36m.*Cyan Text.*\\x1b\[0m.*".* to equal .*message:"Plain".*/);
        });

        it("should handle finalizeFn with circular references", function () {
            const customEscape = (value: string): string => {
                return `{ESC:${escapeAnsi(value)}}`;
            };

            assertConfig.format = {
                finalize: true,
                finalizeFn: customEscape
            };

            const obj1: any = {
                name: "\x1b[32mCircular\x1b[0m"
            };
            obj1.self = obj1;

            const obj2: any = {
                name: "Different"
            };
            obj2.self = obj2;

            checkError(function () {
                assert.deepEqual(obj1, obj2);
            }, /expected \{ESC:\{name:"\\x1b\[32mCircular\\x1b\[0m",self:\{name:"\\x1b\[32mCircular\\x1b\[0m".*\}\}\} to deeply equal/);
        });

        it("should use finalizeFn that converts ANSI to HTML entities", function () {
            // Custom finalize function that converts to HTML-safe format
            const customEscape = (value: string): string => {
                return escapeAnsi(value)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
            };

            assertConfig.format = {
                finalize: true,
                finalizeFn: customEscape
            };

            const obj = {
                html: "\x1b[31m<div>Test</div>\x1b[0m"
            };

            checkError(function () {
                assert.equal(obj, { html: "Plain" });
            }, "expected {html:\"\\x1b[31m&lt;div&gt;Test&lt;/div&gt;\\x1b[0m\"} to equal {html:\"Plain\"}");
        });

        it("should handle undefined finalizeFn (fallback to default)", function () {
            assertConfig.format = {
                finalize: true,
                finalizeFn: undefined
            };

            const obj = { message: "\x1b[31mRed\x1b[0m" };

            checkError(function () {
                assert.equal(obj, { message: "Different" });
            }, "expected {message:\"\\x1b[31mRed\\x1b[0m\"} to equal {message:\"Different\"}");
        });

        it("should colorize embedded ANSI codes in gray with replaceAnsi", function () {
            // Custom finalize function that colorizes ANSI escape codes in gray
            const customEscape = (value: string): string => {
                return replaceAnsi(value, (match) => gray(escapeAnsi(match)));
            };

            assertConfig.format = {
                finalize: true,
                finalizeFn: customEscape
            };

            const obj = {
                message: "\x1b[31mError occurred\x1b[0m",
                status: 500
            };

            checkError(function () {
                assert.deepEqual(obj, { message: "Success", status: 200 });
                // eslint-disable-next-line no-control-regex
            }, /expected .*message:".*\x1b\[90m\\x1b\[31m\x1b\[39m.*Error occurred.*\x1b\[90m\\x1b\[0m\x1b\[39m.*",status:500.* to deeply equal .*message:"Success",status:200.*/);
        });
    });
});
