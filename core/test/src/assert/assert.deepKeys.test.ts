/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { AssertionFailure } from "../../../src/assert/assertionError";
import { assert } from "../../../src/assert/assertClass";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("assert deep keys", () => {
    describe("has.any.deep.keys", () => {
        it("should pass when Map has any deep key match", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");

            expect(map).to.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            expect(map).to.have.any.deep.keys({ message: "darkness", type: "familiar" });
            expect(map).to.have.any.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
        });

        it("should pass when Set has any deep key match", () => {
            const set = new Set();
            set.add({ greeting: "hello", subject: "friend" });
            set.add({ message: "darkness", type: "familiar" });

            expect(set).to.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            expect(set).to.have.any.deep.keys({ message: "darkness", type: "familiar" });
            expect(set).to.have.any.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
        });

        it("should pass when object has any deep key match", () => {
            const obj: any = {};
            obj[JSON.stringify({ greeting: "hello", subject: "friend" })] = "value1";
            obj[JSON.stringify({ message: "darkness", type: "familiar" })] = "value2";

            // Note: Regular objects can't have deep object keys, so this tests string keys
            expect(obj).to.have.any.deep.keys(JSON.stringify({ greeting: "hello", subject: "friend" }));
        });

        it("should fail when Map does not have any deep key match", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");

            expect(() => {
                expect(map).to.have.any.deep.keys({ echo: "calling", void: "silence" });
            }).to.throw(AssertionFailure);

            expect(() => {
                expect(map).to.have.any.deep.keys([{ echo: "calling" }, { vision: "softly" }]);
            }).to.throw(AssertionFailure);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val");

            expect(map).to.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            expect(() => expect(map).to.have.any.deep.keys({ echo: "calling" })).to.throw();
        });

        it("should work with complex nested objects as keys", () => {
            const map = new Map();
            map.set({ nested: { value: [1, 2, 3] } }, "data");

            expect(map).to.have.any.deep.keys({ nested: { value: [1, 2, 3] } });
        });
    });

    describe("has.all.deep.keys", () => {
        it("should pass when Map has all deep key matches", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            map.set({ echo: "calling", void: "silence" }, "value3");

            expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
            expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }, { echo: "calling", void: "silence" }]);
        });

        it("should pass when Set has all deep key matches", () => {
            const set = new Set();
            set.add({ greeting: "hello", subject: "friend" });
            set.add({ message: "darkness", type: "familiar" });

            expect(set).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
        });

        it("should fail when Map is missing some deep keys", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");

            expect(() => {
                expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
            }).to.throw(AssertionFailure);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val1");
            map.set({ message: "darkness", type: "familiar" }, "val2");

            expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
            expect(() => expect(map).to.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }])).to.throw();
        });

        it("should work with single key", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value");

            expect(map).to.have.all.deep.keys({ greeting: "hello", subject: "friend" });
        });
    });

    describe("not.has.any.deep.keys", () => {
        it("should pass when Map does not have any deep key match", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");

            expect(map).to.not.have.any.deep.keys({ echo: "calling", void: "silence" });
            expect(map).to.not.have.any.deep.keys([{ echo: "calling" }, { vision: "softly" }]);
        });

        it("should fail when Map has at least one deep key match", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");

            expect(() => {
                expect(map).to.not.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            }).to.throw(AssertionFailure);

            expect(() => {
                expect(map).to.not.have.any.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
            }).to.throw(AssertionFailure);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val");

            expect(map).to.not.have.any.deep.keys({ message: "darkness" });
            expect(() => expect(map).to.not.have.any.deep.keys({ greeting: "hello", subject: "friend" })).to.throw();
        });
    });

    describe("not.has.all.deep.keys", () => {
        it("should pass when Map does not have all deep key matches", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");

            expect(map).to.not.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
            expect(map).to.not.have.all.deep.keys([{ echo: "calling" }, { vision: "softly" }]);
        });

        it("should fail when Map has all deep key matches", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");

            expect(() => {
                expect(map).to.not.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
            }).to.throw(AssertionFailure);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val1");
            map.set({ message: "darkness", type: "familiar" }, "val2");

            expect(map).to.not.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { echo: "calling" }]);
            expect(() => expect(map).to.not.have.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }])).to.throw();
        });
    });

    describe("contains.all.deep.keys", () => {
        it("should pass when Map contains all deep keys", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value1");
            map.set({ message: "darkness", type: "familiar" }, "value2");
            map.set({ echo: "calling", void: "silence" }, "value3");

            expect(map).to.contain.all.deep.keys([{ greeting: "hello", subject: "friend" }, { message: "darkness", type: "familiar" }]);
        });

        it("should work with expect syntax", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "val1");
            map.set({ message: "darkness", type: "familiar" }, "val2");

            expect(map).to.contain.all.deep.keys([{ greeting: "hello", subject: "friend" }]);
        });
    });

    describe("edge cases", () => {
        it("should work with symbol keys in objects", () => {
            const sym1 = Symbol("test");
            const obj: any = {};
            obj[sym1] = "value";

            expect(obj).to.have.any.deep.keys(sym1);
        });

        it("should work with numeric keys", () => {
            const obj: any = { 1: "one", 2: "two" };
            expect(obj).to.have.any.deep.keys("1");
        });

        it("should work with empty Map", () => {
            const map = new Map();

            expect(() => {
                expect(map).to.have.any.deep.keys({ a: 1 });
            }).to.throw(AssertionFailure);
        });

        it("should work with null prototype objects as keys", () => {
            const map = new Map();
            const nullProtoKey = Object.create(null);
            nullProtoKey.a = 1;
            map.set(nullProtoKey, "value");

            const testKey = Object.create(null);
            testKey.a = 1;

            expect(map).to.have.any.deep.keys(testKey);
        });

        it("should distinguish between similar but not equal objects", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend", extra: "data" }, "value");

            expect(() => {
                expect(map).to.have.any.deep.keys({ greeting: "hello", subject: "friend" });
            }).to.throw(AssertionFailure);
        });

        it("should work with arrays as Map keys", () => {
            const map = new Map();
            map.set([1, 2, 3], "value");

            // Use double array wrapping to check for array as literal key
            expect(map).to.have.any.deep.keys([[1, 2, 3]]);
        });

        it("should work with Date objects as keys", () => {
            const map = new Map();
            const date = new Date("2020-01-01");
            map.set(date, "value");

            expect(map).to.have.any.deep.keys(new Date("2020-01-01"));
        });
    });
});

