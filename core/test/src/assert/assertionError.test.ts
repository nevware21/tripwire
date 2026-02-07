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

describe("Property mutation and orgValues tracking", () => {
    describe("actual property", () => {
        it("should allow setting actual property without throwing", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });
            assert.equal(error.actual, 5);

            // This should not throw
            assert.doesNotThrow(() => {
                error.actual = 7;
            });

            assert.equal(error.actual, 7);
        });

        it("should set orgValues when actual is changed to different value", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });
            assert.equal(error.actual, 5);
            assert.equal(error.orgValues, undefined);

            error.actual = 7;

            assert.equal(error.actual, 7);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.actual, 5);
        });

        it("should not set orgValues when actual is set to same value", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });
            assert.equal(error.actual, 5);

            error.actual = 5;

            assert.equal(error.actual, 5);
            assert.equal(error.orgValues, undefined);
        });

        it("should preserve original value in orgValues after multiple changes", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });

            error.actual = 7;
            error.actual = 9;

            assert.equal(error.actual, 9);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.actual, 5, "orgValues should contain the original value");
        });

        it("should handle setting actual to null", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });

            error.actual = null;

            assert.equal(error.actual, null);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.actual, 5);
        });

        it("should handle setting actual to undefined", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });

            error.actual = undefined;

            assert.equal(error.actual, undefined);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.actual, 5);
        });

        it("should handle complex object values", () => {
            let obj1 = { a: 1, b: 2 };
            let obj2 = { a: 3, b: 4 };
            let error = new AssertionFailure("Test", { actual: obj1, expected: 10 });

            error.actual = obj2;

            assert.deepEqual(error.actual, obj2);
            assert.ok(error.orgValues);
            assert.deepEqual(error.orgValues.actual, obj1);
        });
    });

    describe("expected property", () => {
        it("should allow setting expected property without throwing", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });
            assert.equal(error.expected, 10);

            assert.doesNotThrow(() => {
                error.expected = 20;
            });

            assert.equal(error.expected, 20);
        });

        it("should set orgValues when expected is changed to different value", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });
            assert.equal(error.expected, 10);
            assert.equal(error.orgValues, undefined);

            error.expected = 20;

            assert.equal(error.expected, 20);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.expected, 10);
        });

        it("should not set orgValues when expected is set to same value", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });

            error.expected = 10;

            assert.equal(error.expected, 10);
            assert.equal(error.orgValues, undefined);
        });

        it("should preserve original value in orgValues after multiple changes", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });

            error.expected = 20;
            error.expected = 30;

            assert.equal(error.expected, 30);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.expected, 10);
        });
    });

    describe("operator property", () => {
        it("should allow setting operator property without throwing", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10, operator: "equal" });
            assert.equal(error.operator, "equal");

            assert.doesNotThrow(() => {
                error.operator = "strictEqual";
            });

            assert.equal(error.operator, "strictEqual");
        });

        it("should set orgValues when operator is changed to different value", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10, operator: "equal" });
            assert.equal(error.operator, "equal");
            assert.equal(error.orgValues, undefined);

            error.operator = "strictEqual";

            assert.equal(error.operator, "strictEqual");
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.operator, "equal");
        });

        it("should not set orgValues when operator is set to same value", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10, operator: "equal" });

            error.operator = "equal";

            assert.equal(error.operator, "equal");
            assert.equal(error.orgValues, undefined);
        });

        it("should use operation as alternative property name", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10, operation: "add" });
            assert.equal(error.operator, "add");

            error.operator = "subtract";

            assert.equal(error.operator, "subtract");
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.operator, "add");
        });
    });

    describe("showDiff property", () => {
        it("should allow setting showDiff property without throwing", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10, showDiff: true });
            assert.equal(error.showDiff, true);

            assert.doesNotThrow(() => {
                error.showDiff = false;
            });

            assert.equal(error.showDiff, false);
        });

        it("should set orgValues when showDiff is changed to different value", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10, showDiff: true });
            assert.equal(error.showDiff, true);
            assert.equal(error.orgValues, undefined);

            error.showDiff = false;

            assert.equal(error.showDiff, false);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.showDiff, true);
        });

        it("should not set orgValues when showDiff is set to same value", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10, showDiff: true });

            error.showDiff = true;

            assert.equal(error.showDiff, true);
            assert.equal(error.orgValues, undefined);
        });
    });

    describe("message property", () => {
        it("should allow reading message property", () => {
            let error = new AssertionFailure("Test message", { actual: 5, expected: 10 });
            assert.ok(error.message.includes("Test message"));
        });

        it("should allow setting message property without throwing", () => {
            let error = new AssertionFailure("Original message", { actual: 5, expected: 10 });

            assert.doesNotThrow(() => {
                error.message = "Modified message";
            });

            assert.equal(error.message, "Modified message");
        });
    });

    describe("multiple properties changed", () => {
        it("should track orgValues for each changed property independently", () => {
            let error = new AssertionFailure("Test", {
                actual: 5,
                expected: 10,
                operator: "equal",
                showDiff: true
            });

            error.actual = 7;
            error.expected = 15;

            assert.equal(error.actual, 7);
            assert.equal(error.expected, 15);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.actual, 5);
            assert.equal(error.orgValues.expected, 10);
            // operator and showDiff should not be in orgValues since they weren't changed
            assert.equal(error.orgValues.operator, undefined);
            assert.equal(error.orgValues.showDiff, undefined);
        });

        it("should handle changing all properties", () => {
            let error = new AssertionFailure("Test", {
                actual: 5,
                expected: 10,
                operator: "equal",
                showDiff: true
            });

            error.actual = 7;
            error.expected = 15;
            error.operator = "strictEqual";
            error.showDiff = false;

            assert.equal(error.actual, 7);
            assert.equal(error.expected, 15);
            assert.equal(error.operator, "strictEqual");
            assert.equal(error.showDiff, false);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.actual, 5);
            assert.equal(error.orgValues.expected, 10);
            assert.equal(error.orgValues.operator, "equal");
            assert.equal(error.orgValues.showDiff, true);
        });
    });

    describe("orgValues property protection", () => {
        it("orgValues property itself should be readonly", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });

            error.actual = 7;

            assert.ok(error.orgValues);
            let originalOrgValues = error.orgValues;

            // Attempt to replace orgValues should be ignored
            (error as any).orgValues = { actual: 999 };

            // orgValues should remain unchanged
            assert.equal(error.orgValues, originalOrgValues);
            assert.equal(error.orgValues.actual, 5);
        });

        it("orgValues properties should be readonly", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });

            error.actual = 7;

            assert.ok(error.orgValues);
            assert.equal(error.orgValues.actual, 5);

            // Attempt to modify orgValues.actual should be ignored
            (error.orgValues as any).actual = 999;

            // orgValues.actual should remain unchanged
            assert.equal(error.orgValues.actual, 5);
        });
    });

    describe("error types with property mutation", () => {
        it("should work with AssertionError", () => {
            let error = new AssertionError("Test", { actual: 5, expected: 10 });

            error.actual = 7;

            assert.equal(error.actual, 7);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.actual, 5);
        });

        it("should work with AssertionFailure", () => {
            let error = new AssertionFailure("Test", { actual: 5, expected: 10 });

            error.expected = 15;

            assert.equal(error.expected, 15);
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.expected, 10);
        });

        it("should work with AssertionFatal", () => {
            let error = new AssertionFatal("Test", { actual: 5, expected: 10, operator: "equal" });

            error.operator = "strictEqual";

            assert.equal(error.operator, "strictEqual");
            assert.ok(error.orgValues);
            assert.equal(error.orgValues.operator, "equal");
        });
    });

    describe("edge cases", () => {
        it("should handle properties not in props object", () => {
            let error = new AssertionFailure("Test", { someOtherProp: "value" });

            // These properties are undefined since they're not in props
            assert.equal(error.actual, undefined);
            assert.equal(error.expected, undefined);

            // Setting them should not create orgValues since there was no original value
            error.actual = 5;
            error.expected = 10;

            // The properties should be set but orgValues should remain undefined
            // because the original values were undefined and we only track when
            // original values exist in props
            assert.equal(error.actual, 5);
            assert.equal(error.expected, 10);
            assert.equal(error.orgValues, undefined);
        });

        it("should handle NaN comparison", () => {
            let error = new AssertionFailure("Test", { actual: NaN, expected: 10 });

            // Setting to NaN again should not create orgValues because NaN === NaN is false
            // but objIs(NaN, NaN) is true
            error.actual = NaN;

            // Since NaN is the same value (via Object.is), orgValues should not be set
            assert.equal(error.orgValues, undefined);
        });

        it("should handle +0 and -0", () => {
            let error = new AssertionFailure("Test", { actual: +0, expected: 10 });

            // Setting to -0 should create orgValues because objIs(+0, -0) is false
            error.actual = -0;

            assert.ok(error.orgValues);
            assert.equal(error.orgValues.actual, +0);
        });
    });
});
