/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { createAssertScope } from "../../../src/assert/assertScope";
import { allKeyFilterOp, anyKeyFilterOp } from "../../../src/assert/ops/keysOp";
import { createContext } from "../../../src/assert/scopeContext";
import { checkError } from "../support/checkError";

// Define the test suite
describe("anyKeyFilter", () => {

    beforeEach(() => {
        // assertConfig.fullStack = true;
        // assertConfig.isVerbose = true;
    });

    // Test case: null object
    it("Should fail for null object", () => {
        const scope = createAssertScope(createContext(null));
        const keysOp = anyKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope, "hello");
        }, "expected any key: [\"hello\"], found: []");

        expect(() => expect(null).has.any.keys("hello")).to.throw();
    });

    // Test case: undefined object
    it("Should fail for undefined object", () => {
        const scope = createAssertScope(createContext(undefined));
        const keysOp = anyKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope, "hello");
        }, "expected any key: [\"hello\"], found: []");

        expect(() => expect(undefined).has.any.keys("hello")).to.throw();
    });

    // Test case: Empty object
    it("Should fail for missing keys", () => {
        const scope = createAssertScope(createContext({}));
        const keysOp = anyKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope, "hello");
        }, "expected any key: [\"hello\"], found: []");

        expect(() => expect({}).has.any.keys("hello")).to.throw();
    });

    // Test case: No keys, empty keys, null or undefined keys
    it("Should pass when no keys provided", () => {
        const scope = createAssertScope(createContext({}));
        const keysOp = anyKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope);
        }, "expected at least one key to be provided []");
        expect(() => expect({}).has.any.keys()).to.throw();

        checkError(() => {
            keysOp.keys.call(scope, "");
        }, "expected any key: [\"\"], found: []");
        expect(() => expect({}).has.any.keys("")).to.throw("expected any key: [\"\"], found: []");

        checkError(() => {
            keysOp.keys.call(scope, null);
        }, "expected any key: [null], found: []");
        expect(() => expect({}).has.any.keys(null as any)).to.throw("expected any key: [null], found: []");

        checkError(() => {
            keysOp.keys.call(scope, undefined);
        }, "expected any key: [undefined], found: []");
        expect(() => expect({}).has.any.keys(undefined as any)).to.throw("expected any key: [undefined], found: []");
    });

    // Test case: Array of keys with empty keys, null or undefined keys
    it("Should pass when no keys provided", () => {
        const scope = createAssertScope(createContext({}));
        const keysOp = anyKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope, []);
        }, "expected at least one key to be provided []");
        expect(() => expect({}).has.any.keys()).to.throw();

        checkError(() => {
            keysOp.keys.call(scope, [""]);
        }, "expected any key: [\"\"], found: []");
        expect(() => expect({}).has.any.keys([""])).to.throw("expected any key: [\"\"], found: []");

        checkError(() => {
            keysOp.keys.call(scope, [null]);
        }, "expected any key: [null], found: []");
        expect(() => expect({}).has.any.keys([null] as any)).to.throw("expected any key: [null], found: []");

        checkError(() => {
            keysOp.keys.call(scope, [undefined]);
        }, "expected any key: [undefined], found: []");
        expect(() => expect({}).has.any.keys([undefined] as any)).to.throw("expected any key: [undefined], found: []");
    });


    // Test case: Object with matching keys
    it("should return true if any key matches the filter", () => {
        const obj = { hello: "darkness", my: "old" };
        const scope = createAssertScope(createContext(obj));
        const keysOp = anyKeyFilterOp(scope);

        // Passing cases
        keysOp.keys.call(scope, "hello");
        keysOp.keys.call(scope, "my");
        expect(() => expect(obj).has.any.keys("hello")).to.not.throw();
        expect(() => expect(obj).has.any.keys("my")).to.not.throw();

        // Failing cases
        checkError(() => {
            keysOp.keys.call(scope, "darkness");
        }, /expected any key: \["darkness"\], found: \[.*\]/);

        expect(() => expect({}).has.any.keys("darkness")).to.throw();
    });

    // // Test case: Object with no matching keys
    // it("should return false if no key matches the filter", () => {
    //     const obj = { banana: 2, cherry: 3 };
    //     const filter = (key: string) => key.startsWith("a");
    //     expect(anyKeyFilterOp(obj, filter)).to.be(false);
    // });

    // // Test case: Object with mixed keys
    // it("should return true if at least one key matches the filter", () => {
    //     const obj = { apple: 1, banana: 2, cherry: 3 };
    //     const filter = (key: string) => key.startsWith("a");
    //     expect(anyKeyFilterOp(obj, filter)).to.be(true);
    // });
});

