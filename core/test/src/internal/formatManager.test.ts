/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { assertConfig } from "../../../src/config/assertConfig";

describe("formatManager", function () {
    describe("formatMgr.format() convenience method", function () {
        afterEach(function () {
            assertConfig.$ops.reset();
        });

        it("should format simple objects", function () {
            let formatMgr = assertConfig.$ops.formatMgr;

            let result = formatMgr.format({ a: 1, b: "test" });
            assert.equal(result, "{a:1,b:\"test\"}");
        });

        it("should format circular objects", function () {
            let formatMgr = assertConfig.$ops.formatMgr;
            let circular = assertConfig.circularMsg?.();

            let obj: any = { value: 42 };
            obj.self = obj;

            let result = formatMgr.format(obj);
            // When using formatMgr.format(), circular tracking starts fresh for each call
            // so the object is formatted one level deep before detecting circularity
            assert.equal(result, `{value:42,self:{value:42,self:${circular}}}`);
        });

        it("should apply finalize option", function () {
            let formatMgr = assertConfig.$ops.formatMgr;

            assertConfig.format = {
                finalize: true
            };

            let obj = { text: "\x1b[31mRed\x1b[0m" };
            let result = formatMgr.format(obj);

            // Should escape ANSI codes
            assert.includes(result, "\\x1b[31m");
            assert.includes(result, "\\x1b[0m");
        });

        it("should work with custom formatters", function () {
            let formatMgr = assertConfig.$ops.formatMgr;

            formatMgr.addFormatter({
                name: "testFormatter",
                value: (ctx, value) => {
                    if (typeof value === "number" && value > 100) {
                        return {
                            res: 0, // eFormatResult.Ok
                            val: `BIG:${value}`
                        };
                    }
                    return { res: 2 }; // eFormatResult.Skip
                }
            });

            let result = formatMgr.format({ small: 10, large: 500 });
            assert.equal(result, "{small:10,large:BIG:500}");
        });

        it("should handle multiple format calls independently", function () {
            let formatMgr = assertConfig.$ops.formatMgr;

            let obj1 = { type: "first" };
            let obj2 = { type: "second" };

            let result1 = formatMgr.format(obj1);
            let result2 = formatMgr.format(obj2);

            assert.equal(result1, "{type:\"first\"}");
            assert.equal(result2, "{type:\"second\"}");

            // Format obj1 again - should not be affected by previous calls
            let result3 = formatMgr.format(obj1);
            assert.equal(result3, "{type:\"first\"}");
        });
    });
});
