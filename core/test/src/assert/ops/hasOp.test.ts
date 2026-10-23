/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createAssertScope } from "../../../../src/assert/assertScope";
import { hasOp, hasOwnOp } from "../../../../src/assert/ops/hasOp";
import { createContext } from "../../../../src/assert/scopeContext";
import { checkError } from "../../support/checkError";

describe("hasOp factories", () => {
    const proto = { inherited: 1 };

    function target(): any {
        const obj = Object.create(proto);
        obj.own = 2;
        return obj;
    }

    it("hasOp sees inherited and own properties", () => {
        hasOp<any>(createAssertScope(createContext(target()))).property("own");
        hasOp<any>(createAssertScope(createContext(target()))).property("inherited");
        hasOp<any>(createAssertScope(createContext(target()))).property("own", 2);
        hasOp<any>(createAssertScope(createContext([1, 2]))).lengthOf(2);

        checkError(() => hasOp<any>(createAssertScope(createContext(target()))).property("missing"), /expected .* to have a .*missing.* property/);
    });

    it("hasOwnOp is the own-property table: it sees own properties and refuses inherited ones", () => {
        hasOwnOp<any>(createAssertScope(createContext(target()))).property("own");
        hasOwnOp<any>(createAssertScope(createContext(target()))).property("own", 2);
        hasOwnOp<any>(createAssertScope(createContext([1, 2]))).lengthOf(2);

        checkError(() => hasOwnOp<any>(createAssertScope(createContext(target()))).property("inherited"), /expected .* to have its own .*inherited.* property/);
    });

    it("hasOwnOp exposes every own operation and the own forms of the has operations", () => {
        const has = hasOp<any>(createAssertScope(createContext(target())));
        const hasOwn = hasOwnOp<any>(createAssertScope(createContext(target())));

        for (const name of ["all", "any", "property", "propertyDescriptor", "own", "nested", "iterator", "lengthOf", "sizeOf"]) {
            if (!(name in has)) {
                throw new Error("hasOp is missing " + name);
            }
        }

        // IOwnOp's members, then the has operations that make sense against own properties alone.
        for (const name of ["contain", "contains", "include", "includes", "property", "propertyDescriptor", "iterator", "all", "any", "nested", "lengthOf", "sizeOf"]) {
            if (!(name in hasOwn)) {
                throw new Error("hasOwnOp is missing " + name);
            }
        }

        if ("own" in hasOwn) {
            throw new Error("hasOwnOp is already the own table; it must not offer own again");
        }
    });

    it("has.own reaches hasOwnOp: own-only properties, own include, and the has operations", () => {
        const obj = target();

        // Property: own passes, inherited is refused through has.own but accepted through has.
        hasOp<any>(createAssertScope(createContext(obj))).own.property("own", 2);
        hasOp<any>(createAssertScope(createContext(obj))).property("inherited");
        checkError(() => hasOp<any>(createAssertScope(createContext(obj))).own.property("inherited"), /expected .* to have its own .*inherited.* property/);

        // The IOwnOp members are the same functions .own binds, so include is own-only here too.
        hasOp<any>(createAssertScope(createContext(obj))).own.include({ own: 2 });
        hasOp<any>(createAssertScope(createContext(obj))).own.contains({ own: 2 });
        checkError(() => hasOp<any>(createAssertScope(createContext(obj))).own.include({ inherited: 1 }), /expected .* to have own properties matching/);

        // And the has operations are available under own.
        hasOp<any>(createAssertScope(createContext(obj))).own.all.keys("own");
        hasOp<any>(createAssertScope(createContext(obj))).own.any.keys("own", "nope");
        hasOp<any>(createAssertScope(createContext([1, 2, 3]))).own.lengthOf(3);
        hasOp<any>(createAssertScope(createContext(new Set([1, 2])))).own.sizeOf(2);
        hasOp<any>(createAssertScope(createContext({ a: { b: 1 } }))).own.nested.property("a.b");
    });
});
