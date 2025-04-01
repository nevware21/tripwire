/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../../src/assert/expect";
import { checkError } from "../../support/checkError";
import { allValuesFunc } from "../../../../src/assert/funcs/valuesFunc";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { createContext } from "../../../../src/assert/scopeContext";

describe("allValuesFunc", () => {
    it("should pass when all values are in an array", () => {
        const context = [1, 2, 3];
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, 1, 2, 3)).to.not.throw();
        expect(() => valuesFn.call(scope, 1)).to.not.throw();
        expect(() => valuesFn.call(scope, 2)).to.not.throw();
        expect(() => valuesFn.call(scope, 3)).to.not.throw();
        expect(() => valuesFn.call(scope, [1, 2, 3])).to.not.throw();
        expect(() => valuesFn.call(scope, [1])).to.not.throw();
    });

    it("should pass when all characters are in a string", () => {
        const context = "hello";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, "h", "e", "l", "o")).to.not.throw();
        expect(() => valuesFn.call(scope, "h", "e", "l")).to.not.throw();
        expect(() => valuesFn.call(scope, ["h", "e", "l", "o"])).to.not.throw();
    });

    it("should pass when all keys are in an object", () => {
        const context = { a: 1, b: 2, c: 3 };
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, "a", "b", "c")).to.not.throw();
        expect(() => valuesFn.call(scope, "a", "b")).to.not.throw();
        expect(() => valuesFn.call(scope, ["a", "b", "c"])).to.not.throw();
    });

    it("should fail when not all values are in an array", () => {
        const context = [1, 2, 3];
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        checkError(() => {
            valuesFn.call(scope, 1, 2, 3, 4);
        }, /expected all values: \[1,2,3,4\], missing: \[4\], found: \[1,2,3\] \(3 values\)/);

        checkError(() => {
            valuesFn.call(scope, 4);
        }, /expected all values: \[4\], missing: \[4\], found: \[1,2,3\] \(3 values\)/);

        checkError(() => {
            valuesFn.call(scope, [1, 2, 3, 4]);
        }, /expected all values: \[1,2,3,4\], missing: \[4\], found: \[1,2,3\] \(3 values\)/);
    });

    it("should fail when not all characters are in a string", () => {
        const context = "hello";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        checkError(() => {
            valuesFn.call(scope, "h", "e", "l", "o", "z");
        }, /expected all values: \[h,e,l,o,z\], missing: \[z\], found: \[hello\] \(1 value\)/);

        checkError(() => {
            valuesFn.call(scope, ["h", "e", "l", "o", "z"]);
        }, /expected all values: \[h,e,l,o,z\], missing: \[z\], found: \[hello\] \(1 value\)/);
    });

    it("should fail when not all keys are in an object", () => {
        const context = { a: 1, b: 2, c: 3 };
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        checkError(() => {
            valuesFn.call(scope, "a", "b", "c", "d");
        }, /expected all values: \[a,b,c,d\], missing: \[d\], found: \[a,b,c\] \(3 values\)/);

        checkError(() => {
            valuesFn.call(scope, ["a", "b", "c", "d"]);
        }, /expected all values: \[a,b,c,d\], missing: \[d\], found: \[a,b,c\] \(3 values\)/);
    });

    it("should handle multiple missing values", () => {
        const context = [1, 2, 3];
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        checkError(() => {
            valuesFn.call(scope, 1, 4, 5);
        }, /expected all values: \[1,4,5\], missing: \[4,5\], found: \[1,2,3\] \(3 values\)/);
    });

    it("should handle null and undefined values", () => {
        const context = [null, undefined, 0, ""];
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, null, undefined, 0, "")).to.not.throw();
        expect(() => valuesFn.call(scope, [null, undefined, 0, ""])).to.not.throw();

        checkError(() => {
            valuesFn.call(scope, null, undefined, 0, "", "a");
        }, /expected all values: \[null,undefined,0,"",a\], missing: \[a\], found: \[null,undefined,0,""\] \(4 values\)/);
    });

    it("should handle empty string context", () => {
        const context = "";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, "")).to.not.throw();
        
        checkError(() => {
            valuesFn.call(scope, "", "a");
        }, /expected all values: \["",a\], missing: \[a\], found: \[""\] \(1 value\)/);
    });

    it("should handle null context", () => {
        const context: any = null;
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, null)).to.not.throw();
        
        checkError(() => {
            valuesFn.call(scope, null, "a");
        }, /expected all values: \[null,a\], missing: \[a\], found: \[null\] \(1 value\)/);
    });

    it("should handle undefined context", () => {
        const context: any = undefined;
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, undefined)).to.not.throw();
        
        checkError(() => {
            valuesFn.call(scope, undefined, "a");
        }, /expected all values: \[undefined,a\], missing: \[a\], found: \[undefined\] \(1 value\)/);
    });

    it("should check for all substrings in a longer text", () => {
        const context = "hello darkness my old friend";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        // These words are all in the string
        expect(() => valuesFn.call(scope, "hello", "darkness", "my", "old", "friend")).to.not.throw();
        expect(() => valuesFn.call(scope, ["hello", "darkness", "my", "old", "friend"])).to.not.throw();
        
        // These partial substrings are all in the string
        expect(() => valuesFn.call(scope, "hello", "dark", "my", "old", "fri")).to.not.throw();
    });

    it("should detect missing substrings in a longer text", () => {
        const context = "hello darkness my old friend";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        // Missing words: silence, sound
        checkError(() => {
            valuesFn.call(scope, "hello", "darkness", "silence", "sound");
        }, /expected all values: \[hello,darkness,silence,sound\], missing: \[silence,sound\], found: \[hello darkness my old friend\] \(1 value\)/);
        
        // Missing words: vision, talking, hearing
        checkError(() => {
            valuesFn.call(scope, ["darkness", "my", "old", "vision", "talking", "hearing"]);
        }, /expected all values: \[darkness,my,old,vision,talking,hearing\], missing: \[vision,talking,hearing\], found: \[hello darkness my old friend\] \(1 value\)/);
    });

    it("should handle known Sound of Silence lyric combinations", () => {
        // Full verse lyric line
        const context = "hello darkness my old friend I've come to talk with you again";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        // These parts are all in the verse
        expect(() => valuesFn.call(scope, "hello darkness", "my old friend", "talk with you")).to.not.throw();
        
        // Missing parts: whispers, restless dreams, remains
        checkError(() => {
            valuesFn.call(scope, "hello darkness", "whispers", "restless dreams", "remains");
        }, /expected all values: \[hello darkness,whispers,restless dreams,remains\], missing: \[whispers,restless dreams,remains\], found: \[hello darkness my old friend I've come to talk with you again\] \(1 value\)/);
    });
});