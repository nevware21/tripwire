/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { expect } from "../../../src/assert/expect";
import { assertConfig } from "../../../src/config/assertConfig";

describe("Config max depth limits", () => {
    afterEach(() => {
        // Reset to default config values
        assertConfig.$ops.reset();
    });

    describe("maxFormatDepth", () => {
        it("should use default value of 50", () => {
            assert.equal(assertConfig.format.maxFormatDepth, 50);
        });

        it("should allow custom maxFormatDepth to be set", () => {
            assertConfig.format.maxFormatDepth = 25;
            assert.equal(assertConfig.format.maxFormatDepth, 25);
        });

        it("should detect deeply nested object as circular when depth exceeds maxFormatDepth", () => {
            assertConfig.format.maxFormatDepth = 5;

            // Create deeply nested object
            let obj: any = {};
            let current = obj;
            for (let i = 0; i < 10; i++) {
                current.nested = {};
                current = current.nested;
            }

            try {
                assert.equal(obj, {});
            } catch (e) {
                // Should contain circular reference indicator due to max depth
                assert.includes(e.message, "Circular");
            }
        });
    });

    describe("maxCompareDepth", () => {
        it("should use default value of 100", () => {
            assert.equal(assertConfig.maxCompareDepth, 100);
        });

        it("should allow custom maxCompareDepth to be set", () => {
            assertConfig.maxCompareDepth = 50;
            assert.equal(assertConfig.maxCompareDepth, 50);
        });

        it("should throw fatal error when comparison depth exceeds maxCompareDepth", () => {
            assertConfig.maxCompareDepth = 10;

            // Create deeply nested object
            let deep1: any = {};
            let deep2: any = {};
            let curr1 = deep1;
            let curr2 = deep2;

            for (let i = 0; i < 15; i++) {
                curr1.nested = { value: i };
                curr2.nested = { value: i };
                curr1 = curr1.nested;
                curr2 = curr2.nested;
            }

            try {
                assert.deepEqual(deep1, deep2);
                assert.fail("Should have thrown fatal error");
            } catch (e) {
                assert.includes(e.message, "Maximum comparison depth exceeded");
                assert.includes(e.message, "10");
            }
        });
    });

    describe("maxCompareCheckDepth", () => {
        it("should use default value of 50", () => {
            assert.equal(assertConfig.maxCompareCheckDepth, 50);
        });

        it("should allow custom maxCompareCheckDepth to be set", () => {
            assertConfig.maxCompareCheckDepth = 25;
            assert.equal(assertConfig.maxCompareCheckDepth, 25);
        });
    });

    describe("config integration", () => {
        it("should allow all depth limits to be configured together", () => {
            assertConfig.format.maxFormatDepth = 30;
            assertConfig.maxCompareDepth = 80;
            assertConfig.maxCompareCheckDepth = 40;

            assert.equal(assertConfig.format.maxFormatDepth, 30);
            assert.equal(assertConfig.maxCompareDepth, 80);
            assert.equal(assertConfig.maxCompareCheckDepth, 40);
        });

        it("should work with per-assertion config override", () => {
            let obj1 = { a: 1 };
            let obj2 = { a: 1 };

            // Use custom config for this specific assertion
            expect(obj1, "should match", {
                maxCompareDepth: 200,
                format: {
                    maxFormatDepth: 100
                }
            }).to.deep.equal(obj2);
        });
    });
});
