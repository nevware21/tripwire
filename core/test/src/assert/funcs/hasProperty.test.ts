/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../../src/assert/expect";
import { hasDeepOwnPropertyFunc, hasDeepPropertyFunc, hasOwnPropertyFunc, hasPropertyFunc } from "../../../../src/assert/funcs/hasProperty";
import { checkError } from "../../support/checkError";
import { createAssertScope } from "../../../../src/assert/assertScope";
import { createContext } from "../../../../src/assert/scopeContext";
import { _tripwireAssertHandlers } from "../../../../src/assert/internal/_tripwireInst";

describe("hasPropertyFunc", () => {
    it("should pass when object has the specified property", () => {
        const obj = { a: 1 };
        const scope = createAssertScope(createContext(obj), _tripwireAssertHandlers);
        expect(() => hasPropertyFunc.call(scope, "a")).to.not.throw();
    });

    it("should fail when object does not have the specified property", () => {
        const obj = { a: 1 };
        const scope = createAssertScope(createContext(obj), _tripwireAssertHandlers);
        expect(() => hasPropertyFunc.call(scope, "b")).to.throw();
    });

    it("should pass when object has the specified property with the correct value", () => {
        const obj = { a: 1 };
        const scope = createAssertScope(createContext(obj), _tripwireAssertHandlers);
        expect(() => hasPropertyFunc.call(scope, "a", 1)).to.not.throw();
    });

    it("should fail when object has the specified property with the incorrect value", () => {
        const obj = { a: 1 };
        const scope = createAssertScope(createContext(obj), _tripwireAssertHandlers);
        expect(() => hasPropertyFunc.call(scope, "a", 2)).to.throw();
    });

    it("null", () => {
        const obj: any = null;
        const scope = createAssertScope(createContext(obj), _tripwireAssertHandlers);

        checkError(() => {
            hasPropertyFunc.call(scope, "hello");
        }, "expected null to have a \"hello\" property");
    });

    it("undefined", () => {
        const obj: any = undefined;
        const scope = createAssertScope(createContext(obj), _tripwireAssertHandlers);

        checkError(() => {
            hasPropertyFunc.call(scope, "darkness");
        }, "expected undefined to have a \"darkness\" property");
    });

    it("property name is a string, symbol or number", () => {
        const obj = { a: 1 };
        const scope = createAssertScope(createContext(obj), _tripwireAssertHandlers);

        checkError(() => {
            hasPropertyFunc.call(scope, null as any);
        }, "expected null to be a string, symbol, or number");

        checkError(() => {
            hasPropertyFunc.call(scope, undefined as any);
        }, "expected undefined to be a string, symbol, or number");

        checkError(() => {
            hasPropertyFunc.call(scope, {} as any);
        }, "expected {} to be a string, symbol, or number");

        checkError(() => {
            hasPropertyFunc.call(scope, [] as any);
        }, "expected [] to be a string, symbol, or number");

        checkError(() => {
            hasPropertyFunc.call(scope, /hello/ as any);
        }, "expected /hello/ to be a string, symbol, or number");

        let now = new Date();
        checkError(() => {
            hasPropertyFunc.call(scope, now as any);
        }, /expected \[Date.*\] to be a string, symbol, or number/);

        checkError(() => {
            hasPropertyFunc.call(scope, 1 as any);
        }, "expected {a:1} to have a 1 property");

        checkError(() => {
            hasPropertyFunc.call(scope, "1" as any);
        }, "expected {a:1} to have a \"1\" property");
    });
});

describe("hasOwnPropertyFunc", () => {
    it("should pass when object has the specified own property", () => {
        const obj = { a: 1 };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasOwnPropertyFunc.call(scope, "a")).to.not.throw();
    });

    it("should fail when object does not have the specified own property", () => {
        const obj = { a: 1 };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasOwnPropertyFunc.call(scope, "b")).to.throw();
    });

    it("should pass when object has the specified own property with the correct value", () => {
        const obj = { a: 1 };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasOwnPropertyFunc.call(scope, "a", 1)).to.not.throw();
    });

    it("should fail when object has the specified own property with the incorrect value", () => {
        const obj = { a: 1 };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasOwnPropertyFunc.call(scope, "a", 2)).to.throw();
    });

    it("null", () => {
        const obj: any = null;
        const scope = createAssertScope(createContext(obj));

        checkError(() => {
            hasOwnPropertyFunc.call(scope, "hello");
        }, "expected null to have its own \"hello\" property");
    });

    it("undefined", () => {
        const obj: any = undefined;
        const scope = createAssertScope(createContext(obj));

        checkError(() => {
            hasOwnPropertyFunc.call(scope, "darkness");
        }, "expected undefined to have its own \"darkness\" property");
    });
});

describe("hasDeepPropertyFunc", () => {
    it("should pass when object has the specified deep property", () => {
        const obj = { a: { b: 1 } };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasDeepPropertyFunc.call(scope, "a")).to.not.throw();
    });

    it("should fail when object does not have the specified deep property", () => {
        const obj = { a: { b: 1 } };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasDeepPropertyFunc.call(scope, "b")).to.throw();
    });

    it("should pass when object has the specified deep property with the correct value", () => {
        const obj = { a: { b: 1 } };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasDeepPropertyFunc.call(scope, "a", { b: 1 })).to.not.throw();
    });

    it("should fail when object has the specified deep property with the incorrect value", () => {
        const obj = { a: { b: 1 } };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasDeepPropertyFunc.call(scope, "a", { b: 2 })).to.throw();
    });

    it("null", () => {
        const obj: any = null;
        const scope = createAssertScope(createContext(obj));

        checkError(() => {
            hasDeepPropertyFunc.call(scope, "hello");
        }, "expected null to have a \"hello\" property");
    });

    it("undefined", () => {
        const obj: any = undefined;
        const scope = createAssertScope(createContext(obj));

        checkError(() => {
            hasDeepPropertyFunc.call(scope, "darkness");
        }, "expected undefined to have a \"darkness\" property");
    });
});

describe("hasDeepOwnPropertyFunc", () => {
    it("should pass when object has the specified deep own property", () => {
        const obj = { a: { b: 1 } };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasDeepOwnPropertyFunc.call(scope, "a")).to.not.throw();
    });

    it("should fail when object does not have the specified deep own property", () => {
        const obj = { a: { b: 1 } };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasDeepOwnPropertyFunc.call(scope, "b")).to.throw();
    });

    it("should pass when object has the specified deep own property with the correct value", () => {
        const obj = { a: { b: 1 } };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasDeepOwnPropertyFunc.call(scope, "a", { b: 1 })).to.not.throw();
    });

    it("should fail when object has the specified deep own property with the incorrect value", () => {
        const obj = { a: { b: 1 } };
        const scope = createAssertScope(createContext(obj));
        expect(() => hasDeepOwnPropertyFunc.call(scope, "a", { b: 2 })).to.throw();
    });

    it("null", () => {
        const obj: any = null;
        const scope = createAssertScope(createContext(obj));

        checkError(() => {
            hasDeepOwnPropertyFunc.call(scope, "hello");
        }, "expected null to have its own \"hello\" property");
    });

    it("undefined", () => {
        const obj: any = undefined;
        const scope = createAssertScope(createContext(obj));

        checkError(() => {
            hasDeepOwnPropertyFunc.call(scope, "darkness");
        }, "expected undefined to have its own \"darkness\" property");
    });
});