/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert, expect } from "../../../src/index";
import { createAssertScope } from "../../../src/assert/assertScope";
import { includeOp, deepIncludeOp, ownIncludeOp, deepOwnIncludeOp } from "../../../src/assert/ops/includeOp";
import { createContext } from "../../../src/assert/scopeContext";
import { checkError } from "../support/checkError";

describe("includeOp edge cases", () => {

    describe("Map with NaN values", () => {
        it("should match NaN values in Map using _mapValueEquals", () => {
            const map = new Map([["key", NaN]]);
            const scope = createAssertScope(createContext(map));
            const op = includeOp(scope);

            // Should not throw - NaN should equal NaN
            op.call(scope, NaN);
        });

        it("should detect missing NaN value", () => {
            const map = new Map([["key", 123]]);
            const scope = createAssertScope(createContext(map));
            const op = includeOp(scope);

            checkError(() => {
                op.call(scope, NaN);
            }, /expected .* to include NaN/);
        });

        it("should handle multiple NaN values in Map", () => {
            const map = new Map([["key1", NaN], ["key2", 42], ["key3", NaN]]);
            const scope = createAssertScope(createContext(map));
            const op = includeOp(scope);

            op.call(scope, NaN);
            op.call(scope, 42);
        });
    });

    describe("Map with 0 and -0", () => {
        it("should treat 0 and -0 as equal in Map values", () => {
            const map = new Map([["key", 0]]);
            const scope = createAssertScope(createContext(map));
            const op = includeOp(scope);

            // Should not throw - 0 === -0
            op.call(scope, -0);
        });

        it("should handle -0 stored in Map", () => {
            const map = new Map([["key", -0]]);
            const scope = createAssertScope(createContext(map));
            const op = includeOp(scope);

            op.call(scope, 0);
        });
    });

    describe("Object property matching", () => {
        it("should match partial object with all properties present", () => {
            const obj = { a: 1, b: 2, c: 3 };
            const scope = createAssertScope(createContext(obj));
            const op = includeOp(scope);

            op.call(scope, { a: 1 });
            op.call(scope, { a: 1, b: 2 });
            op.call(scope, { b: 2, c: 3 });
        });

        it("should fail when any property missing", () => {
            const obj = { a: 1, b: 2 };
            const scope = createAssertScope(createContext(obj));
            const op = includeOp(scope);

            checkError(() => {
                op.call(scope, { a: 1, c: 3 });
            }, /expected .* to include .*/);
        });

        it("should fail when property value doesn't match", () => {
            const obj = { a: 1, b: 2 };
            const scope = createAssertScope(createContext(obj));
            const op = includeOp(scope);

            checkError(() => {
                op.call(scope, { a: 2 });
            }, /expected .* to include .*/);
        });

        it("should check inherited properties with 'in' operator", () => {
            const proto = { inherited: "value" };
            const obj = Object.create(proto);
            obj.own = "property";

            const scope = createAssertScope(createContext(obj));
            const op = includeOp(scope);

            // Should pass - inherited property exists via 'in'
            op.call(scope, { inherited: "value" });
        });
    });

    describe("Collections with has() method", () => {
        it("should use has() for custom collections", () => {
            const customCollection = {
                has: (value: any) => value === "test"
            };

            const scope = createAssertScope(createContext(customCollection));
            const op = includeOp(scope);

            op.call(scope, "test");

            checkError(() => {
                op.call(scope, "notfound");
            }, /expected .* to include "notfound"/);
        });

        it("should handle WeakSet references", () => {
            const obj1 = { id: 1 };
            const obj2 = { id: 2 };
            const ws = new WeakSet([obj1]);

            const scope = createAssertScope(createContext(ws));
            const op = includeOp(scope);

            op.call(scope, obj1);

            checkError(() => {
                op.call(scope, obj2);
            }, /expected .* to include .*/);
        });
    });
});