// Define the test suite
describe("allKeyFilter", () => {

    beforeEach(() => {
        // assertConfig.fullStack = true;
        // assertConfig.isVerbose = true;
    });

    // Test case: null object
    it("Should fail for null object", () => {
        const scope = createAssertScope(createContext(null));
        const keysOp = allKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope, "hello");
        }, "expected all keys: [\"hello\"], missing: [\"hello\"], found: []");

        expect(() => expect(null).has.any.keys("hello")).to.throw();
    });

    // Test case: undefined object
    it("Should fail for undefined object", () => {
        const scope = createAssertScope(createContext(undefined));
        const keysOp = allKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope, "hello");
        }, "expected all keys: [\"hello\"], missing: [\"hello\"], found: []");

        expect(() => expect(undefined).has.any.keys("hello")).to.throw();
    });

    // Test case: Empty object
    it("Should fail for missing keys", () => {
        const scope = createAssertScope(createContext({}));
        const keysOp = allKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope, "hello");
        }, "expected all keys: [\"hello\"], missing: [\"hello\"], found: []");

        expect(() => expect({}).has.any.keys("hello")).to.throw();
    });

    // Test case: No keys, empty keys, null or undefined keys
    it("Should pass when no keys provided", () => {
        const scope = createAssertScope(createContext({}));
        const keysOp = allKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope);
        }, "expected at least one key to be provided []");
        expect(() => expect({}).has.any.keys()).to.throw();

        checkError(() => {
            keysOp.keys.call(scope, "");
        }, "expected all keys: [\"\"], missing: [\"\"], found: []");
        expect(() => expect({}).has.any.keys("")).to.throw("expected any key: [\"\"], found: []");

        checkError(() => {
            keysOp.keys.call(scope, null);
        }, "expected all keys: [null], missing: [null], found: []");
        expect(() => expect({}).has.any.keys(null as any)).to.throw("expected any key: [null], found: []");

        checkError(() => {
            keysOp.keys.call(scope, undefined);
        }, "expected all keys: [undefined], missing: [undefined], found: []");
        expect(() => expect({}).has.any.keys(undefined as any)).to.throw("expected any key: [undefined], found: []");
    });

    // Test case: Array of keys with empty keys, null or undefined keys
    it("Should pass when no keys provided", () => {
        const scope = createAssertScope(createContext({}));
        const keysOp = allKeyFilterOp(scope);

        checkError(() => {
            keysOp.keys.call(scope, []);
        }, "expected at least one key to be provided []");
        expect(() => expect({}).has.any.keys()).to.throw();

        checkError(() => {
            keysOp.keys.call(scope, [""]);
        }, "expected all keys: [\"\"], missing: [\"\"], found: []");
        expect(() => expect({}).has.any.keys([""])).to.throw("expected any key: [\"\"], found: []");

        checkError(() => {
            keysOp.keys.call(scope, [null]);
        }, "expected all keys: [null], missing: [null], found: []");
        expect(() => expect({}).has.any.keys([null] as any)).to.throw("expected any key: [null], found: []");

        checkError(() => {
            keysOp.keys.call(scope, [undefined]);
        }, "expected all keys: [undefined], missing: [undefined], found: []");
        expect(() => expect({}).has.any.keys([undefined] as any)).to.throw("expected any key: [undefined], found: []");
    });

    // Test case: Object with matching keys
    it("should return true if any key matches the filter", () => {
        const obj = { hello: "darkness", my: "old" };
        const scope = createAssertScope(createContext(obj));
        const keysOp = allKeyFilterOp(scope);

        // Passing cases
        keysOp.keys.call(scope, "hello");
        keysOp.keys.call(scope, "my");
        expect(() => expect(obj).has.any.keys("hello")).to.not.throw();
        expect(() => expect(obj).has.any.keys("my")).to.not.throw();

        // Failing cases
        checkError(() => {
            keysOp.keys.call(scope, "darkness");
        }, /expected all keys: \["darkness"\], missing: \["darkness"\], found: \[.*\]/);

        expect(() => expect({}).has.any.keys("darkness")).to.throw();
    });


});