/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.isOk", function () {
    it("examples", function () {
        assert.isOk(1); // Passes
        assert.isOk("a"); // Passes
        assert.isOk([]); // Passes
        assert.isOk({}); // Passes
        assert.isOk(new Map()); // Passes
        assert.isOk(new Set()); // Passes
        assert.isOk(new Date()); // Passes
        assert.isOk(true); // Passes

        checkError(function () {
            assert.isOk(false); // Throws AssertionError
        }, "expected false to be truthy");

        checkError(function () {
            assert.isOk(0, "Value should be truthy"); // Throws AssertionFailure with message "Value should be truthy"
        }, "Value should be truthy");

        checkError(function () {
            assert.isOk(""); // Throws AssertionError
        }, "expected \"\" to be truthy");

        checkError(function () {
            assert.isOk(null); // Throws AssertionError
        }, "expected null to be truthy");

        checkError(function () {
            assert.isOk(undefined); // Throws AssertionError
        }, "expected undefined to be truthy");
    });

    it("examples", function () {
        checkError(function () {
            assert.isOk(0); // Throws AssertionError
        }, "expected 0 to be truthy");

        assert.isOk(1); // Passes

        checkError(function () {
            assert.isOk(false); // Throws AssertionError
        }, "expected false to be truthy");

        assert.isOk(true); // Passes

        checkError(function () {
            assert.isOk(null); // Throws AssertionError
        }, "expected null to be truthy");

        checkError(function () {
            assert.isOk(undefined); // Throws AssertionError
        }, "expected undefined to be truthy");

        checkError(function () {
            assert.isOk(""); // Throws AssertionError
        }, "expected \"\" to be truthy");

        assert.isOk("a"); // Passes
        assert.isOk([]); // Passes
        assert.isOk([1]); // Passes
        assert.isOk({}); // Passes
        assert.isOk({ a: 1 }); // Passes
        assert.isOk(new Date()); // Passes
        assert.isOk(new Error()); // Passes
        assert.isOk(() => { }); // Passes
        assert.isOk(Symbol("a")); // Passes
        assert.isOk(BigInt(1)); // Passes

        checkError(function () {
            assert.isOk(0, "Value is not truthy"); // Throws AssertionFailure    });
        }, "Value is not truthy");
    });

    it("isOk", function () {
        assert.isOk(true);
        assert.isOk(1);
        assert.isOk("Hello Darkness");

        checkError(function () {
            assert.isOk(false, "Hello");
        }, "Hello");

        checkError(function () {
            assert.isOk(0, "Darkness");
        }, "Darkness");

        checkError(function () {
            assert.isOk("", "my old friend");
        }, "my old friend");
    });

    it("as property", function () {
        (assert as any)["isOk"](true);
        (assert as any)["isOk"](1);
        (assert as any)["isOk"]("Hello Darkness");

        checkError(function () {
            (assert as any)["isOk"](false, "Hello");
        }, "Hello");

        checkError(function () {
            (assert as any)["isOk"](0, "Darkness");
        }, "Darkness");

        checkError(function () {
            (assert as any)["isOk"]("", "my old friend");
        }, "my old friend");

    });
});

