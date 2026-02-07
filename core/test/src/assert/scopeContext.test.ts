/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { createContext } from "../../../src/assert/scopeContext";

describe("scopeContext", () => {
    describe("getMessage", () => {
        it("creates a new scope context", () => {
            let context = createContext("darkness");
            context.set("my", "old companion");

            assert.equal(context.value, "darkness");
            assert.equal(context.getMessage(""), "");
            assert.equal(context.getMessage("hello"), "hello");
            assert.equal(context.getMessage("hello {value}"), "hello \"darkness\"");
            assert.equal(context.getMessage("hello {message}"), "hello {message}");
            assert.equal(context.getMessage("hello {my}"), "hello \"old companion\"");
        });

        it("Includes the initMsg in the message", () => {
            let context = createContext("my", "hello silence");
            context.set("my", "old companion");

            assert.equal(context.value, "my");
            assert.equal(context.getMessage(""), "hello silence");
            assert.equal(context.getMessage("hello"), "hello silence: hello");
            assert.equal(context.getMessage("hello {value}"), "hello silence: hello \"my\"");
            assert.equal(context.getMessage("hello {message}"), "hello silence: hello {message}");
            assert.equal(context.getMessage("hello {my}"), "hello silence: hello \"old companion\"");
        });

        it("Includes the initMsg in the message only once with child context", () => {
            let context = createContext("hello", "darkness");
            context.set("talk", "with you again");
            let child = context.new("my");
            child.set("old", "companion");

            assert.equal(context.value, "hello");
            assert.equal(context.getMessage(""), "darkness");
            assert.equal(context.getMessage("hello"), "darkness: hello");
            assert.equal(context.getMessage("hello {value}"), "darkness: hello \"hello\"");
            assert.equal(context.getMessage("hello {message}"), "darkness: hello {message}");
            assert.equal(context.getMessage("hello {talk}"), "darkness: hello \"with you again\"");
            // Parent context should not be affected by child context
            assert.equal(context.getMessage("hello {my}"), "darkness: hello {my}");

            assert.equal(child.value, "my");
            assert.equal(child.getMessage(""), "darkness");
            assert.equal(child.getMessage("hello"), "darkness: hello");
            assert.equal(child.getMessage("hello {value}"), "darkness: hello \"my\"");
            assert.equal(child.getMessage("hello {message}"), "darkness: hello {message}");
            assert.equal(child.getMessage("hello {old}"), "darkness: hello \"companion\"");
            // Child context should include parent context
            assert.equal(child.getMessage("hello {talk}"), "darkness: hello \"with you again\"");
        });

        it("Message template includes {{ in the string", () => {
            let context = createContext("hello", "darkness");
            context.set("talk", "with you again");
            let child = context.new("my");
            child.set("old", "companion");

            assert.equal(context.getMessage("hello {{value}"), "darkness: hello {{value}");
            assert.equal(child.getMessage("hello {{value}"), "darkness: hello {{value}");

            assert.equal(context.getMessage("hello {{{value}"), "darkness: hello {{\"hello\"");
            assert.equal(child.getMessage("hello {{{value}"), "darkness: hello {{\"my\"");

            assert.equal(context.getMessage("hello {{{value}}"), "darkness: hello {{\"hello\"}");
            assert.equal(child.getMessage("hello {{{value}}"), "darkness: hello {{\"my\"}");

            assert.equal(context.getMessage("hello {value}}"), "darkness: hello \"hello\"}");
            assert.equal(child.getMessage("hello {value}}"), "darkness: hello \"my\"}");

            assert.equal(context.getMessage("hello {{{{value}}"), "darkness: hello {{{{value}}");
            assert.equal(child.getMessage("hello {{{{value}}"), "darkness: hello {{{{value}}");
        });
    });

    describe("_$stackFn", () => {
        it("The stack is not affected by the context value", () => {
            let context = createContext("hello", "darkness");
            context.set("talk", "with you again");
            let child = context.new("my");
            child.set("old", "companion");

            assert.equal(context._$stackFn.length, 0);
            assert.equal(child._$stackFn.length, 0);
        });

        it("The child context stack includes the parent context stack", () => {
            function hello() {
                return "hello";
            }

            function darkness() {
                return "darkness";
            }

            let context = createContext("hello", "darkness");
            context.set("talk", "with you again");
            context._$stackFn.push(hello);
            let child = context.new("my");
            child.set("old", "companion");

            assert.equal(context._$stackFn.length, 1);
            assert.equal(child._$stackFn.length, 1);

            assert.equal(context._$stackFn[0], hello);
            assert.equal(child._$stackFn[0], hello);

            context._$stackFn.push(darkness);
            assert.equal(context._$stackFn.length, 2);
            assert.equal(child._$stackFn.length, 1);
            assert.equal(context._$stackFn[1], darkness);
            assert.equal(child._$stackFn[0], hello);
        });

        it("unshifting the stack", () => {
            function hello() {
                return "hello";
            }

            function darkness() {
                return "darkness";
            }

            let context = createContext("hello", "darkness");
            context.set("talk", "with you again");
            context._$stackFn.unshift(hello);
            let child = context.new("my");
            child.set("old", "companion");

            assert.equal(context._$stackFn.length, 1);
            assert.equal(child._$stackFn.length, 1);

            assert.equal(context._$stackFn[0], hello);
            assert.equal(child._$stackFn[0], hello);

            context._$stackFn.unshift(darkness);
            assert.equal(context._$stackFn.length, 2);
            assert.equal(child._$stackFn.length, 1);
            assert.equal(context._$stackFn[0], darkness);
            assert.equal(context._$stackFn[1], hello);
            assert.equal(child._$stackFn[0], hello);
        });

        it("unshifting the stack doesn't add and existing function", () => {
            function hello() {
                return "hello";
            }

            function darkness() {
                return "darkness";
            }

            let context = createContext("hello", "darkness");
            context.set("talk", "with you again");
            context._$stackFn.unshift(hello);

            assert.equal(context._$stackFn.length, 1);

            assert.equal(context._$stackFn[0], hello);

            context._$stackFn.unshift(hello);
            assert.equal(context._$stackFn.length, 1);
            assert.equal(context._$stackFn[0], hello);

            context._$stackFn.unshift(darkness);
            assert.equal(context._$stackFn.length, 2);
            assert.equal(context._$stackFn[0], darkness);
            assert.equal(context._$stackFn[1], hello);

            context._$stackFn.unshift(darkness);
            assert.equal(context._$stackFn.length, 2);
            assert.equal(context._$stackFn[0], darkness);
            assert.equal(context._$stackFn[1], hello);

            context._$stackFn.unshift(hello);
            assert.equal(context._$stackFn.length, 2);
            assert.equal(context._$stackFn[0], hello);
            assert.equal(context._$stackFn[1], darkness);
        });
    });
});

