/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionError, AssertionFailure, AssertionFatal } from "../../../src/assert/assertionError";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("AssertionError", () => {
    it("should create an AssertionError with a message", () => {
        let error = new AssertionError("Test error message");
        
        assert.equal(error.message, "Test error message");
        assert.equal(error.name, "AssertionError");
        assert.ok(error instanceof Error);
        assert.ok(error instanceof AssertionError);
    });

    it("should create an AssertionError with message and innerException", () => {
        let cause = new Error("Original error");
        let error = new AssertionError("Test error", cause);
        
        assert.ok(error.message.startsWith("Test error"));
        assert.ok(error.message.includes("Caused by:"));
        assert.ok(error.message.includes("Original error"));
        assert.equal((error as any).innerException, cause);
    });

    it("should create an AssertionError with message, innerException, and stackStart", () => {
        function testFunction() {
            return new AssertionError("Test error", null, testFunction);
        }
        
        let error = testFunction();
        assert.equal(error.message, "Test error");
        assert.ok(error.stack);
    });

    it("should have null innerException when not provided", () => {
        let error = new AssertionError("Test error");
        assert.equal((error as any).innerException, null);
    });

    it("should work with null innerException", () => {
        let error = new AssertionError("Test error", null);
        assert.equal((error as any).innerException, null);
    });

    it("should capture stack trace", () => {
        let error = new AssertionError("Test error");
        assert.ok(error.stack);
        assert.ok(error.stack.includes("AssertionError"));
    });

    it("should be throwable", () => {
        checkError(() => {
            throw new AssertionError("Thrown error");
        }, "Thrown error");
    });

    it("should preserve error properties when caught", () => {
        try {
            throw new AssertionError("Test message", new Error("Cause"));
        } catch (e: any) {
            assert.ok(e instanceof AssertionError);
            assert.ok(e.message.startsWith("Test message"));
            assert.ok(e.message.includes("Caused by:"));
            assert.ok(e.message.includes("Cause"));
            assert.ok(e.innerException);
            assert.equal(e.innerException.message, "Cause");
        }
    });

    it("should work with instanceof checks", () => {
        let error = new AssertionError("Test");
        assert.ok(error instanceof Error);
        assert.ok(error instanceof AssertionError);
        assert.ok(!(error instanceof AssertionFailure));
        assert.ok(!(error instanceof AssertionFatal));
    });
});

