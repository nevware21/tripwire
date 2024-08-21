/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../../src/assert/expect";
import { checkError } from "../../support/checkError";
import { truthyFunc } from "../../../../src/assert/funcs/truthy";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { createContext } from "../../../../src/assert/scopeContext";

describe("truthyFunc", () => {
    it("should evaluate if the value is truthy", () => {
        const context = true;
        const scope = createAssertScope(createContext(context));

        expect(() => truthyFunc.call(scope)).to.not.throw();
    });

    it("false", () => {
        const context = false;
        const scope = createAssertScope(createContext(context));

        checkError(() => {
            truthyFunc.call(scope);
        }, /expected false to be truthy/);
    });

    it("zero", () => {
        const context = 0;
        const scope = createAssertScope(createContext(context));

        checkError(() => {
            truthyFunc.call(scope);
        }, /expected 0 to be truthy/);
    });

    it("empty string", () => {
        const context = "";
        const scope = createAssertScope(createContext(context));

        checkError(() => {
            truthyFunc.call(scope);
        }, /expected \"\" to be truthy/);
    });

    it("null", () => {
        const context: any = null;
        const scope = createAssertScope(createContext(context));

        checkError(() => {
            truthyFunc.call(scope);
        }, /expected null to be truthy/);
    });

    it("undefined", () => {
        const context: any = undefined;
        const scope = createAssertScope(createContext(context));

        checkError(() => {
            truthyFunc.call(scope);
        }, /expected undefined to be truthy/);
    });
});