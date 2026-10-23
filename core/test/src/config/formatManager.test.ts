/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { assertConfig } from "../../../src/config/assertConfig";
import { createFormatMgr } from "../../../src/config/formatManager";
import { IFormatCtx, IFormatter } from "../../../src/interfaces/IFormatter";
import { eFormatResult } from "../../../src/types/FormatResult";

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

    describe("createFormatMgr()", function () {
        function numberFormatter(tag: string): IFormatter {
            return {
                name: tag,
                value: (_ctx: IFormatCtx, value: any) => {
                    if (typeof value === "number") {
                        return { res: eFormatResult.Ok, val: tag + ":" + value };
                    }

                    return { res: eFormatResult.Skip };
                }
            };
        }

        it("should apply the formatters registered on the created manager itself", function () {
            const mgr = createFormatMgr(assertConfig);
            mgr.addFormatter(numberFormatter("own"));

            assert.equal(mgr.format(42), "own:42");
            assert.equal(mgr.format({ a: 1 }), "{a:own:1}", "nested values formatted through the context use the same manager");
            assert.equal(assertConfig.$ops.formatMgr.format(42), "42", "the configuration's own manager is not affected");
        });

        it("should fall back to the formatters inherited from the supplied parent", function () {
            const parent = createFormatMgr(assertConfig);
            parent.addFormatter(numberFormatter("parent"));
            const child = createFormatMgr(assertConfig, parent);

            assert.equal(child.format(7), "parent:7");

            child.addFormatter(numberFormatter("child"));
            assert.equal(child.format(7), "child:7", "own formatters take precedence over inherited ones");
            assert.equal(parent.format(7), "parent:7", "the parent does not see the child's formatters");
        });

        it("should report a failure while walking the formatters instead of throwing", function () {
            const broken: any = {
                forEach: () => {
                    throw new Error("formatter walk failed");
                }
            };
            const mgr = createFormatMgr(assertConfig, broken);

            const result = mgr.format(1);
            assert.includes(result, "formatter walk failed");
        });

        it("should format with the configuration it was created with", function () {
            const cfg = assertConfig.$ops.clone({
                format: {
                    finalize: true,
                    finalizeFn: (value: string) => "<" + value + ">"
                }
            });
            const mgr = createFormatMgr(cfg);

            assert.equal(mgr.format(1), "<1>");
            assert.equal(assertConfig.$ops.formatMgr.format(1), "1");
        });
    });
});
