/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";

describe("assert.equal", function () {
    it("examples", function () {
        assert.equal(1, 1);
        assert.equal(1, "1"); // Passes
        assert.equal("a", "a"); // Passes

        checkError(function () {
            assert.equal(1, 2); // Throws AssertionError
        }, "expected 1 to equal 2");
        
        checkError(function () {
            assert.equal("a", "b"); // Throws AssertionError
        }, "expected \"a\" to equal \"b\"");


        checkError(function () {
            assert.equal([1, 2], [1, 2]); // Arrays are always not equal
        }, "expected [1,2] to equal [1,2]");

        checkError(function () {
            assert.equal({ a: 1 }, { a: 1 }); // Different Objects are always not equal
        }, "expected {a:1} to equal {a:1}");

        checkError(function () {
            assert.equal({ a: { b: 1 } }, { a: { b: 1} }, "Objects are not equal"); // Throws AssertionError
        }, "Objects are not equal: expected {a:{b:1}} to equal {a:{b:1}}");

        checkError(function () {
            assert.equal({ a: 1 }, { a: 2 }); // Throws AssertionError
        }, "expected {a:1} to equal {a:2}");

        checkError(function () {
            assert.equal({ a: 1 }, { a: 2 }, "Objects are not equal"); // Throws AssertionError
        }, "Objects are not equal: expected {a:1} to equal {a:2}");

        checkError(function () {
            assert.equal({ a: 1 }, { b: 1 }); // Throws AssertionError
        }, "expected {a:1} to equal {b:1}");

        checkError(function () {
            assert.equal({ a: 1 }, { b: 1 }, "Objects are not equal"); // Throws AssertionError
        }, "Objects are not equal: expected {a:1} to equal {b:1}");

        checkError(function () {
            assert.equal({ a: 1 }, { b: 2 }); // Throws AssertionError
        }, "expected {a:1} to equal {b:2}");

        checkError(function () {
            assert.equal({ a: 1 }, { b: 2 }, "Objects are not equal"); // Throws AssertionError
        }, "Objects are not equal: expected {a:1} to equal {b:2}");

        checkError(function () {
            assert.equal(1, 2, "Hello");
        }, "Hello: expected 1 to equal 2");
    });

    it("Numeric match", function () {
        assert.equal(1, 1);
        assert.equal(1, "1");
        assert.equal(1, 1.0);

        checkError(function () {
            assert.equal(1, 2, "Hello");
        }, "Hello: expected 1 to equal 2");
    });

    it("Strings match", function () {
        assert.equal("test", "test");
        assert.equal("1", 1);
        assert.equal("1.0", 1);

        checkError(function () {
            assert.equal("test", "Test", "String mismatch");
        }, "String mismatch: expected \"test\" to equal \"Test\"");
    });

    it("Objects match", function () {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1, b: 2 };
        const obj3 = { a: 1, b: 2, c: 3 };

        assert.equal(obj1, obj1); // Same reference

        checkError(function () {
            assert.equal(obj1, obj2, "Object mismatch"); // Same looking object but are not the same
        }, "Object mismatch: expected {a:1,b:2} to equal {a:1,b:2}");

        checkError(function () {
            assert.equal(obj1, obj3, "Object mismatch");
        }, "Object mismatch: expected {a:1,b:2} to equal {a:1,b:2,c:3}");
    });

    it("Arrays", function () {
        const arr1 = [1, 2, 3];
        const arr2 = [1, 2, 3];
        const arr3 = [1, 2];

        assert.equal(arr1, arr1); // Same reference

        checkError(function () {
            assert.equal(arr1, arr2, "Array mismatch"); // Same content still don't match (loose equality)
        }, "Array mismatch: expected [1,2,3] to equal [1,2,3]");

        checkError(function () {
            assert.equal(arr1, arr3, "Array mismatch");
        }, "Array mismatch: expected [1,2,3] to equal [1,2]");
    });

    it("null and undefined", function () {
        assert.equal(null, null);
        assert.equal(undefined, undefined);
        assert.equal(null, undefined, "Null and undefined match");
        assert.equal(undefined, null, "undefined and Null match");
    });

    it("Different data types", function () {
        assert.equal(1, "1", "Type mismatch");
        assert.equal(true, 1, "Boolean and number mismatch");
        assert.equal(false, 0, "Boolean and number mismatch");
        assert.equal(0, false, "Boolean and number mismatch");
        checkError(function () {
            assert.equal(0, null, "Boolean and null mismatch");
        }, "Boolean and null mismatch: expected 0 to equal null");

        assert.equal("", false, "Boolean and string mismatch");
        
        checkError(function () {
            assert.equal("", null, "String and null mismatch");
        }, "String and null mismatch: expected \"\" to equal null");
        
        assert.equal("", 0, "String and number mismatch");
        
        checkError(function () {
            assert.equal("", undefined, "String and undefined mismatch");
        }, "String and undefined mismatch: expected \"\" to equal undefined");

        checkError(function () {
            assert.equal(0, undefined, "Number and undefined mismatch");
        }, "Number and undefined mismatch: expected 0 to equal undefined");

        assert.equal(true, "1", "Boolean and string 1 mismatch");
        assert.equal(false, "0", "Boolean and string 0 mismatch");

        checkError(function () {
            assert.equal(true, "true", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected true to equal \"true\"");

        checkError(function () {
            assert.equal(false, "false", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected false to equal \"false\"");

        checkError(function () {
            assert.equal(null, "null", "Null and string mismatch");
        }, "Null and string mismatch: expected null to equal \"null\"");

        checkError(function () {
            assert.equal(undefined, "undefined", "Undefined and string mismatch");
        }, "Undefined and string mismatch: expected undefined to equal \"undefined\"");

        assert.equal(0, "0", "Number and string mismatch");
        assert.equal(1, true, "Number and boolean mismatch");
        assert.equal(0, false, "Number and boolean mismatch");
    });

    it("Date", function () {
        const date1 = new Date(Date.UTC(2021, 1, 1, 0, 0, 0));
        const date2 = new Date(Date.UTC(2021, 1, 1, 0, 0, 0));
        const date3 = new Date(Date.UTC(2021, 1, 2, 0, 0, 0));

        assert.equal(date1, date1); // Same reference
        
        checkError(function () {
            assert.equal(date1, date2); // Same date but different reference (loose equality)
        }, "expected [Date:\"2021-02-01T00:00:00.000Z\"] to equal [Date:\"2021-02-01T00:00:00.000Z\"]");

        checkError(function () {
            assert.equal(date1, date3, "Date mismatch");
        }, "expected [Date:\"2021-02-01T00:00:00.000Z\"] to equal [Date:\"2021-02-02T00:00:00.000Z\"]");
    });

    it("deepEqual (Date)", function() {
        let a = new Date(1, 2, 3);
        let b = new Date(4, 5, 6);
        assert.deepEqual(a, a);
        assert.notDeepEqual(a, b);
        assert.notDeepEqual(a, {} as any);
    });

    it("RegExp", function () {
        const reg1 = /test/;
        const reg2 = /test/;
        const reg3 = /test/i;

        assert.equal(reg1, reg1); // Same reference

        checkError(function () {
            assert.equal(reg1, reg2); // Same RegExp (loose equality)
        }, "expected /test/ to equal /test/");

        checkError(function () {
            assert.equal(reg1, reg3);
        }, "expected /test/ to equal /test/i");
    });

    it("deepEqual (RegExp)", function() {
        let a = /test/;
        let b = /test/;
        let c = /test/i;
        assert.deepEqual(a, b);
        assert.notDeepEqual(a, c);
        assert.notDeepEqual(a, {} as any);
    });
});

describe("assert.equals", function () {

    it("examples", function () {
        assert.equals(1, 1);
        assert.equals(1, "1"); // Passes
        assert.equals("a", "a"); // Passes

        checkError(function () {
            assert.equals(1, 2); // Throws AssertionError
        }, "expected 1 to equal 2");
        
        checkError(function () {
            assert.equals("a", "b"); // Throws AssertionError
        }, "expected \"a\" to equal \"b\"");

        checkError(function () {
            assert.equals([1, 2], [1, 2]); // Arrays are always not equals (simple loose equality)
        }, "expected [1,2] to equal [1,2]");

        checkError(function () {
            assert.equals({ a: 1 }, { a: 1 }); // Different Objects are always not equals
        }, "expected {a:1} to equal {a:1}");

        checkError(function () {
            assert.equals({ a: { b: 1 } }, { a: { b: 1} }, "Objects are not equals"); // Throws AssertionError
        }, "Objects are not equals: expected {a:{b:1}} to equal {a:{b:1}}");

        checkError(function () {
            assert.equals({ a: 1 }, { a: 2 }); // Throws AssertionError
        }, "expected {a:1} to equal {a:2}");

        checkError(function () {
            assert.equals({ a: 1 }, { a: 2 }, "Objects are not equals"); // Throws AssertionError
        }, "Objects are not equals: expected {a:1} to equal {a:2}");

        checkError(function () {
            assert.equals({ a: 1 }, { b: 1 }); // Throws AssertionError
        }, "expected {a:1} to equal {b:1}");

        checkError(function () {
            assert.equals({ a: 1 }, { b: 1 }, "Objects are not equals"); // Throws AssertionError
        }, "Objects are not equals: expected {a:1} to equal {b:1}");

        checkError(function () {
            assert.equals({ a: 1 }, { b: 2 }); // Throws AssertionError
        }, "expected {a:1} to equal {b:2}");

        checkError(function () {
            assert.equals({ a: 1 }, { b: 2 }, "Objects are not equals"); // Throws AssertionError
        }, "Objects are not equals: expected {a:1} to equal {b:2}");

        checkError(function () {
            assert.equals(1, 2, "Hello");
        }, "Hello: expected 1 to equal 2");
    });

    it("Numeric match", function () {
        assert.equals(1, 1);
        assert.equals(1, "1");
        assert.equals(1, 1.0);

        checkError(function () {
            assert.equals(1, 2, "Hello");
        }, "Hello: expected 1 to equal 2");
    });

    it("Strings match", function () {
        assert.equals("test", "test");
        assert.equals("1", 1);
        assert.equals("1.0", 1);

        checkError(function () {
            assert.equals("test", "Test", "String mismatch");
        }, "String mismatch: expected \"test\" to equal \"Test\"");
    });

    it("Objects match", function () {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1, b: 2 };
        const obj3 = { a: 1, b: 2, c: 3 };

        assert.equals(obj1, obj1); // Same reference

        checkError(function () {
            assert.equals(obj1, obj2, "Object mismatch"); // Same looking object
        }, "Object mismatch: expected {a:1,b:2} to equal {a:1,b:2}");

        checkError(function () {
            assert.equals(obj1, obj3, "Object mismatch");
        }, "Object mismatch: expected {a:1,b:2} to equal {a:1,b:2,c:3}");
    });

    it("Arrays", function () {
        const arr1 = [1, 2, 3];
        const arr2 = [1, 2, 3];
        const arr3 = [1, 2];

        assert.equals(arr1, arr1); // Same reference

        checkError(function () {
            assert.equals(arr1, arr2, "Array mismatch"); // Same content still don't match
        }, "Array mismatch: expected [1,2,3] to equal [1,2,3]");

        checkError(function () {
            assert.equals(arr1, arr3, "Array mismatch");
        }, "Array mismatch: expected [1,2,3] to equal [1,2]");
    });

    it("object with matching arrays", function () {
        const obj1 = { a: [1, 2, 3] };
        const obj2 = { a: [1, 2, 3] };
        const obj3 = { a: [1, 2] };

        assert.equals(obj1, obj1); // Same reference

        checkError(function () {
            assert.equals(obj1, obj2, "Object mismatch"); // Same content
        }, "Object mismatch: expected {a:[1,2,3]} to equal {a:[1,2,3]}");

        checkError(function () {
            assert.equals(obj1, obj3, "Object mismatch");
        }, "Object mismatch: expected {a:[1,2,3]} to equal {a:[1,2]}");
    });

    it("null and undefined", function () {
        assert.equals(null, null);
        assert.equals(undefined, undefined);
        assert.equals(null, undefined, "Null and undefined match");
        assert.equals(undefined, null, "undefined and Null match");
    });

    it("Different data types", function () {
        assert.equals(1, "1", "Type mismatch");
        assert.equals(true, 1, "Boolean and number mismatch");
        assert.equals(false, 0, "Boolean and number mismatch");
        assert.equals(0, false, "Boolean and number mismatch");
        checkError(function () {
            assert.equals(0, null, "Boolean and null mismatch");
        }, "Boolean and null mismatch: expected 0 to equal null");

        assert.equals("", false, "Boolean and string mismatch");
        
        checkError(function () {
            assert.equals("", null, "String and null mismatch");
        }, "String and null mismatch: expected \"\" to equal null");
        
        assert.equals("", 0, "String and number mismatch");
        
        checkError(function () {
            assert.equals("", undefined, "String and undefined mismatch");
        }, "String and undefined mismatch: expected \"\" to equal undefined");

        checkError(function () {
            assert.equals(0, undefined, "Number and undefined mismatch");
        }, "Number and undefined mismatch: expected 0 to equal undefined");

        assert.equals(true, "1", "Boolean and string 1 mismatch");
        assert.equals(false, "0", "Boolean and string 0 mismatch");

        checkError(function () {
            assert.equals(true, "true", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected true to equal \"true\"");

        checkError(function () {
            assert.equals(false, "false", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected false to equal \"false\"");

        checkError(function () {
            assert.equals(null, "null", "Null and string mismatch");
        }, "Null and string mismatch: expected null to equal \"null\"");

        checkError(function () {
            assert.equals(undefined, "undefined", "Undefined and string mismatch");
        }, "Undefined and string mismatch: expected undefined to equal \"undefined\"");

        assert.equals(0, "0", "Number and string mismatch");
        assert.equals(1, true, "Number and boolean mismatch");
        assert.equals(0, false, "Number and boolean mismatch");
    });

    it("should not equal when valueEntries are the same", function () {
        const value = new Map([["key1", "value1"], ["key2", "value2"]]);
        const expected = new Map([["key1", "value1"], ["key2", "value2"]]);

        checkError(function () {
            assert.equals(value, expected);
        }, "expected [Map:{}] to equal [Map:{}]");

        assert.deepEqual(value, expected);
    });

    it("should not deeply equal when valueEntries are different", function () {
        const value = new Map([["key1", "value1"], ["key2", "value2"]]);
        const expected = new Map([["key1", "value1"], ["key2", "differentValue"]]);

        checkError(function () {
            assert.equals(value, expected);
        }, "expected [Map:{}] to equal [Map:{}]");
    });

    it("should deeply equal when valueEntries are empty", function () {
        const value = new Map();
        const expected = new Map();

        checkError(function () {
            assert.equals(value, expected);
        }, "expected [Map:{}] to equal [Map:{}]");

        assert.deepEqual(value, expected);
    });

    it("should not deeply equal when valueEntries have different sizes", function () {
        const value = new Map([["key1", "value1"]]);
        const expected = new Map([["key1", "value1"], ["key2", "value2"]]);

        checkError(function () {
            assert.equals(value, expected);
        }, "expected [Map:{}] to equal [Map:{}]");
    });
});

describe("assert.strictEqual", function () {

    it("Don't match", function () {
        assert.strictEqual(1, 1);

        checkError(function () {
            assert.strictEqual(1, 2, "Hello");
        }, "Hello: expected 1 to strictly equal 2");
    });

    it("Strings match", function () {
        assert.strictEqual("test", "test");

        checkError(function () {
            assert.strictEqual("test", "Test", "String mismatch");
        }, "String mismatch: expected \"test\" to strictly equal \"Test\"");
    });

    it("Objects match", function () {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1, b: 2 };
        const obj3 = { a: 1, b: 2, c: 3 };

        assert.strictEqual(obj1, obj1); // Same reference
        checkError(function () {
            assert.strictEqual(obj1, obj2, "Object mismatch"); // Same looking object
        }, "Object mismatch: expected {a:1,b:2} to strictly equal {a:1,b:2}");

        checkError(function () {
            assert.strictEqual(obj1, obj3, "Object mismatch");
        }, "Object mismatch: expected {a:1,b:2} to strictly equal {a:1,b:2,c:3}");
    });

    it("Arrays match", function () {
        const arr1 = [1, 2, 3];
        const arr2 = [1, 2, 3];
        const arr3 = [1, 2];
        assert.strictEqual(arr1, arr1); // Same reference

        checkError(function () {
            assert.strictEqual(arr1, arr2, "Array mismatch"); // Same content
        }, "Array mismatch: expected [1,2,3] to strictly equal [1,2,3]");

        checkError(function () {
            assert.strictEqual(arr1, arr3, "Array mismatch");
        }, "Array mismatch: expected [1,2,3] to strictly equal [1,2]");
    });

    it("null and undefined", function () {
        assert.strictEqual(null, null);
        assert.strictEqual(undefined, undefined);
        checkError(function () {
            assert.strictEqual(null, undefined, "Null and undefined match");
        }, "Null and undefined match: expected null to strictly equal undefined");

        checkError(function () {
            assert.strictEqual(undefined, null, "undefined and Null match");
        }, "undefined and Null match: expected undefined to strictly equal null");
    });

    it("Different data types", function () {
        checkError(function () {
            assert.strictEqual(1, "1", "Type mismatch");
        }, "Type mismatch: expected 1 to strictly equal \"1\"");

        checkError(function () {
            assert.strictEqual(true, 1, "Boolean and number mismatch");
        }, "Boolean and number mismatch: expected true to strictly equal 1");

        checkError(function () {
            assert.strictEqual(false, 0, "Boolean and number mismatch");
        }, "Boolean and number mismatch: expected false to strictly equal 0");
    });

    it("RegExp", function () {
        const reg1 = /test/;
        const reg2 = /test/;
        const reg3 = /test/i;

        assert.strictEqual(reg1, reg1); // Same reference
        checkError(function () {
            assert.strictEqual(reg1, reg2); // Same RegExp
        }, "expected /test/ to strictly equal /test/");

        checkError(function () {
            assert.strictEqual(reg1, reg3);
        }, "expected /test/ to strictly equal /test/i");
    });
});

describe("assert.strictEquals", function () {

    it("Don't match", function () {
        assert.strictEquals(1, 1);

        checkError(function () {
            assert.strictEquals(1, 2, "Hello");
        }, "Hello: expected 1 to strictly equal 2");
    });

    it("Strings match", function () {
        assert.strictEquals("test", "test");

        checkError(function () {
            assert.strictEquals("test", "Test", "String mismatch");
        }, "String mismatch: expected \"test\" to strictly equal \"Test\"");
    });

    it("Objects match", function () {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1, b: 2 };
        const obj3 = { a: 1, b: 2, c: 3 };

        assert.strictEquals(obj1, obj1); // Same reference
        checkError(function () {
            assert.strictEquals(obj1, obj2, "Object mismatch"); // Same looking object
        }, "Object mismatch: expected {a:1,b:2} to strictly equal {a:1,b:2}");

        checkError(function () {
            assert.strictEquals(obj1, obj3, "Object mismatch");
        }, "Object mismatch: expected {a:1,b:2} to strictly equal {a:1,b:2,c:3}");
    });

    it("Arrays match", function () {
        const arr1 = [1, 2, 3];
        const arr2 = [1, 2, 3];
        const arr3 = [1, 2];
        assert.strictEquals(arr1, arr1); // Same reference

        checkError(function () {
            assert.strictEquals(arr1, arr2, "Array mismatch"); // Same content
        }, "Array mismatch: expected [1,2,3] to strictly equal [1,2,3]");

        checkError(function () {
            assert.strictEquals(arr1, arr3, "Array mismatch");
        }, "Array mismatch: expected [1,2,3] to strictly equal [1,2]");
    });

    it("null and undefined", function () {
        assert.strictEquals(null, null);
        assert.strictEquals(undefined, undefined);
        checkError(function () {
            assert.strictEquals(null, undefined, "Null and undefined match");
        }, "Null and undefined match: expected null to strictly equal undefined");

        checkError(function () {
            assert.strictEquals(undefined, null, "undefined and Null match");
        }, "undefined and Null match: expected undefined to strictly equal null");
    });

    it("Different data types", function () {
        checkError(function () {
            assert.strictEquals(1, "1", "Type mismatch");
        }, "Type mismatch: expected 1 to strictly equal \"1\"");

        checkError(function () {
            assert.strictEquals(true, 1, "Boolean and number mismatch");
        }, "Boolean and number mismatch: expected true to strictly equal 1");

        checkError(function () {
            assert.strictEquals(false, 0, "Boolean and number mismatch");
        }, "Boolean and number mismatch: expected false to strictly equal 0");
    });
});

describe("assert.deepEqual", function () {

    it("simple types match with coersion", function () {
        assert.deepEqual(1, 1);
        assert.deepEqual(1, "1");

        checkError(function () {
            assert.deepEqual(1, 2, "Hello");
        }, "Hello: expected 1 to deeply equal 2");
    });

    it("Arrays and objects match", function () {
        assert.deepEqual([1, 2], [1, 2]); // Arrays with same loosly comparable members are equal
        assert.deepEqual({ a: 1 }, { a: 1 }); // Different Objects that match are equal
        assert.deepEqual({ a: { b: 1 } }, { a: { b: 1} }, "Objects are not equal"); // Different objects which looks the same match
    });

    it("Nested objects match", function () {
        const obj1 = { a: 1, b: { c: 2, d: 3 } };
        const obj2 = { a: 1, b: { c: 2, d: 3 } };
        assert.deepEqual(obj1, obj2);

        checkError(function () {
            const obj3 = { a: 1, b: { c: 2, d: 4 } };
            assert.deepEqual(obj1, obj3, "Nested object mismatch");
        }, "Nested object mismatch: expected {a:1,b:{c:2,d:3}} to deeply equal {a:1,b:{c:2,d:4}}");
    });

    it("Nested arrays match", function () {
        const arr1 = [1, [2, 3], 4];
        const arr2 = [1, [2, 3], 4];
        assert.deepEqual(arr1, arr2);

        checkError(function () {
            const arr3 = [1, [2, 4], 4];
            assert.deepEqual(arr1, arr3, "Nested array mismatch");
        }, "Nested array mismatch: expected [1,[2,3],4] to deeply equal [1,[2,4],4]");
    });

    it("Combination of objects and arrays match", function () {
        const combo1 = { a: [1, 2, { b: 3 }] };
        const combo2 = { a: [1, 2, { b: 3 }] };
        assert.deepEqual(combo1, combo2);

        checkError(function () {
            const combo3 = { a: [1, 2, { b: 4 }] };
            assert.deepEqual(combo1, combo3, "Combination mismatch");
        }, "Combination mismatch: expected {a:[1,2,{b:3}]} to deeply equal {a:[1,2,{b:4}]}");
    });

    it("Different data types", function () {
        assert.deepEqual(1, "1", "Type mismatch");
        assert.deepEqual(true, 1, "Boolean and number mismatch");
        assert.deepEqual(false, 0, "Boolean and number mismatch");
        assert.deepEqual(0, false, "Boolean and number mismatch");
        checkError(function () {
            assert.deepEqual(0, null, "Boolean and null mismatch");
        }, "Boolean and null mismatch: expected 0 to deeply equal null");

        assert.deepEqual("", false, "Boolean and string mismatch");
        
        checkError(function () {
            assert.deepEqual("", null, "String and null mismatch");
        }, "String and null mismatch: expected \"\" to deeply equal null");
        
        assert.deepEqual("", 0, "String and number mismatch");
        
        checkError(function () {
            assert.deepEqual("", undefined, "String and undefined mismatch");
        }, "String and undefined mismatch: expected \"\" to deeply equal undefined");

        checkError(function () {
            assert.deepEqual(0, undefined, "Number and undefined mismatch");
        }, "Number and undefined mismatch: expected 0 to deeply equal undefined");

        assert.deepEqual(true, "1", "Boolean and string 1 mismatch");
        assert.deepEqual(false, "0", "Boolean and string 0 mismatch");

        checkError(function () {
            assert.deepEqual(true, "true", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected true to deeply equal \"true\"");

        checkError(function () {
            assert.deepEqual(false, "false", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected false to deeply equal \"false\"");

        checkError(function () {
            assert.deepEqual(null, "null", "Null and string mismatch");
        }, "Null and string mismatch: expected null to deeply equal \"null\"");

        checkError(function () {
            assert.deepEqual(undefined, "undefined", "Undefined and string mismatch");
        }, "Undefined and string mismatch: expected undefined to deeply equal \"undefined\"");

        assert.deepEqual(0, "0", "Number and string mismatch");
        assert.deepEqual(1, true, "Number and boolean mismatch");
        assert.deepEqual(0, false, "Number and boolean mismatch");
    });

    it("circular references", function () {
        const obj1: any = { a: 1 };
        obj1.b = obj1;

        const obj2: any = { a: 1 };
        obj2.b = obj2;

        assert.deepEqual(obj1, obj2);

        const obj3: any = { a: 1 };
        obj3.b = { a: 1, b: { a: 1 } };

        const obj4: any = { a: 1 };
        obj4.b = { a: 1, b: { a: 1 } };

        assert.deepEqual(obj3, obj4);

        const obj5: any = { a: 1 };
        obj5.b = { a: 1, b: { a: 2 } };

        checkError(function () {
            assert.deepEqual(obj3, obj5);
        }, "expected {a:1,b:{a:1,b:{a:1}}} to deeply equal {a:1,b:{a:1,b:{a:2}}}");
    });

    it("deepEqual (circular)", function() {
        var aObj = {} as any
            , bObj = {} as any;
        aObj.field = aObj;
        bObj.field = bObj;

        assert.deepEqual(aObj, bObj);

        checkError(function() {
            bObj.field2 = bObj;
            assert.deepEqual(aObj, bObj);
        }, "expected {field:{field:(c)}} to deeply equal {field:{field:(c),field2:(c)},field2:{field:(c),field2:(c)}}");
    });
});

describe("assert.deepEquals", function () {

    it("Nested objects match", function () {
        const obj1 = { a: 1, b: { c: 2, d: 3 } };
        const obj2 = { a: 1, b: { c: 2, d: 3 } };
        assert.deepEquals(obj1, obj2);

        checkError(function () {
            const obj3 = { a: 1, b: { c: 2, d: 4 } };
            assert.deepEquals(obj1, obj3, "Nested object mismatch");
        }, "Nested object mismatch: expected {a:1,b:{c:2,d:3}} to deeply equal {a:1,b:{c:2,d:4}}");
    });

    it("Nested arrays match", function () {
        const arr1 = [1, [2, 3], 4];
        const arr2 = [1, [2, 3], 4];
        assert.deepEquals(arr1, arr2);

        checkError(function () {
            const arr3 = [1, [2, 4], 4];
            assert.deepEquals(arr1, arr3, "Nested array mismatch");
        }, "Nested array mismatch: expected [1,[2,3],4] to deeply equal [1,[2,4],4]");
    });

    it("Combination of objects and arrays match", function () {
        const combo1 = { a: [1, 2, { b: 3 }] };
        const combo2 = { a: [1, 2, { b: 3 }] };
        assert.deepEquals(combo1, combo2);

        checkError(function () {
            const combo3 = { a: [1, 2, { b: 4 }] };
            assert.deepEquals(combo1, combo3, "Combination mismatch");
        }, "Combination mismatch: expected {a:[1,2,{b:3}]} to deeply equal {a:[1,2,{b:4}]}");
    });

    it("Different data types", function () {
        assert.deepEquals(1, "1", "Type mismatch");
        assert.deepEquals(true, 1, "Boolean and number mismatch");
        assert.deepEquals(false, 0, "Boolean and number mismatch");
        assert.deepEquals(0, false, "Boolean and number mismatch");
        checkError(function () {
            assert.deepEquals(0, null, "Boolean and null mismatch");
        }, "Boolean and null mismatch: expected 0 to deeply equal null");

        assert.deepEquals("", false, "Boolean and string mismatch");
        
        checkError(function () {
            assert.deepEquals("", null, "String and null mismatch");
        }, "String and null mismatch: expected \"\" to deeply equal null");
        
        assert.deepEquals("", 0, "String and number mismatch");
        
        checkError(function () {
            assert.deepEquals("", undefined, "String and undefined mismatch");
        }, "String and undefined mismatch: expected \"\" to deeply equal undefined");

        checkError(function () {
            assert.deepEquals(0, undefined, "Number and undefined mismatch");
        }, "Number and undefined mismatch: expected 0 to deeply equal undefined");

        assert.deepEquals(true, "1", "Boolean and string 1 mismatch");
        assert.deepEquals(false, "0", "Boolean and string 0 mismatch");

        checkError(function () {
            assert.deepEquals(true, "true", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected true to deeply equal \"true\"");

        checkError(function () {
            assert.deepEquals(false, "false", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected false to deeply equal \"false\"");

        checkError(function () {
            assert.deepEquals(null, "null", "Null and string mismatch");
        }, "Null and string mismatch: expected null to deeply equal \"null\"");

        checkError(function () {
            assert.deepEquals(undefined, "undefined", "Undefined and string mismatch");
        }, "Undefined and string mismatch: expected undefined to deeply equal \"undefined\"");

        assert.deepEquals(0, "0", "Number and string mismatch");
        assert.deepEquals(1, true, "Number and boolean mismatch");
        assert.deepEquals(0, false, "Number and boolean mismatch");
    });
});

describe("assert.deepStrictEqual", function () {

    it("numeric comparison", function () {
        assert.deepStrictEqual(1, 1);

        checkError(function () {
            assert.deepStrictEqual(1, "1");
        }, "expected 1 to deeply and strictly equal \"1\"");

        checkError(function () {
            assert.deepStrictEqual(1, 2, "Hello");
        }, "Hello: expected 1 to deeply and strictly equal 2");
    });

    it("Strings matching", function () {
        assert.deepStrictEqual("test", "test");

        checkError(function () {
            assert.deepStrictEqual("test", "Test", "String mismatch");
        }, "String mismatch: expected \"test\" to deeply and strictly equal \"Test\"");
    });

    it("Objects strictly match", function () {
        let child1 = { c: 2, d: 3 };
        let child2 = { c: 2, d: 3 };
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1, b: 2 };
        const obj3 = { a: 1, b: 2, c: 3 };
        const obj4 = { a: 1, b: child1 };
        const obj5 = { a: 1, b: child2 };
        const obj6 = { a: 1, b: child1 };

        assert.deepStrictEqual(obj1, obj1); // Same reference
        assert.deepStrictEqual(obj2, obj2); // Same reference
        assert.deepStrictEqual(obj3, obj3); // Same reference
        assert.deepStrictEqual(obj4, obj4); // Same reference
        assert.deepStrictEqual(obj5, obj5); // Same reference
        assert.deepStrictEqual(obj6, obj6); // Same reference
        checkError(function () {
            assert.deepStrictEqual(obj4, obj6);
        }, "expected {a:1,b:{c:2,d:3}} to deeply and strictly equal {a:1,b:{c:2,d:3}}");


        checkError(function () {
            assert.deepStrictEqual(obj1, obj2, "Object mismatch"); // Same looking object
        }, "Object mismatch: expected {a:1,b:2} to deeply and strictly equal {a:1,b:2}");


        checkError(function () {
            assert.deepStrictEqual(obj1, obj3, "Object mismatch");
        }, "Object mismatch: expected {a:1,b:2} to deeply and strictly equal {a:1,b:2,c:3}");

        checkError(function () {
            assert.deepStrictEquals(obj4, obj5);
        }, "expected {a:1,b:{c:2,d:3}} to deeply and strictly equal {a:1,b:{c:2,d:3}}");

        checkError(function () {
            const obj7 = { a: 1, b: { c: 2, d: 4 } };
            assert.deepStrictEquals(obj5, obj7, "Nested object mismatch");
        }, "Nested object mismatch: expected {a:1,b:{c:2,d:3}} to deeply and strictly equal {a:1,b:{c:2,d:4}}");
    });

    it("Nested arrays match match", function () {
        const arr1 = [1, [2, 3], 4];
        const arr2 = [1, [2, 3], 4];

        assert.deepStrictEqual(arr1, arr1); // Same reference
        assert.deepStrictEqual(arr2, arr2); // Same reference

        checkError(function () {
            assert.deepStrictEquals(arr1, arr2);
        }, "expected [1,[2,3],4] to deeply and strictly equal [1,[2,3],4]");

        checkError(function () {
            const arr3 = [1, [2, 4], 4];
            assert.deepStrictEquals(arr1, arr3, "Nested array mismatch");
        }, "Nested array mismatch: expected [1,[2,3],4] to deeply and strictly equal [1,[2,4],4]");
    });

    it("Combination of objects and arrays match", function () {
        const combo1 = { a: [1, 2, { b: 3 }] };
        const combo2 = { a: [1, 2, { b: 3 }] };
        
        assert.deepStrictEquals(combo1, combo1);
        assert.deepStrictEquals(combo2, combo2);

        checkError(function () {
            assert.deepStrictEquals(combo1, combo2);
        }, "expected {a:[1,2,{b:3}]} to deeply and strictly equal {a:[1,2,{b:3}]}");

        checkError(function () {
            const combo3 = { a: [1, 2, { b: 4 }] };
            assert.deepStrictEquals(combo1, combo3, "Combination mismatch");
        }, "Combination mismatch: expected {a:[1,2,{b:3}]} to deeply and strictly equal {a:[1,2,{b:4}]}");
    });

    it("Different data types", function () {
        checkError(function () {
            assert.deepStrictEquals(1, "1", "Type mismatch");
        }, "Type mismatch: expected 1 to deeply and strictly equal \"1\"");

        checkError(function () {
            assert.deepStrictEquals(true, 1, "Boolean and number mismatch");
        }, "Boolean and number mismatch: expected true to deeply and strictly equal 1");

        checkError(function () {
            assert.deepStrictEquals(false, 0, "Boolean and number mismatch");
        }, "Boolean and number mismatch: expected false to deeply and strictly equal 0");

        checkError(function () {
            assert.deepStrictEquals(0, false, "Boolean and number mismatch");
        }, "Boolean and number mismatch: expected 0 to deeply and strictly equal false");

        checkError(function () {
            assert.deepStrictEquals(0, null, "Boolean and null mismatch");
        }, "Boolean and null mismatch: expected 0 to deeply and strictly equal null");

        checkError(function () {
            assert.deepStrictEquals("", false, "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected \"\" to deeply and strictly equal false");
        
        checkError(function () {
            assert.deepStrictEquals("", null, "String and null mismatch");
        }, "String and null mismatch: expected \"\" to deeply and strictly equal null");
        
        checkError(function () {
            assert.deepStrictEquals("", 0, "String and number mismatch");
        }, "String and number mismatch: expected \"\" to deeply and strictly equal 0");
        
        checkError(function () {
            assert.deepStrictEquals("", undefined, "String and undefined mismatch");
        }, "String and undefined mismatch: expected \"\" to deeply and strictly equal undefined");

        checkError(function () {
            assert.deepStrictEquals(0, undefined, "Number and undefined mismatch");
        }, "Number and undefined mismatch: expected 0 to deeply and strictly equal undefined");

        checkError(function () {
            assert.deepStrictEquals(true, "1", "Boolean and string 1 mismatch");
        }, "Boolean and string 1 mismatch: expected true to deeply and strictly equal \"1\"");

        checkError(function () {
            assert.deepStrictEquals(false, "0", "Boolean and string 0 mismatch");
        }, "Boolean and string 0 mismatch: expected false to deeply and strictly equal \"0\"");

        checkError(function () {
            assert.deepStrictEquals(true, "true", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected true to deeply and strictly equal \"true\"");

        checkError(function () {
            assert.deepStrictEquals(false, "false", "Boolean and string mismatch");
        }, "Boolean and string mismatch: expected false to deeply and strictly equal \"false\"");

        checkError(function () {
            assert.deepStrictEquals(null, "null", "Null and string mismatch");
        }, "Null and string mismatch: expected null to deeply and strictly equal \"null\"");

        checkError(function () {
            assert.deepStrictEquals(undefined, "undefined", "Undefined and string mismatch");
        }, "Undefined and string mismatch: expected undefined to deeply and strictly equal \"undefined\"");

        checkError(function () {
            assert.deepStrictEquals(0, "0", "Number and string mismatch");
        }, "Number and string mismatch: expected 0 to deeply and strictly equal \"0\"");

        checkError(function () {
            assert.deepStrictEquals(1, true, "Number and boolean mismatch");
        }, "Number and boolean mismatch: expected 1 to deeply and strictly equal true");

        checkError(function () {
            assert.deepStrictEquals(0, false, "Number and boolean mismatch");
        }, "Number and boolean mismatch: expected 0 to deeply and strictly equal false");
    });
});
