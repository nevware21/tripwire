/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../../src/assert/expect";
import { hasOwnPropertyDescriptorFunc, hasPropertyDescriptorFunc } from "../../../../src/assert/funcs/hasProperty";
import { checkError } from "../../support/checkError";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { createContext } from "../../../../src/assert/scopeContext";

describe("hasPropertyDescriptorFunc", () => {
    it("should assert property descriptor", () => {
        const context = { a: 1 };
        let scope = createAssertScope(createContext(context));
        const descriptor = { configurable: true, enumerable: true, value: 1, writable: true };

        checkError(() => {
            hasPropertyDescriptorFunc.call(scope, "a", { configurable: true, enumerable: true, value: 2, writable: true });
        }, /expected .* to equal property descriptor/);

        scope = createAssertScope(createContext(context));
        hasPropertyDescriptorFunc.call(scope, "a", { value: 1, writable: true, enumerable: true, configurable: true });

        scope = createAssertScope(createContext(context));
        expect(() => hasPropertyDescriptorFunc.call(scope, "a", 1)).to.throw();

        scope = createAssertScope(createContext(context));
        expect(() => hasPropertyDescriptorFunc.call(scope, "a", { value: 1, writable: true, enumerable: true, configurable: true })).to.not.throw();

        scope = createAssertScope(createContext(context));
        expect(() => hasPropertyDescriptorFunc.call(scope, "a", descriptor)).to.not.throw();
    });

    it("null", () => {
        const obj: any = null;
        const scope = createAssertScope(createContext(obj));

        checkError(() => {
            hasPropertyDescriptorFunc.call(scope, "hello");
        }, "expected null to have a \"hello\" property descriptor");
    });

    it("undefined", () => {
        const obj: any = undefined;
        const scope = createAssertScope(createContext(obj));

        checkError(() => {
            hasPropertyDescriptorFunc.call(scope, "darkness");
        }, "expected undefined to have a \"darkness\" property descriptor");
    });
});

describe("hasOwnPropertyDescriptorFunc", () => {
    it("should assert own property descriptor", () => {
        const context = { a: 1 };
        let scope = createAssertScope(createContext(context));
        const descriptor = { configurable: true, enumerable: true, value: 1, writable: true };

        checkError(() => {
            hasOwnPropertyDescriptorFunc.call(scope, "a", { configurable: true, enumerable: true, value: 2, writable: true });
        }, /expected .* to equal property descriptor/);

        scope = createAssertScope(createContext(context));
        expect(() => hasOwnPropertyDescriptorFunc.call(scope, "a", descriptor)).to.not.throw();
    });
});