describe("assert.hasAnyDeepKeys", () => {
    describe("basic functionality", () => {
        it("should pass when object has at least one matching key", () => {
            const obj = { greeting: "hello", subject: "friend", message: "darkness" };
            assert.hasAnyDeepKeys(obj, "greeting");
            assert.hasAnyDeepKeys(obj, ["greeting", "unknown"]);
            assert.hasAnyDeepKeys(obj, ["unknown", "subject"]);
        });

        it("should fail when object has none of the keys", () => {
            const obj = { greeting: "hello", subject: "friend" };
            checkError(() => {
                assert.hasAnyDeepKeys(obj, ["unknown", "missing"]);
            }, /expected any deep key/);
        });

        it("should fail with detailed error message showing expected and found keys", () => {
            const obj = { greeting: "hello", subject: "friend" };
            checkError(() => {
                assert.hasAnyDeepKeys(obj, ["unknown", "missing"]);
            }, /expected any deep key.*unknown.*missing.*found.*greeting.*subject/);
        });

        it("should work with Map containing object keys", () => {
            const map = new Map();
            map.set({ id: 1 }, "value1");
            map.set({ id: 2 }, "value2");

            assert.hasAnyDeepKeys(map, { id: 1 });
            assert.hasAnyDeepKeys(map, [{ id: 1 }, { id: 3 }]);
        });

        it("should work with Set containing object keys", () => {
            const set = new Set();
            set.add({ id: 1 });
            set.add({ id: 2 });

            assert.hasAnyDeepKeys(set, { id: 1 });
            assert.hasAnyDeepKeys(set, [{ id: 3 }, { id: 2 }]);
        });
    });

    describe("edge cases", () => {
        it("should work with nested object keys", () => {
            const map = new Map();
            map.set({ nested: { value: 1 } }, "data");

            assert.hasAnyDeepKeys(map, { nested: { value: 1 } });
        });

        // Note: To check for a literal array as a key, wrap it in another array
        // assert.hasAnyDeepKeys(map, [[1, 2, 3]]) checks if [1,2,3] is a key
        // assert.hasAnyDeepKeys(map, [1, 2, 3]) would check for keys 1, 2, and 3
        it("should work with array keys", () => {
            const map = new Map();
            map.set([1, 2, 3], "value");

            assert.hasAnyDeepKeys(map, [[1, 2, 3]]);
        });

        // The keys parameter supports ArrayLikeOrSizedIterable (arrays, Sets, Maps, etc.)
        // or a single object key. Sets and other iterables are automatically expanded.
        it("should work with Set as keys parameter", () => {
            const obj = { greeting: "hello", subject: "friend", message: "darkness" };
            const keysSet = new Set(["greeting", "unknown"]);

            assert.hasAnyDeepKeys(obj, keysSet);
        });

        it("should work with Map objects as keys in Map", () => {
            const map = new Map();
            const key1 = new Map([[1, "a"]]);
            const key2 = new Map([[2, "b"]]);
            map.set(key1, "value1");
            map.set(key2, "value2");

            assert.hasAnyDeepKeys(map, [new Map([[1, "a"]]), new Map([[999, "z"]])]);
        });
    });
});

