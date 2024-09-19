/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { createAssertScope } from "../../../src/assert/assertScope";
import { includeOp } from "../../../src/assert/ops/includeOp";
import { createContext } from "../../../src/assert/scopeContext";
import { checkError } from "../support/checkError";

describe("includeOp", () => {
    // Test Case null object
    it("Should fail for null object", () => {
        const scope = createAssertScope(createContext(null));
        const op = includeOp(scope);

        checkError(() => {
            op.call(scope, "hello");
        }, "expected null to have a \"hello\" property");

        expect(() => op.call(scope, "hello")).to.throw();
    });

    // Test Case undefined object
    it("Should fail for undefined object", () => {
        const scope = createAssertScope(createContext(undefined));
        const op = includeOp(scope);

        checkError(() => {
            op.call(scope, "hello");
        }, "expected undefined to have a \"hello\" property");

        expect(() => op.call(scope, "hello")).to.throw();
    });

    it("should include a value in a string", () => {
        const scope = createAssertScope(createContext("Hello Darkness"));
        const op = includeOp(scope);

        checkError(() => {
            op.call(scope, "my old friend");
        }, "expected \"Hello Darkness\" to include \"my old friend\"");
        op.call(scope, "Hello");

        expect(() => op.call(scope, "Hello")).to.not.throw();
        expect(() => op.call(scope, "Foo")).to.throw();
    });

    it("should include a value in an array", () => {
        const scope = createAssertScope(createContext([1, 2, 3]));
        const op = includeOp(scope);

        checkError(() => {
            op.call(scope, 4);
        }, "expected [1,2,3] to include 4");

        expect(() => op.call(scope, 2)).to.not.throw();
        expect(() => op.call(scope, 4)).to.throw();
    });

    it("should include a value in a set or map", () => {
        const context = new Set([1, 2, 3]);
        const scope = createAssertScope(createContext(context));
        const op = includeOp(scope);

        op.call(scope, 3);
        checkError(() => {
            op.call(scope, 4);
        }, /expected.*Set.* to include 4/);

        expect(() => op.call(scope, 2)).to.not.throw();
        expect(() => op.call(scope, 4)).to.throw();
    });

    it("should include a property in an object", () => {
        const context = { a: 1, b: 2, c: 3 };
        const scope = createAssertScope(createContext(context));
        const op = includeOp(scope);

        checkError(() => {
            op.call(scope, "d");
        }, /expected \{.*\} to have a \"d\" property/);

        expect(() => op.call(scope, "a")).to.not.throw();
        expect(() => op.call(scope, "d")).to.throw();
    });
});