describe("assert.ok", function () {
    it("examples", function () {
        assert.ok(1); // Passes
        assert.ok("a"); // Passes
        assert.ok([]); // Passes
        assert.ok({}); // Passes
        assert.ok(new Map()); // Passes
        assert.ok(new Set()); // Passes
        assert.ok(new Date()); // Passes
        assert.ok(true); // Passes

        checkError(function () {
            assert.ok(false); // Throws AssertionError
        }, "expected false to be truthy");

        checkError(function () {
            assert.ok(0, "Value should be truthy"); // Throws AssertionFailure with message "Value should be truthy"
        }, "Value should be truthy");

        checkError(function () {
            assert.ok(""); // Throws AssertionError
        }, "expected \"\" to be truthy");

        checkError(function () {
            assert.ok(null); // Throws AssertionError
        }, "expected null to be truthy");

        checkError(function () {
            assert.ok(undefined); // Throws AssertionError
        }, "expected undefined to be truthy");
    });

    it("examples", function () {
        checkError(function () {
            assert.ok(0); // Throws AssertionError
        }, "expected 0 to be truthy");

        assert.ok(1); // Passes

        checkError(function () {
            assert.isOk(false); // Throws AssertionError
        }, "expected false to be truthy");

        assert.ok(true); // Passes

        checkError(function () {
            assert.ok(null); // Throws AssertionError
        }, "expected null to be truthy");

        checkError(function () {
            assert.ok(undefined); // Throws AssertionError
        }, "expected undefined to be truthy");

        checkError(function () {
            assert.ok(""); // Throws AssertionError
        }, "expected \"\" to be truthy");

        assert.ok("a"); // Passes
        assert.ok([]); // Passes
        assert.ok([1]); // Passes
        assert.ok({}); // Passes
        assert.ok({ a: 1 }); // Passes
        assert.ok(new Date()); // Passes
        assert.ok(new Error()); // Passes
        assert.ok(() => { }); // Passes
        assert.ok(Symbol("a")); // Passes
        assert.ok(BigInt(1)); // Passes

        checkError(function () {
            assert.ok(0, "Value is not truthy"); // Throws AssertionFailure    });
        }, "Value is not truthy");
    });

    it("ok", function () {
        assert.ok(true);
        assert.ok(1);
        assert.ok("Hello Darkness");

        checkError(function () {
            assert.ok(false, "Hello");
        }, "Hello");

        checkError(function () {
            assert.ok(0, "Darkness");
        }, "Darkness");

        checkError(function () {
            assert.ok("", "my old friend");
        }, "my old friend");
    });

    it("as property", function () {
        (assert as any)["ok"](true);
        (assert as any)["ok"](1);
        (assert as any)["ok"]("Hello Darkness");

        checkError(function () {
            (assert as any)["ok"](false, "Hello");
        }, "Hello");

        checkError(function () {
            (assert as any)["ok"](0, "Darkness");
        }, "Darkness");

        checkError(function () {
            (assert as any)["ok"]("", "my old friend");
        }, "my old friend");
    });
});

describe("assert.isNotOk", function () {
    it("examples", function () {
        assert.isNotOk(0); // Passes
        checkError(function () {
            assert.isNotOk(1); // Throws AssertionError
        }, "not expected 1 to be truthy");
        checkError(function () {
            assert.isNotOk(true); // Throws AssertionError
        }, "not expected true to be truthy");

        assert.isNotOk(false); // Passes
        assert.isNotOk(null); // Passes
        assert.isNotOk(undefined); // Passes
        assert.isNotOk(""); // Passes

        checkError(function () {
            assert.isNotOk("a"); // Throws AssertionError
        }, "not expected \"a\" to be truthy");

        checkError(function () {
            assert.isNotOk([]); // Throws AssertionError
        }, "not expected [] to be truthy");

        checkError(function () {
            assert.isNotOk([1]); // Throws AssertionError
        }, "not expected [1] to be truthy");

        checkError(function () {
            assert.isNotOk([1, 2]); // Throws AssertionError
        }, "not expected [1,2] to be truthy");

        checkError(function () {
            assert.isNotOk({}); // Throws AssertionError
        }, "not expected {} to be truthy");

        checkError(function () {
            assert.isNotOk({ a: 1 }); // Throws AssertionError
        }, "not expected {a:1} to be truthy");

        checkError(function () {
            assert.isNotOk(new Map()); // Throws AssertionError
        }, /not expected .*Map.* to be truthy/);
        
        checkError(function () {
            assert.isNotOk(new Map([["a", 1]])); // Throws AssertionError
        }, /not expected .*Map.* to be truthy/);

        checkError(function () {
            assert.isNotOk(new Set()); // Throws AssertionError
        }, /not expected .*Set.* to be truthy/);

        checkError(function () {
            assert.isNotOk(new Set([1, 2])); // Throws AssertionError
        }, /not expected .*Set.* to be truthy/);

        let dt = new Date();
        checkError(function () {
            assert.isNotOk(dt); // Throws AssertionError
        }, /not expected \[Date.*\] to be truthy/);
    });
});