describe("assert.hasAllDeepKeys", () => {
    describe("basic functionality", () => {
        it("should pass when object has all matching keys", () => {
            const obj = { greeting: "hello", subject: "friend", message: "darkness" };
            assert.hasAllDeepKeys(obj, "greeting");
            assert.hasAllDeepKeys(obj, ["greeting", "subject"]);
            assert.hasAllDeepKeys(obj, ["greeting", "subject", "message"]);
        });

        it("should fail when object is missing any key", () => {
            const obj = { greeting: "hello", subject: "friend" };
            checkError(() => {
                assert.hasAllDeepKeys(obj, ["greeting", "unknown"]);
            }, /expected all deep keys.*missing/);
        });

        it("should fail with detailed error message showing missing keys", () => {
            const obj = { greeting: "hello", subject: "friend" };
            checkError(() => {
                assert.hasAllDeepKeys(obj, ["greeting", "unknown", "missing"]);
            }, /expected all deep keys.*greeting.*unknown.*missing.*missing.*unknown.*missing/);
        });

        it("should work with Map containing object keys", () => {
            const map = new Map();
            map.set({ id: 1 }, "value1");
            map.set({ id: 2 }, "value2");

            assert.hasAllDeepKeys(map, { id: 1 });
            assert.hasAllDeepKeys(map, [{ id: 1 }, { id: 2 }]);
        });

        it("should fail when Map is missing any object key", () => {
            const map = new Map();
            map.set({ id: 1 }, "value1");

            checkError(() => {
                assert.hasAllDeepKeys(map, [{ id: 1 }, { id: 2 }]);
            }, /expected all deep keys.*missing/);
        });

        it("should work with Set containing object keys", () => {
            const set = new Set();
            set.add({ id: 1 });
            set.add({ id: 2 });

            assert.hasAllDeepKeys(set, [{ id: 1 }, { id: 2 }]);
        });
    });

    describe("edge cases", () => {
        it("should distinguish similar but not equal objects", () => {
            const map = new Map();
            map.set({ greeting: "hello", subject: "friend" }, "value");

            checkError(() => {
                assert.hasAllDeepKeys(map, { greeting: "hello" });
            }, /expected all deep keys.*missing/);
        });
    });
});

describe("assert.notHaveAnyDeepKeys", () => {
    describe("basic functionality", () => {
        it("should pass when object has none of the keys", () => {
            const obj = { greeting: "hello", subject: "friend" };
            assert.notHaveAnyDeepKeys(obj, "unknown");
            assert.notHaveAnyDeepKeys(obj, ["unknown", "missing"]);
        });

        it("should fail when object has at least one key", () => {
            const obj = { greeting: "hello", subject: "friend" };
            checkError(() => {
                assert.notHaveAnyDeepKeys(obj, "greeting");
            }, /not expected any deep key/);

            checkError(() => {
                assert.notHaveAnyDeepKeys(obj, ["unknown", "subject"]);
            }, /not expected any deep key/);
        });

        it("should fail with detailed error message when key is found", () => {
            const obj = { greeting: "hello", subject: "friend" };
            checkError(() => {
                assert.notHaveAnyDeepKeys(obj, ["unknown", "subject", "missing"]);
            }, /not expected any deep key.*unknown.*subject.*missing.*found.*greeting.*subject/);
        });

        it("should work with Map containing object keys", () => {
            const map = new Map();
            map.set({ id: 1 }, "value1");

            assert.notHaveAnyDeepKeys(map, { id: 2 });
            assert.notHaveAnyDeepKeys(map, [{ id: 2 }, { id: 3 }]);
        });

        it("should fail when Map has a matching object key", () => {
            const map = new Map();
            map.set({ id: 1 }, "value1");

            checkError(() => {
                assert.notHaveAnyDeepKeys(map, { id: 1 });
            }, /not expected any deep key/);
        });
    });
});