describe("AssertionFailure", () => {
    it("should create an AssertionFailure with a message", () => {
        let error = new AssertionFailure("Test failure message");
        
        assert.equal(error.message, "Test failure message");
        assert.equal(error.name, "AssertionFailure");
        assert.ok(error instanceof Error);
        assert.ok(error instanceof AssertionError);
        assert.ok(error instanceof AssertionFailure);
    });

    it("should create an AssertionFailure with message and innerException", () => {
        let cause = new Error("Original error");
        let error = new AssertionFailure("Test failure", cause);
        
        assert.ok(error.message.startsWith("Test failure"));
        assert.ok(error.message.includes("Caused by:"));
        assert.ok(error.message.includes("Original error"));
        assert.equal((error as any).innerException, cause);
    });

    it("should create an AssertionFailure with details", () => {
        let details = { actual: 1, expected: 2, operator: "equal" };
        let error = new AssertionFailure("Test failure", details);
        
        assert.equal(error.message, "Test failure");
        assert.deepEqual(error.props, details);
    });

    it("should create an AssertionFailure with all parameters", () => {
        let cause = new Error("Cause");
        let details = { actual: "a", expected: "b" };
        function stackStart() {}
        
        let error = new AssertionFailure("Test failure", cause, details, stackStart);
        
        assert.ok(error.message.startsWith("Test failure"));
        assert.ok(error.message.includes("Caused by:"));
        assert.ok(error.message.includes("Cause"));
        assert.equal((error as any).innerException, cause);
        assert.deepEqual(error.props, details);
    });

    it("should handle array of stack start functions", () => {
        function fn1() {}
        function fn2() {}
        let error = new AssertionFailure("Test", null, {}, [fn1, fn2]);
        
        assert.equal(error.message, "Test");
        assert.ok(error.stack);
    });

    it("should be throwable", () => {
        checkError(() => {
            throw new AssertionFailure("Thrown failure");
        }, "Thrown failure");
    });

    it("should work with instanceof checks", () => {
        let error = new AssertionFailure("Test");
        assert.ok(error instanceof Error);
        assert.ok(error instanceof AssertionError);
        assert.ok(error instanceof AssertionFailure);
        // AssertionFatal extends AssertionFailure, but AssertionFailure is not an instance of AssertionFatal
        assert.ok(!(error instanceof AssertionFatal));
    });

    it("should preserve details when caught", () => {
        let details = { actual: 10, expected: 20, custom: "data" };
        try {
            throw new AssertionFailure("Test", details);
        } catch (e: any) {
            assert.ok(e instanceof AssertionFailure);
            assert.deepEqual(e.props, details);
            assert.equal(e.props.actual, 10);
            assert.equal(e.props.expected, 20);
            assert.equal(e.props.custom, "data");
        }
    });

    it("should handle empty details object", () => {
        let error = new AssertionFailure("Test", {});
        assert.deepEqual(error.props, {});
    });

    it("should handle null details", () => {
        let error = new AssertionFailure("Test", null);
        assert.equal(error.props, null);
    });

    it("should handle undefined details", () => {
        let error = new AssertionFailure("Test", undefined);
        assert.equal(error.props, undefined);
    });

    it("should handle complex details object", () => {
        let details = {
            actual: [1, 2, 3],
            expected: [1, 2, 4],
            operator: "deepEqual",
            nested: {
                value: "test",
                array: [{ a: 1 }, { b: 2 }]
            }
        };
        
        let error = new AssertionFailure("Complex failure", details);
        assert.deepEqual(error.props, details);
        assert.deepEqual(error.props.actual, [1, 2, 3]);
        assert.deepEqual(error.props.nested.array, [{ a: 1 }, { b: 2 }]);
    });

    describe("readonly properties", () => {
        it("should have readonly actual property", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });
            assert.equal(error.actual, 5);
            // Verify it's accessible
            assert.ok(error.actual !== undefined);
        });

        it("should have readonly expected property", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });
            assert.equal(error.expected, 10);
            // Verify it's accessible
            assert.ok(error.expected !== undefined);
        });

        it("should have readonly operator property", () => {
            let error = new AssertionFailure("Test", { operator: "equal" });
            assert.equal(error.operator, "equal");
        });

        it("should have readonly showDiff property", () => {
            let error = new AssertionFailure("Test", { showDiff: true });
            assert.equal(error.showDiff, true);
        });

        it("should handle undefined actual", () => {
            let error = new AssertionFailure("Test", { expected: 10 });
            assert.equal(error.actual, undefined);
        });

        it("should handle undefined expected", () => {
            let error = new AssertionFailure("Test", { actual: 5 });
            assert.equal(error.expected, undefined);
        });

        it("should handle undefined operator", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });
            assert.equal(error.operator, undefined);
        });

        it("should handle undefined showDiff", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });
            assert.equal(error.showDiff, undefined);
        });

        it("should preserve actual when null", () => {
            let error = new AssertionFailure("Test", { actual: null, expected: "something" });
            assert.equal(error.actual, null);
        });

        it("should preserve expected when null", () => {
            let error = new AssertionFailure("Test", { actual: "something", expected: null });
            assert.equal(error.expected, null);
        });

        it("should handle showDiff as false", () => {
            let error = new AssertionFailure("Test", { showDiff: false });
            assert.equal(error.showDiff, false);
        });

        it("should handle all properties together", () => {
            let error = new AssertionFailure("Test", {
                actual: { a: 1 },
                expected: { a: 2 },
                operator: "deepEqual",
                showDiff: true
            });
            assert.deepEqual(error.actual, { a: 1 });
            assert.deepEqual(error.expected, { a: 2 });
            assert.equal(error.operator, "deepEqual");
            assert.equal(error.showDiff, true);
        });

        it("should handle properties with primitive values", () => {
            let error = new AssertionFailure("Test", {
                actual: 42,
                expected: "42",
                operator: "strictEqual",
                showDiff: true
            });
            assert.equal(error.actual, 42);
            assert.equal(error.expected, "42");
            assert.equal(error.operator, "strictEqual");
            assert.equal(error.showDiff, true);
        });

        it("should handle properties with complex objects", () => {
            let actualObj = { nested: { value: [1, 2, 3] } };
            let expectedObj = { nested: { value: [1, 2, 4] } };
            let error = new AssertionFailure("Test", {
                actual: actualObj,
                expected: expectedObj,
                operator: "deepStrictEqual",
                showDiff: true
            });
            assert.deepEqual(error.actual, actualObj);
            assert.deepEqual(error.expected, expectedObj);
            assert.equal(error.operator, "deepStrictEqual");
            assert.equal(error.showDiff, true);
        });
    });
});

