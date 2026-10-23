/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { objGetOwnPropertySymbols, objGetPrototypeOf } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { createAssertScope } from "../../../src/assert/assertScope";
import { AssertInstHandlers } from "../../../src/assert/interface/IAssertInstHandlers";
import { IAssertScope } from "../../../src/assert/interface/IAssertScope";
import { AssertScopeFuncDefs } from "../../../src/assert/interface/IAssertScopeFuncDef";
import { _tripwireAssertHandlers } from "../../../src/assert/internal/_tripwireInst";
import { createContext } from "../../../src/assert/scopeContext";

describe("assertScope", () => {
    describe("createOperation", () => {
        // A scope function's own return value is replaced by the chain instance, so the call is observed
        // through the scope it ran in: it sees the scope's value and counts its invocations.
        let calls = 0;
        function answerFunc(this: IAssertScope) {
            calls++;
            assert.equal(this.context.value, 42);
        }

        beforeEach(() => {
            calls = 0;
        });

        it("shares one prototype between the operations created from a mutable definition table", () => {
            let scope = createAssertScope(createContext(42));
            const defs: AssertScopeFuncDefs<any> = { answer: { scopeFn: answerFunc } };

            let first = scope.createOperation<any>(defs);
            let second = scope.createOperation<any>(defs);

            first.answer();
            second.answer();
            assert.equal(calls, 2);
            assert.strictEqual(objGetPrototypeOf(first), objGetPrototypeOf(second), "the definitions should be bound once and shared");
            // The cache lives on the table, as a non-enumerable symbol, so the table's own keys are untouched.
            assert.deepEqual(Object.keys(defs), ["answer"]);
            assert.equal(objGetOwnPropertySymbols(defs).length, 1);
        });

        it("accepts a frozen or sealed definition table, which a read-only table used to be allowed to be", () => {
            let scope = createAssertScope(createContext(42));
            const frozen = Object.freeze({ answer: { scopeFn: answerFunc } }) as AssertScopeFuncDefs<any>;
            const sealed = Object.seal({ answer: { scopeFn: answerFunc } }) as AssertScopeFuncDefs<any>;

            // Neither may carry the cache, so each call gets its own prototype; both must still work, twice.
            scope.createOperation<any>(frozen).answer();
            scope.createOperation<any>(frozen).answer();
            scope.createOperation<any>(sealed).answer();
            scope.createOperation<any>(sealed).answer();
            assert.equal(calls, 4);

            assert.equal(objGetOwnPropertySymbols(frozen).length, 0, "nothing may be written onto a frozen table");
            assert.equal(objGetOwnPropertySymbols(sealed).length, 0, "nothing may be written onto a sealed table");
            assert.ok(Object.isFrozen(frozen));
            assert.ok(Object.isSealed(sealed));
        });

        it("decorates a fresh empty instance per call when a custom handler creator is in effect", () => {
            // The shared prototype derives from the default empty instance, so a scope with its own
            // handlers takes the per-instance path: a new empty instance each time, and no cache on the table.
            const custom: AssertInstHandlers = () => _tripwireAssertHandlers();
            let scope = createAssertScope(createContext(42), custom);
            const defs: AssertScopeFuncDefs<any> = { answer: { scopeFn: answerFunc } };

            let first = scope.createOperation<any>(defs);
            let second = scope.createOperation<any>(defs);
            first.answer();
            second.answer();

            assert.equal(calls, 2);
            assert.notStrictEqual(first, second);
            assert.equal(objGetOwnPropertySymbols(defs).length, 0, "the per-instance path never caches on the table");
        });

        it("decorates the object it is given and binds it to the scope", () => {
            let scope = createAssertScope(createContext(42));
            const defs: AssertScopeFuncDefs<any> = { answer: { scopeFn: answerFunc } };
            let target: any = { existing: "kept" };

            let decorated = scope.createOperation<any>(defs, target);
            decorated.answer();

            assert.strictEqual(decorated, target);
            assert.equal(target.existing, "kept");
            assert.equal(calls, 1);
            assert.equal(objGetOwnPropertySymbols(defs).length, 0, "a given object is decorated directly; the table carries no cache");
        });
    });

    it("creates a new scope context", () => {
        let context = createContext("darkness");
        let scope = createAssertScope(context);

        assert.strictEqual(scope.context, context);
        scope.context.set("my", "old companion");

        assert.equal(scope.context.value, "darkness");
        assert.equal(scope.context.getMessage(""), "");
        assert.equal(scope.context.getMessage("hello"), "hello");
        assert.equal(scope.context.getMessage("hello {value}"), "hello \"darkness\"");
        assert.equal(scope.context.getMessage("hello {message}"), "hello {message}");
        assert.equal(scope.context.getMessage("hello {my}"), "hello \"old companion\"");
    });

    it("Includes the initMsg in the message", () => {
        let context = createContext("my", "hello silence");
        let scope = createAssertScope(context);

        assert.strictEqual(scope.context, context);
        context.set("my", "old companion");

        assert.equal(context.value, "my");
        assert.equal(context.getMessage(""), "hello silence");
        assert.equal(context.getMessage("hello"), "hello silence: hello");
        assert.equal(context.getMessage("hello {value}"), "hello silence: hello \"my\"");
        assert.equal(context.getMessage("hello {message}"), "hello silence: hello {message}");
        assert.equal(context.getMessage("hello {my}"), "hello silence: hello \"old companion\"");
    });

    it("Includes the initMsg in the message only once with child scope", () => {
        let context = createContext("hello", "darkness");
        let scope = createAssertScope(context);

        assert.strictEqual(scope.context, context);
        context.set("talk", "with you again");
        let childScope = scope.newScope("my");
        childScope.context.set("old", "companion");

        assert.equal(context.value, "hello");
        assert.equal(context.getMessage(""), "darkness");
        assert.equal(context.getMessage("hello"), "darkness: hello");
        assert.equal(context.getMessage("hello {value}"), "darkness: hello \"hello\"");
        assert.equal(context.getMessage("hello {message}"), "darkness: hello {message}");
        assert.equal(context.getMessage("hello {talk}"), "darkness: hello \"with you again\"");
        // Parent context should not be affected by child context
        assert.equal(context.getMessage("hello {my}"), "darkness: hello {my}");

        assert.equal(childScope.context.value, "my");
        assert.equal(childScope.context.getMessage(""), "darkness");
        assert.equal(childScope.context.getMessage("hello"), "darkness: hello");
        assert.equal(childScope.context.getMessage("hello {value}"), "darkness: hello \"my\"");
        assert.equal(childScope.context.getMessage("hello {message}"), "darkness: hello {message}");
        assert.equal(childScope.context.getMessage("hello {old}"), "darkness: hello \"companion\"");
        // Child context should include parent context
        assert.equal(childScope.context.getMessage("hello {talk}"), "darkness: hello \"with you again\"");
    });

    it("child scope should inherit parent values", () => {
        let context = createContext("hello", "darkness");
        let scope = createAssertScope(context);
        context.set("talk", "with you again");
        let childScope = scope.newScope();
        childScope.context.set("old", "companion");

        assert.notStrictEqual(childScope.context, context);
        assert.equal(childScope.context.getMessage("hello {talk}"), "darkness: hello \"with you again\"");
    });

    it("changing child scope context value should not affect parent scope", () => {
        let context = createContext("hello", "darkness");
        let scope = createAssertScope(context);
        context.set("talk", "with you again");
        let childScope = scope.newScope();
        childScope.context.set("old", "companion");

        assert.notStrictEqual(childScope.context, context);
        assert.equal(childScope.context.getMessage("hello {talk}"), "darkness: hello \"with you again\"");
        childScope.updateCtx("my");
        assert.equal(childScope.context.getMessage("hello {talk}"), "darkness: hello \"with you again\"");
        assert.equal(context.getMessage("hello {talk}"), "darkness: hello \"with you again\"");

        assert.equal(childScope.context.getMessage("hello {value}"), "darkness: hello \"my\"");
        assert.equal(context.getMessage("hello {value}"), "darkness: hello \"hello\"");
    });
});
