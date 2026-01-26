/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { createAssertScope } from "../../../src/assert/assertScope";
import { deepIncludeOp } from "../../../src/assert/ops/includeOp";
import { createContext } from "../../../src/assert/scopeContext";
import { checkError } from "../support/checkError";


describe("deepIncludeOp", () => {
    // Test case null object
    it("should fail for null object", () => {
        const scope = createAssertScope(createContext(null));
        const op = deepIncludeOp(scope);

        checkError(() => {
            op.call(scope, "key");
        }, "argument null (\"null\") is not a supported collection type for the operation.");

        expect(() => op.call(scope, "key")).to.throw();
    });

    // Test case undefined object
    it("should fail for undefined object", () => {
        const scope = createAssertScope(createContext(undefined));
        const op = deepIncludeOp(scope);

        checkError(() => {
            op.call(scope, "key");
        }, "argument undefined (\"undefined\") is not a supported collection type for the operation.");

        expect(() => op.call(scope, "key")).to.throw();
    });

    it("should include key-value pair in the object", () => {
        const obj = {};
        const scope = createAssertScope(createContext(obj));
        const op = deepIncludeOp(scope);

        checkError(() => {
            op.call(scope, "key");
        }, "expected {} to have a deep \"key\" property");

        expect(() => op.call(scope, "key")).to.throw();
    });

    it("should return false if key already exists", () => {
        const obj = { hello: "darkness" };
        const scope = createAssertScope(createContext(obj));
        const op = deepIncludeOp(scope);

        op.call(scope, "hello");
        checkError(() => {
            op.call(scope, "my");
        }, "expected {hello:\"darkness\"} to have a deep \"my\" property");

        expect(() => op.call(scope, "hello")).to.not.throw();
        expect(() => op.call(scope, "friend")).to.throw();
    });

    it("should handle nested objects", () => {
        const obj = { hello: {} };
        const scope = createAssertScope(createContext(obj));
        const op = deepIncludeOp(scope);

        checkError(() => {
            op.call(scope, "key");
        }, "expected {hello:{}} to have a deep \"key\" property");
    });

    it("should handle non-object inputs gracefully", () => {
        const obj: any = null;
        const scope = createAssertScope(createContext(obj));
        const op = deepIncludeOp(scope);
        checkError(() => {
            op.call(scope, "key");
        }, "argument null (\"null\") is not a supported collection type for the operation.");
    });
});