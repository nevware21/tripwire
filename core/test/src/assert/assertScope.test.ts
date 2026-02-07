/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { createAssertScope } from "../../../src/assert/assertScope";
import { createContext } from "../../../src/assert/scopeContext";

describe("assertScope", () => {
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