describe("AssertionFatal", () => {
    it("should create an AssertionFatal with a message", () => {
        let error = new AssertionFatal("Fatal error message");
        
        assert.equal(error.message, "Fatal error message");
        assert.equal(error.name, "AssertionFatal");
        assert.ok(error instanceof Error);
        assert.ok(error instanceof AssertionError);
        assert.ok(error instanceof AssertionFatal);
    });

    it("should create an AssertionFatal with message and innerException", () => {
        let cause = new Error("Original error");
        let error = new AssertionFatal("Fatal error", cause);
        
        assert.ok(error.message.startsWith("Fatal error"));
        assert.ok(error.message.includes("Caused by:"));
        assert.ok(error.message.includes("Original error"));
        assert.equal((error as any).innerException, cause);
    });

    it("should create an AssertionFatal with details", () => {
        let details = { reason: "critical failure", code: 500 };
        let error = new AssertionFatal("Fatal error", details);
        
        assert.equal(error.message, "Fatal error");
        assert.deepEqual(error.props, details);
    });

    it("should create an AssertionFatal with all parameters", () => {
        let cause = new Error("Cause");
        let details = { critical: true };
        function stackStart() {}
        
        let error = new AssertionFatal("Fatal error", cause, details, stackStart);
        
        assert.ok(error.message.startsWith("Fatal error"));
        assert.ok(error.message.includes("Caused by:"));
        assert.ok(error.message.includes("Cause"));
        assert.equal((error as any).innerException, cause);
        assert.deepEqual(error.props, details);
    });

    it("should be throwable", () => {
        checkError(() => {
            throw new AssertionFatal("Thrown fatal");
        }, "Thrown fatal");
    });

    it("should work with instanceof checks", () => {
        let error = new AssertionFatal("Test");
        assert.ok(error instanceof Error);
        assert.ok(error instanceof AssertionError);
        assert.ok(error instanceof AssertionFatal);
        assert.ok(error instanceof AssertionFailure);
    });

    it("should have unique name from AssertionFailure", () => {
        let failure = new AssertionFailure("failure");
        let fatal = new AssertionFatal("fatal");
        
        assert.equal(failure.name, "AssertionFailure");
        assert.equal(fatal.name, "AssertionFatal");
        assert.notEqual(failure.name, fatal.name);
    });

    it("should handle array of stack start functions", () => {
        function fn1() {}
        function fn2() {}
        let error = new AssertionFatal("Test", null, {}, [fn1, fn2]);
        
        assert.equal(error.message, "Test");
        assert.ok(error.stack);
    });
});

describe("Error inheritance", () => {
    it("AssertionFailure should extend AssertionError", () => {
        let failure = new AssertionFailure("test");
        assert.ok(failure instanceof AssertionError);
        assert.ok(failure instanceof Error);
    });

    it("AssertionFatal should extend AssertionFailure and AssertionError", () => {
        let fatal = new AssertionFatal("test");
        assert.ok(fatal instanceof AssertionFailure);
        assert.ok(fatal instanceof AssertionError);
        assert.ok(fatal instanceof Error);
    });

    it("should be distinguishable by type", () => {
        let error = new AssertionError("error");
        let failure = new AssertionFailure("failure");
        let fatal = new AssertionFatal("fatal");

        assert.ok(error instanceof AssertionError);
        assert.ok(!(error instanceof AssertionFailure));
        assert.ok(!(error instanceof AssertionFatal));

        assert.ok(failure instanceof AssertionError);
        assert.ok(failure instanceof AssertionFailure);
        assert.ok(!(failure instanceof AssertionFatal));

        assert.ok(fatal instanceof AssertionError);
        assert.ok(fatal instanceof AssertionFailure);
        assert.ok(fatal instanceof AssertionFatal);
    });
});

describe("Error with expect", () => {
    it("expect should throw AssertionFailure", () => {
        try {
            expect(1).to.be.equal(2);
            assert.fail("Should have thrown");
        } catch (e: any) {
            assert.ok(e instanceof AssertionFailure);
            assert.ok(e instanceof AssertionError);
        }
    });

    it("assert should throw AssertionFailure", () => {
        try {
            assert.equal(1, 2);
            assert.fail("Should have thrown");
        } catch (e: any) {
            assert.ok(e instanceof AssertionFailure);
            assert.ok(e instanceof AssertionError);
        }
    });
});
