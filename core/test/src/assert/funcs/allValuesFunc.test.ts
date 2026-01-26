/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
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
        }, /expected all values: \["h","e","l","o","z"\], missing: \["z"\], found: "hello" \(1 value\)/);

        checkError(() => {
            valuesFn.call(scope, ["h", "e", "l", "o", "z"]);
        }, /expected all values: \["h","e","l","o","z"\], missing: \["z"\], found: "hello" \(1 value\)/);
    });

    it("should fail when not all keys are in an object", () => {
        const context = { a: 1, b: 2, c: 3 };
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        checkError(() => {
            valuesFn.call(scope, "a", "b", "c", "d");
        }, /expected all values: \["a","b","c","d"\], missing: \["d"\], found: \["a","b","c"\] \(3 values\)/);

        checkError(() => {
            valuesFn.call(scope, ["a", "b", "c", "d"]);
        }, /expected all values: \["a","b","c","d"\], missing: \["d"\], found: \["a","b","c"\] \(3 values\)/);
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
        }, /expected all values: \[null,undefined,0,"",\"a\"\], missing: \[\"a\"\], found: \[null,undefined,0,""\] \(4 values\)/);
    });

    it("should handle empty string context", () => {
        const context = "";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, "")).to.not.throw();
        
        checkError(() => {
            valuesFn.call(scope, "", "a");
        }, /expected all values: \["","a"\], missing: \["a"\], found: "" \(1 value\)/);
    });

    it("should handle null context", () => {
        const context: any = null;
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, null)).to.not.throw();
        
        checkError(() => {
            valuesFn.call(scope, null, "a");
        }, /expected all values: \[null,"a"\], missing: \["a"\], found: null \(1 value\)/);
    });

    it("should handle undefined context", () => {
        const context: any = undefined;
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        expect(() => valuesFn.call(scope, undefined)).to.not.throw();
        
        checkError(() => {
            valuesFn.call(scope, undefined, "a");
        }, /expected all values: \[undefined,"a"\], missing: \["a"\], found: undefined \(1 value\)/);
    });

    it("should check for all substrings in a longer text", () => {
        const context = "walking and talking into the darkness";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        // These words are all in the string
        expect(() => valuesFn.call(scope, "walking", "and", "talking", "into", "darkness")).to.not.throw();
        expect(() => valuesFn.call(scope, ["walking", "and", "talking", "into", "darkness"])).to.not.throw();
        
        // These partial substrings are all in the string
        expect(() => valuesFn.call(scope, "walk", "and", "talk", "into", "dark")).to.not.throw();
    });

    it("should detect missing substrings in a longer text", () => {
        const context = "say hello while running and jumping";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        // Missing words: silence, sound
        checkError(() => {
            valuesFn.call(scope, "hello", "running", "silence", "sound");
        }, /expected all values: \[\"hello\",\"running\",\"silence\",\"sound\"\], missing: \[\"silence\",\"sound\"\], found: "say hello while running and jumping" \(1 value\)/);
        
        // Missing words: walking, talking, seeing
        checkError(() => {
            valuesFn.call(scope, ["hello", "running", "and", "walking", "talking", "seeing"]);
        }, /expected all values: \[\"hello\",\"running\",\"and\",\"walking\",\"talking\",\"seeing\"\], missing: \[\"walking\",\"talking\",\"seeing\"\], found: "say hello while running and jumping" \(1 value\)/);
    });

    it("should handle longer phrase combinations", () => {
        // Full phrase with hello and darkness spread out
        const context = "we said hello while walking through the darkness and listening";
        const scope = createAssertScope(createContext(context));
        const valuesFn = allValuesFunc(scope);

        // These parts are all in the phrase
        expect(() => valuesFn.call(scope, "said hello", "walking through", "darkness and")).to.not.throw();
        
        // Missing parts: swimming, climbing, flying
        checkError(() => {
            valuesFn.call(scope, "said hello", "swimming", "climbing", "flying");
        }, /expected all values: \[\"said hello\",\"swimming\",\"climbing\",\"flying\"\], missing: \[\"swimming\",\"climbing\",\"flying\"\], found: "we said hello while walking through the darkness and listening" \(1 value\)/);
    });
});