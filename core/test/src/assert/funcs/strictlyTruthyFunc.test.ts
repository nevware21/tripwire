/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../../src/assert/expect";
import { strictlyTruthyFunc } from "../../../../src/assert/funcs/truthy";
import { checkError } from "../../support/checkError";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { createContext } from "../../../../src/assert/scopeContext";

describe("strictlyTruthyFunc", () => {
    it("should evaluate if the value is strictly true", () => {
        const context = true;
        const scope = createAssertScope(createContext(context));

        expect(() => strictlyTruthyFunc.call(scope)).to.not.throw();
    });

    it("should throw an error if the value is not strictly true", () => {
        const context = false;
        const scope = createAssertScope(createContext(context));

        expect(() => strictlyTruthyFunc.call(scope)).to.throw(/expected .* to be strictly true/);
    });

    it("should throw an error if the value is not strictly true", () => {
        const context = 1;
        const scope = createAssertScope(createContext(context));

        expect(() => strictlyTruthyFunc.call(scope)).to.throw(/expected .* to be strictly true/);
    });

    it("should throw an error if the value is not strictly true", () => {
        const context = Boolean(true);
        const scope = createAssertScope(createContext(context));

        expect(() => strictlyTruthyFunc.call(scope)).to.not.throw();
    });

    it("should throw an error if the value is not strictly true", () => {
        const context = Boolean(false);
        const scope = createAssertScope(createContext(context));

        expect(() => strictlyTruthyFunc.call(scope)).to.throw(/expected .* to be strictly true/);
    });

    it("should allow custom error message", () => {
        const context = false;
        const scope = createAssertScope(createContext(context));

        expect(() => strictlyTruthyFunc.call(scope, "Custom error message")).to.throw(/Custom error message/);
    });


    it("null", () => {
        const context: any = null;
        const scope = createAssertScope(createContext(context));

        checkError(() => {
            strictlyTruthyFunc.call(scope);
        }, "expected null to be strictly true");
    });

    it("undefined", () => {
        const context: any = undefined;
        const scope = createAssertScope(createContext(context));

        checkError(() => {
            strictlyTruthyFunc.call(scope);
        }, "expected undefined to be strictly true");
    });
});