describe("deepIncludeOp edge cases", () => {

    describe("Array deep includes", () => {
        it("should match nested objects in arrays", () => {
            const arr = [{ a: 1 }, { b: 2 }, { c: { d: 3 } }];
            const scope = createAssertScope(createContext(arr));
            const op = deepIncludeOp(scope);

            op.call(scope, { a: 1 });
            op.call(scope, { b: 2 });
            op.call(scope, { c: { d: 3 } });
        });

        it("should not match partially matching nested objects", () => {
            const arr = [{ a: 1, b: 2 }];
            const scope = createAssertScope(createContext(arr));
            const op = deepIncludeOp(scope);

            checkError(() => {
                op.call(scope, { a: 1, b: 3 });
            }, /expected .* to deep include .*/);
        });

        it("should handle NaN in arrays", () => {
            const arr = [1, NaN, 3];
            const scope = createAssertScope(createContext(arr));
            const op = deepIncludeOp(scope);

            op.call(scope, NaN);
        });
    });

    describe("Map deep includes", () => {
        it("should match nested objects in Map values", () => {
            const map = new Map([
                ["key1", { a: 1 }],
                ["key2", { b: { c: 2 } }]
            ]);
            const scope = createAssertScope(createContext(map));
            const op = deepIncludeOp(scope);

            op.call(scope, { a: 1 });
            op.call(scope, { b: { c: 2 } });
        });

        it("should handle NaN in Map values", () => {
            const map = new Map([["key", NaN]]);
            const scope = createAssertScope(createContext(map));
            const op = deepIncludeOp(scope);

            op.call(scope, NaN);
        });

        it("should not match different nested structures", () => {
            const map = new Map([["key", { a: { b: 1 } }]]);
            const scope = createAssertScope(createContext(map));
            const op = deepIncludeOp(scope);

            checkError(() => {
                op.call(scope, { a: { b: 2 } });
            }, /expected .* to deep include .*/);
        });
    });

    describe("Set deep includes", () => {
        it("should match nested objects in Set", () => {
            const set = new Set([{ a: 1 }, { b: 2 }, { c: { d: 3 } }]);
            const scope = createAssertScope(createContext(set));
            const op = deepIncludeOp(scope);

            op.call(scope, { a: 1 });
            op.call(scope, { c: { d: 3 } });
        });

        it("should not match non-existent nested objects", () => {
            const set = new Set([{ a: 1 }]);
            const scope = createAssertScope(createContext(set));
            const op = deepIncludeOp(scope);

            checkError(() => {
                op.call(scope, { a: 2 });
            }, /expected .* to deep include .*/);
        });

        it("should handle NaN in Set", () => {
            const set = new Set([1, NaN, 3]);
            const scope = createAssertScope(createContext(set));
            const op = deepIncludeOp(scope);

            op.call(scope, NaN);
        });
    });

    describe("Object deep includes", () => {
        it("should match nested object properties", () => {
            const obj = {
                a: { b: 1 },
                c: { d: { e: 2 } }
            };
            const scope = createAssertScope(createContext(obj));
            const op = deepIncludeOp(scope);

            op.call(scope, { a: { b: 1 } });
            op.call(scope, { c: { d: { e: 2 } } });
        });

        it("should fail when nested values don't match", () => {
            const obj = { a: { b: 1 } };
            const scope = createAssertScope(createContext(obj));
            const op = deepIncludeOp(scope);

            checkError(() => {
                op.call(scope, { a: { b: 2 } });
            }, /expected .* to deep include .*/);
        });

        it("should fail when key doesn't exist", () => {
            const obj = { a: 1 };
            const scope = createAssertScope(createContext(obj));
            const op = deepIncludeOp(scope);

            checkError(() => {
                op.call(scope, { b: 1 });
            }, /expected .* to deep include .*/);
        });
    });

    describe("WeakSet and WeakMap handling", () => {
        it("should throw error for WeakSet", () => {
            const ws = new WeakSet();
            const scope = createAssertScope(createContext(ws));
            const op = deepIncludeOp(scope);

            checkError(() => {
                op.call(scope, {});
            }, /cannot be used for deep include operation/);
        });

        it("should throw error for WeakMap", () => {
            const wm = new WeakMap();
            const scope = createAssertScope(createContext(wm));
            const op = deepIncludeOp(scope);

            checkError(() => {
                op.call(scope, {});
            }, /cannot be used for deep include operation/);
        });
    });

    describe("Collections with has() but not Set", () => {
        it("should check using has() for custom collections with has method", () => {
            const testObj = { test: true };
            const customCollection = {
                has: (value: any) => value === testObj,
                [Symbol.iterator]: function* () {
                    yield testObj;
                }
            };

            const scope = createAssertScope(createContext(customCollection));
            const op = deepIncludeOp(scope);

            // Should use has() method, not iterate
            op.call(scope, testObj);

            checkError(() => {
                op.call(scope, { different: true });
            }, /expected .* to deep include .*/);
        });
    });
});

