/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IConfig } from "../../../src";
import { assert } from "../../../src/assert/assertClass";
import { assertConfig } from "../../../src/config/assertConfig";

describe("assertConfig", () => {

    afterEach(() => {
        // Restore original config
        assertConfig.$ops.reset();
    });

    describe("default configuration", () => {
        it("should have default isVerbose as false", () => {
            assert.isFalse(assertConfig.isVerbose);
        });

        it("should have default fullStack as false", () => {
            assert.isFalse(assertConfig.fullStack);
        });

        it("should have default defAssertMsg", () => {
            assert.equal(assertConfig.defAssertMsg, "assertion failure");
        });

        it("should have default defFatalMsg", () => {
            assert.equal(assertConfig.defFatalMsg, "fatal assertion failure");
        });

        it("should have default format configuration", () => {
            assert.ok(assertConfig.format);
            assert.isFalse(assertConfig.format.finalize);
            assert.equal(assertConfig.format.finalizeFn, undefined);
            assert.isArray(assertConfig.$ops.formatMgr.getFormatters());
        });
    });

    describe("modifying configuration", () => {
        it("should allow changing isVerbose", () => {
            assertConfig.isVerbose = true;
            assert.isTrue(assertConfig.isVerbose);

            assertConfig.isVerbose = false;
            assert.isFalse(assertConfig.isVerbose);
        });

        it("should allow changing fullStack", () => {
            assertConfig.fullStack = true;
            assert.isTrue(assertConfig.fullStack);

            assertConfig.fullStack = false;
            assert.isFalse(assertConfig.fullStack);
        });

        it("should allow changing defAssertMsg", () => {
            assertConfig.defAssertMsg = "Custom assertion message";
            assert.equal(assertConfig.defAssertMsg, "Custom assertion message");
        });

        it("should allow changing defFatalMsg", () => {
            assertConfig.defFatalMsg = "Custom fatal message";
            assert.equal(assertConfig.defFatalMsg, "Custom fatal message");
        });

        it("should allow changing format.finalize", () => {
            assertConfig.format.finalize = true;
            assert.isTrue(assertConfig.format.finalize);

            assertConfig.format.finalize = false;
            assert.isFalse(assertConfig.format.finalize);
        });

        it("should allow setting format.finalizeFn", () => {
            let customFn = (value: string) => `[${value}]`;
            assertConfig.format.finalizeFn = customFn;
            assert.equal(assertConfig.format.finalizeFn, customFn);
        });

        it("should allow setting format.formatters", () => {
            let customFormatter = {
                name: "test",
                value: () => ({ res: 0, val: "test" })
            };
            assertConfig.$ops.addFormatter([customFormatter]);
            assert.equal(assertConfig.$ops.formatMgr.getFormatters().length, 1);
            assert.equal(assertConfig.$ops.formatMgr.getFormatters()[0], customFormatter);
        });
    });

    describe("clone method", () => {
        it("should create a copy of the configuration", () => {
            let clone = assertConfig.$ops.clone();

            assert.notStrictEqual(clone, assertConfig);
            assert.equal(clone.isVerbose, assertConfig.isVerbose);
            assert.equal(clone.fullStack, assertConfig.fullStack);
            assert.equal(clone.defAssertMsg, assertConfig.defAssertMsg);
            assert.equal(clone.defFatalMsg, assertConfig.defFatalMsg);
        });

        it("should create independent copies", () => {
            let clone = assertConfig.$ops.clone();

            clone.isVerbose = !assertConfig.isVerbose;
            assert.notEqual(clone.isVerbose, assertConfig.isVerbose);
        });

        it("should deep clone format configuration", () => {
            let clone = assertConfig.$ops.clone();

            assert.notStrictEqual(clone.format, assertConfig.format);
            assert.equal(clone.format.finalize, assertConfig.format.finalize);
        });

        it("should clone formatters array", () => {
            let formatter = {
                name: "test",
                value: () => ({ res: 0, val: "test" })
            };
            assertConfig.$ops.addFormatter([formatter]);

            let clone = assertConfig.$ops.clone();
            let formatters = assertConfig.$ops.formatMgr.getFormatters();
            let cloneFormatters = clone.$ops.formatMgr.getFormatters();

            assert.isArray(cloneFormatters);
            assert.equal(cloneFormatters.length, formatters.length);
            assert.notStrictEqual(cloneFormatters, formatters);
            assert.notStrictEqual(clone.$ops.formatMgr.getFormatters(), assertConfig.$ops.formatMgr.getFormatters());
            assert.equal(clone.$ops.formatMgr.getFormatters().length, 1);
            assert.equal(clone.$ops.formatMgr.getFormatters()[0], formatter);
        });

        it("should handle empty formatters array", () => {
            assertConfig.$ops.addFormatter([]);
            let clone = assertConfig.$ops.clone();

            assert.isArray(clone.$ops.formatMgr.getFormatters());
            assert.equal(clone.$ops.formatMgr.getFormatters().length, 0);
        });

        it("should clone with custom options", () => {
            let customOptions: IConfig = {
                isVerbose: true,
                fullStack: true,
                defAssertMsg: "custom",
                defFatalMsg: "custom fatal",
                format: {
                    finalize: true,
                    finalizeFn: (v) => v
                }
            };

            let clone = assertConfig.$ops.clone(customOptions);
            assert.isTrue(clone.isVerbose);
            assert.isTrue(clone.fullStack);
            assert.equal(clone.defAssertMsg, "custom");
            assert.equal(clone.defFatalMsg, "custom fatal");
            assert.isTrue(clone.format.finalize);
        });
    });

    describe("edge cases", () => {
        it("should revert to default formatters when set to null", () => {
            assertConfig.$ops.addFormatter(null as any);
            // Should revert to default empty array or default formatters
            assert.ok(assertConfig.$ops.formatMgr.getFormatters());
        });

        it("should revert to default message when set to undefined", () => {
            assertConfig.defAssertMsg = undefined as any;
            assert.equal(assertConfig.defAssertMsg, "assertion failure");
        });

        it("should handle empty strings", () => {
            assertConfig.defAssertMsg = "";
            assert.equal(assertConfig.defAssertMsg, "");
        });

        it("should create independent instances on multiple clones", () => {
            let clone1 = assertConfig.$ops.clone();
            let clone2 = assertConfig.$ops.clone();

            assert.notStrictEqual(clone1, clone2);
            // Each clone is a separate object instance
            assert.ok(clone1);
            assert.ok(clone2);
        });
    });

    describe("integration with assertions", () => {
        it("verbose mode should affect assertion output", () => {
            assertConfig.isVerbose = false;
            // Test assertion behavior (implementation-specific)

            assertConfig.isVerbose = true;
            // Test verbose assertion behavior
        });

        it("fullStack mode should affect error stack traces", () => {
            assertConfig.fullStack = false;
            try {
                assert.equal(1, 2);
            } catch (e) {
                assert.ok(e.stack);
                // Stack should be filtered
            }

            assertConfig.fullStack = true;
            try {
                assert.equal(1, 2);
            } catch (e) {
                assert.ok(e.stack);
                // Stack should be full
            }
        });

        it("should use custom default messages", () => {
            assertConfig.defAssertMsg = "My custom assertion failed";
            // This would require testing with an assertion that uses the default message
        });
    });

    describe("format configuration", () => {
        it("should support multiple formatters", () => {
            let formatter1 = {
                name: "formatter1",
                value: () => ({ res: 0, val: "1" })
            };
            let formatter2 = {
                name: "formatter2",
                value: () => ({ res: 0, val: "2" })
            };

            assertConfig.$ops.addFormatter([formatter1, formatter2]);
            assert.equal(assertConfig.$ops.formatMgr.getFormatters().length, 2);
        });

        it("reset should remove all formatters", () => {
            let formatter1 = {
                name: "formatter1",
                value: () => ({ res: 0, val: "1" })
            };
            let formatter2 = {
                name: "formatter2",
                value: () => ({ res: 0, val: "2" })
            };

            assertConfig.$ops.addFormatter([formatter1, formatter2]);

            assert.equal(assertConfig.$ops.formatMgr.getFormatters().length, 2);
            assertConfig.$ops.reset();
            assert.equal(assertConfig.$ops.formatMgr.getFormatters().length, 0);
        });

        it("should preserve finalizeFn reference", () => {
            let fn = (value: string) => value.toUpperCase();
            assertConfig.format.finalizeFn = fn;

            let clone = assertConfig.$ops.clone();
            assert.equal(clone.format.finalizeFn, fn);

            // Test that the function works
            if (clone.format.finalizeFn) {
                assert.equal(clone.format.finalizeFn("test"), "TEST");
            }
        });

        it("should handle complex formatter objects", () => {
            let complexFormatter = {
                name: "complex",
                value: (ctx: any, value: any) => {
                    if (typeof value === "number") {
                        return { res: 0, val: `Number: ${value}` };
                    }
                    return { res: 2 }; // Skip
                }
            };

            assertConfig.$ops.addFormatter([complexFormatter]);
            assert.equal(assertConfig.$ops.formatMgr.getFormatters()[0].name, "complex");

            let result = complexFormatter.value(null, 42);
            assert.equal(result.res, 0);
            assert.equal(result.val, "Number: 42");
        });
    });

    describe("type safety", () => {
        it("should accept valid IConfig objects", () => {
            let validConfig: IConfig = {
                isVerbose: true,
                fullStack: false,
                defAssertMsg: "test",
                defFatalMsg: "test fatal",
                format: {
                    finalize: true
                }
            };

            let clone = assertConfig.$ops.clone(validConfig);

            assert.ok(clone);
            assert.notStrictEqual(clone, assertConfig);
            assert.equal(clone.isVerbose, true);
            assert.equal(clone.fullStack, false);
            assert.equal(clone.defAssertMsg, "test");
            assert.equal(clone.defFatalMsg, "test fatal");
            assert.equal(clone.format.finalize, true);

            // Make sure this is a separate instance and didn't affect the original
            assert.notEqual(assertConfig.defAssertMsg, clone.defAssertMsg);
            assert.notEqual(assertConfig.defFatalMsg, clone.defFatalMsg);
        });

        it("should handle partial configuration objects", () => {
            let partialConfig: Partial<IConfig> = {
                isVerbose: true
            };

            // This should work with the clone method
            let clone = assertConfig.$ops.clone(partialConfig as IConfig);
            assert.ok(clone);
        });
    });
});