describe("assert.doesNotHaveAnyDeepKeys (alias)", () => {
    it("should work as alias for notHaveAnyDeepKeys", () => {
        const obj = { greeting: "hello", subject: "friend" };
        assert.doesNotHaveAnyDeepKeys(obj, "unknown");
        assert.doesNotHaveAnyDeepKeys(obj, ["unknown", "missing"]);
    });

    it("should fail when object has at least one key", () => {
        const obj = { greeting: "hello", subject: "friend" };
        checkError(() => {
            assert.doesNotHaveAnyDeepKeys(obj, "greeting");
        }, /not expected any deep key/);
    });

    it("should work with Map containing object keys", () => {
        const map = new Map();
        map.set({ id: 1 }, "value1");

        assert.doesNotHaveAnyDeepKeys(map, { id: 2 });

        checkError(() => {
            assert.doesNotHaveAnyDeepKeys(map, { id: 1 });
        }, /not expected any deep key/);
    });
});

describe("assert.notHaveAllDeepKeys", () => {
    describe("basic functionality", () => {
        it("should pass when object is missing at least one key", () => {
            const obj = { greeting: "hello", subject: "friend" };
            assert.notHaveAllDeepKeys(obj, ["greeting", "unknown"]);
            assert.notHaveAllDeepKeys(obj, "unknown");
            assert.notHaveAllDeepKeys(obj, ["unknown", "missing"]);
        });

        it("should fail when object has all keys", () => {
            const obj = { greeting: "hello", subject: "friend" };
            checkError(() => {
                assert.notHaveAllDeepKeys(obj, "greeting");
            }, /not expected all deep keys/);

            checkError(() => {
                assert.notHaveAllDeepKeys(obj, ["greeting", "subject"]);
            }, /not expected all deep keys/);
        });

        it("should fail with detailed error message when all keys are found", () => {
            const obj = { greeting: "hello", subject: "friend" };
            checkError(() => {
                assert.notHaveAllDeepKeys(obj, ["greeting", "subject"]);
            }, /not expected all deep keys.*greeting.*subject/);
        });

        it("should work with Map containing object keys", () => {
            const map = new Map();
            map.set({ id: 1 }, "value1");
            map.set({ id: 2 }, "value2");

            assert.notHaveAllDeepKeys(map, [{ id: 1 }, { id: 3 }]);
        });

        it("should fail when Map has all object keys", () => {
            const map = new Map();
            map.set({ id: 1 }, "value1");
            map.set({ id: 2 }, "value2");

            checkError(() => {
                assert.notHaveAllDeepKeys(map, [{ id: 1 }, { id: 2 }]);
            }, /not expected all deep keys/);
        });
    });
});

describe("assert.doesNotHaveAllDeepKeys (alias)", () => {
    it("should work as alias for notHaveAllDeepKeys", () => {
        const obj = { greeting: "hello", subject: "friend" };
        assert.doesNotHaveAllDeepKeys(obj, ["greeting", "unknown"]);
        assert.doesNotHaveAllDeepKeys(obj, "unknown");
    });

    it("should fail when object has all keys", () => {
        const obj = { greeting: "hello", subject: "friend" };
        checkError(() => {
            assert.doesNotHaveAllDeepKeys(obj, ["greeting", "subject"]);
        }, /not expected all deep keys/);
    });

    it("should work with Map containing object keys", () => {
        const map = new Map();
        map.set({ id: 1 }, "value1");

        assert.doesNotHaveAllDeepKeys(map, [{ id: 1 }, { id: 2 }]);

        checkError(() => {
            assert.doesNotHaveAllDeepKeys(map, { id: 1 });
        }, /not expected all deep keys/);
    });
});