describe("ownIncludeOp edge cases", () => {

    describe("Own property checking", () => {
        it("should only match own properties, not inherited", () => {
            const proto = { inherited: "value" };
            const obj = Object.create(proto);
            obj.own = "property";

            const scope = createAssertScope(createContext(obj));
            const op = ownIncludeOp(scope);

            op.call(scope, { own: "property" });

            checkError(() => {
                op.call(scope, { inherited: "value" });
            }, /to have own properties matching/);
        });

        it("should fail when own property has wrong value", () => {
            const obj = { own: "property" };
            const scope = createAssertScope(createContext(obj));
            const op = ownIncludeOp(scope);

            checkError(() => {
                op.call(scope, { own: "wrong" });
            }, /to have own properties matching/);
        });
    });

    describe("Collections with own checking", () => {
        it("should work with Map", () => {
            const map = new Map([["key", "value"]]);
            const scope = createAssertScope(createContext(map));
            const op = ownIncludeOp(scope);

            op.call(scope, "value");
        });

        it("should work with Set", () => {
            const set = new Set([1, 2, 3]);
            const scope = createAssertScope(createContext(set));
            const op = ownIncludeOp(scope);

            op.call(scope, 2);

            checkError(() => {
                op.call(scope, 4);
            }, /expected .* to include own .*/);
        });

        it("should work with arrays", () => {
            const arr = [1, 2, 3];
            const scope = createAssertScope(createContext(arr));
            const op = ownIncludeOp(scope);

            op.call(scope, 2);

            checkError(() => {
                op.call(scope, 4);
            }, /expected .* to include own .*/);
        });
    });
});

describe("deepOwnIncludeOp edge cases", () => {

    describe("Deep own property checking", () => {
        it("should only match own properties with deep equality", () => {
            const proto = { inherited: { value: 1 } };
            const obj = Object.create(proto);
            obj.own = { value: 2 };

            const scope = createAssertScope(createContext(obj));
            const op = deepOwnIncludeOp(scope);

            op.call(scope, { own: { value: 2 } });

            checkError(() => {
                op.call(scope, { inherited: { value: 1 } });
            }, /to have own properties deeply matching/);
        });

        it("should use deep equality for nested objects", () => {
            const obj = { a: { b: { c: 1 } } };
            const scope = createAssertScope(createContext(obj));
            const op = deepOwnIncludeOp(scope);

            op.call(scope, { a: { b: { c: 1 } } });

            checkError(() => {
                op.call(scope, { a: { b: { c: 2 } } });
            }, /to have own properties deeply matching/);
        });
    });

    describe("Deep collections with own checking", () => {
        it("should deep match objects in Map", () => {
            const map = new Map([["key", { nested: { value: 1 } }]]);
            const scope = createAssertScope(createContext(map));
            const op = deepOwnIncludeOp(scope);

            op.call(scope, { nested: { value: 1 } });
        });

        it("should deep match objects in Set", () => {
            const set = new Set([{ a: 1 }, { b: { c: 2 } }]);
            const scope = createAssertScope(createContext(set));
            const op = deepOwnIncludeOp(scope);

            op.call(scope, { b: { c: 2 } });

            checkError(() => {
                op.call(scope, { b: { c: 3 } });
            }, /expected .* to deep include own .*/);
        });

        it("should handle NaN in deep own includes", () => {
            const obj = { value: NaN };
            const scope = createAssertScope(createContext(obj));
            const op = deepOwnIncludeOp(scope);

            op.call(scope, { value: NaN });
        });
    });

    describe("Array deep own includes", () => {
        it("should deep match array elements", () => {
            const arr = [{ a: 1 }, { b: 2 }];
            const scope = createAssertScope(createContext(arr));
            const op = deepOwnIncludeOp(scope);

            op.call(scope, { a: 1 });
            op.call(scope, { b: 2 });

            checkError(() => {
                op.call(scope, { c: 3 });
            }, /expected .* to deep include own .*/);
        });
    });
});

describe("includeOp with expect API", () => {

    describe("High-level expect.to.include tests", () => {
        it("should work with string includes", () => {
            expect("hello world").to.include("world");
            expect("hello world").to.not.include("foo");
        });

        it("should work with deep object includes", () => {
            expect({ a: { b: 1 }, c: 2 }).to.deep.include({ a: { b: 1 } });
            expect({ a: { b: 1 } }).to.not.deep.include({ a: { b: 2 } });
        });

        it("should work with Map includes", () => {
            const map = new Map([["key", "value"]]);
            expect(map).to.include("value");
            expect(map).to.not.include("notfound");
        });

        it("should work with Set includes", () => {
            const set = new Set([1, 2, 3]);
            expect(set).to.include(2);
            expect(set).to.not.include(4);
        });
    });
});
