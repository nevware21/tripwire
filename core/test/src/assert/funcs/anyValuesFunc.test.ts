/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../../src/assert/expect";
import { checkError } from "../../support/checkError";
import { anyValuesFunc } from "../../../../src/assert/funcs/valuesFunc";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { createContext } from "../../../../src/assert/scopeContext";

describe("anyValuesFunc", () => {
    it("should find a value in an array", () => {
        const context = [1, 2, 3];
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, 1)).to.not.throw();
        expect(() => valuesFn.call(scope, 2)).to.not.throw();
        expect(() => valuesFn.call(scope, 3)).to.not.throw();
    });

    it("should find a value in a string", () => {
        const context = "hello";
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, "h")).to.not.throw();
        expect(() => valuesFn.call(scope, "e")).to.not.throw();
        expect(() => valuesFn.call(scope, "l")).to.not.throw();
        expect(() => valuesFn.call(scope, "o")).to.not.throw();
    });

    it("should find a key in an object", () => {
        const context = { a: 1, b: 2, c: 3 };
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, "a")).to.not.throw();
        expect(() => valuesFn.call(scope, "b")).to.not.throw();
        expect(() => valuesFn.call(scope, "c")).to.not.throw();
    });

    it("should handle multiple values", () => {
        const context = [1, 2, 3];
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, 1, 4, 5)).to.not.throw();
        expect(() => valuesFn.call(scope, 4, 2, 6)).to.not.throw();
        expect(() => valuesFn.call(scope, 5, 6, 3)).to.not.throw();
    });

    it("should handle array of values", () => {
        const context = [1, 2, 3];
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, [1, 4, 5])).to.not.throw();
        expect(() => valuesFn.call(scope, [4, 2, 6])).to.not.throw();
        expect(() => valuesFn.call(scope, [5, 6, 3])).to.not.throw();
    });

    it("should fail when value not found", () => {
        const context = [1, 2, 3];
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        checkError(() => {
            valuesFn.call(scope, 4, 5, 6);
        }, /expected any value: \[4,5,6\], found: \[1,2,3\] \(3 values\)/);
    });

    it("should fail when array of values not found", () => {
        const context = [1, 2, 3];
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        checkError(() => {
            valuesFn.call(scope, [4, 5, 6]);
        }, /expected any value: \[4,5,6\], found: \[1,2,3\] \(3 values\)/);
    });

    it("should handle null and undefined values", () => {
        const context = [null, undefined, 0, ""];
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, null)).to.not.throw();
        expect(() => valuesFn.call(scope, undefined)).to.not.throw();
        expect(() => valuesFn.call(scope, 0)).to.not.throw();
        expect(() => valuesFn.call(scope, "")).to.not.throw();
    });

    it("should handle empty string context", () => {
        const context = "";
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, "")).to.not.throw();
        
        checkError(() => {
            valuesFn.call(scope, "a");
        }, /expected any value: \["a"\], found: "" \(1 value\)/);
    });

    it("should handle null context", () => {
        const context: any = null;
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, null)).to.not.throw();
        
        checkError(() => {
            valuesFn.call(scope, "a");
        }, /expected any value: \["a"\], found: null \(1 value\)/);
    });

    it("should handle undefined context", () => {
        const context: any = undefined;
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, undefined)).to.not.throw();
        
        checkError(() => {
            valuesFn.call(scope, "a");
        }, /expected any value: \["a"\], found: undefined \(1 value\)/);
    });

    it("should find substrings in a longer text string", () => {
        const context = "hello darkness old friend";
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, "hello")).to.not.throw();
        expect(() => valuesFn.call(scope, "darkness")).to.not.throw();
        expect(() => valuesFn.call(scope, "old")).to.not.throw();
        expect(() => valuesFn.call(scope, "friend")).to.not.throw();
        expect(() => valuesFn.call(scope, "hello darkness")).to.not.throw();
        expect(() => valuesFn.call(scope, "darkness old")).to.not.throw();
        expect(() => valuesFn.call(scope, "old friend")).to.not.throw();
    });

    it("should detect when no substrings match in a longer text", () => {
        const context = "hello darkness old friend";
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        expect(() => valuesFn.call(scope, "vision", "sound", "silence")).to.throw();
        
        checkError(() => {
            valuesFn.call(scope, "talking", "hearing", "whisper");
        }, /expected any value: \["talking","hearing","whisper"\], found: "hello darkness old friend" \(1 value\)/);
    });

    it("should find at least one substring from a list of options", () => {
        const context = "hello darkness old friend silence sound";
        const scope = createAssertScope(createContext(context));
        const valuesFn = anyValuesFunc(scope);

        // At least one word exists in the string
        expect(() => valuesFn.call(scope, "silence", "talking", "hearing")).to.not.throw();
        expect(() => valuesFn.call(scope, "whisper", "sound", "vision")).to.not.throw();
        
        // Different combinations of existing and non-existing words
        expect(() => valuesFn.call(scope, ["hello", "whisper", "vision"])).to.not.throw();
        expect(() => valuesFn.call(scope, ["silence", "sound", "echo"])).to.not.throw();
    });
});