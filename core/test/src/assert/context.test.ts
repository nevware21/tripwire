/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { objKeys } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { createContext } from "../../../src/assert/scopeContext";
import { checkError } from "../support/checkError";
import { objAssign } from "@nevware21/ts-utils";
import { IScopeContext } from "../../../src/assert/interface/IScopeContext";
import { MsgSource } from "../../../src/assert/type/MsgSource";

describe("context", () => {

    it("createContext", () => {
        let ctx = createContext(1, "first");
        
        assert.equal(ctx.value, 1, "value should be 1");
        assert.equal(ctx.getMessage(), "first", "message should be first");
        assert.equal(ctx.getDetails().actual, 1, "actual should be 1");
        assert.equal(objKeys(ctx.getDetails()).length, 2, "details should have 2 keys - " + JSON.stringify(ctx.getDetails()));
    });

    it("new child value", () => {
        let ctx = createContext(1, "first");
        let ctx2 = ctx.new(2);
        
        assert.equal(ctx.value, 1, "value should be 1");
        assert.equal(ctx.getMessage(), "first", "message should be first");
        assert.equal(ctx.getDetails().actual, 1, "actual should be 1");
        assert.equal(objKeys(ctx.getDetails()).length, 2, "details should have 2 keys - " + JSON.stringify(ctx.getDetails()));

        assert.equal(ctx2.value, 2, "value should be 2");
        assert.equal(ctx2.getMessage(), "first", "message should be first");
        assert.equal(ctx2.getDetails().actual, 2, "actual should be 2");
        assert.equal(objKeys(ctx2.getDetails()).length, 2, "details should have 2 keys - " + JSON.stringify(ctx2.getDetails()));
    });

    it("getDetails", () => {
        let ctx = createContext(1, "first");
        let details = ctx.getDetails();
        
        assert.equal(details.actual, 1, "actual should be 1");
        assert.equal(objKeys(details).length, 2, "details should have 2 keys - " + JSON.stringify(details));
        assert.deepEqual(details, { actual: 1, showDiff: true });
    });

    describe("eval", () => {
        it("eval true", () => {
            let ctx = createContext(1, "first");
            ctx.eval(true);
            assert.equal(ctx.getMessage(), "first", "message should be first");
        });

        it("eval false", () => {
            let ctx = createContext(1, "first");

            checkError(() => {
                ctx.eval(false);
            }, "first");

            assert.equal(ctx.getMessage(), "first", "message should be first");
        });

        it("eval true with message", () => {
            let ctx = createContext(1, "first");
            ctx.eval(true, "second");
            assert.equal(ctx.getMessage(), "first", "message should be first");
        });

        it("eval false with message", () => {
            let ctx = createContext(1, "first");
            checkError(() => {
                ctx.eval(false, "second");
            }, "first: second");

            assert.equal(ctx.getMessage(), "first", "message should be first: second");
        });
    });

    describe("overrides", () => {

        describe("eval", () => {
            
            it("simulate not", () => {
                let ctx = createContext(1, "first");
                let newCtx = ctx.new(ctx.value, {
                    eval: (parent: IScopeContext, expr: boolean, evalMsg?: MsgSource) => {
                        return parent.eval(!expr, evalMsg);
                    }
                });
                    
                ctx.eval(true);
                checkError(() => {
                    ctx.eval(false);
                }, "first");
    
                newCtx.eval(false);
                checkError(() => {
                    newCtx.eval(true);
                }, "first");
            });
        });
    
        describe("getMessage", () => {
            it("multiple messages with pre and post fixes", () => {
                let ctx = createContext(1, "silence");
                let newCtx = ctx.new("newCtx", {
                    getMessage: (parent: IScopeContext, evalMsg?: MsgSource) => {
                        return "hello " + parent.getMessage(evalMsg);
                    }
                });
                let subCtx = newCtx.new("subCtx", {
                    getMessage: (parent: IScopeContext, evalMsg?: MsgSource) => {
                        return parent.getMessage(evalMsg) + ", my old companion";
                    }
                });
                let childCtx = ctx.new("childCtx", {
                    getMessage: (parent: IScopeContext, evalMsg?: MsgSource) => {
                        return "I've come to talk with you again";
                    }
                });
                    
                assert.equal(ctx.getMessage(), "silence");
                assert.equal(ctx.value, 1);
                assert.equal(newCtx.getMessage(), "hello silence");
                assert.equal(newCtx.value, "newCtx");
                assert.equal(subCtx.getMessage(), "hello silence, my old companion");
                assert.equal(subCtx.value, "subCtx");
                assert.equal(childCtx.getMessage(), "I've come to talk with you again");
                assert.equal(childCtx.value, "childCtx");
            });
        });
    
        describe("getDetails", () => {
            it("child should inherit parents", () => {
                let ctx = createContext(1, "first");
                let newCtx = ctx.new(ctx.value + 1, {
                    getDetails: (parent: IScopeContext) => {
                        return objAssign({ hello: "darkness" }, parent.getDetails());
                    }
                });
    
                let details = ctx.getDetails();
                
                assert.equal(details.actual, 1, "actual should be 1");
                assert.equal(objKeys(details).length, 2, "details should have 2 keys");
                assert.deepEqual(details, { actual: 1, showDiff: true });
    
                let newDetails = newCtx.getDetails();
                
                assert.equal(newDetails.actual, 2, "actual should be 2");
                assert.equal(objKeys(newDetails).length, 3, "details should have 3 keys");
                checkError(() => {
                    assert.deepEqual(newDetails, { actual: 1, hello: "darkness" }, "details should be { actual: 1, hello: darkness }");
                }, "details should be { actual: 1, hello: darkness }: expected {hello:\"darkness\",actual:2,showDiff:true} to deeply equal {actual:1,hello:\"darkness\"}");
            });
        });
    });
});