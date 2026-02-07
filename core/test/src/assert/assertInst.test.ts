/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isFunction } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { expect } from "../../../src/assert/expect";
import { addAssertInstFuncDefs, addAssertInstFunc, addAssertInstProperty } from "../../../src/assert/assertInst";
import { _clearAssertInstFuncs } from "../../../src/assert/internal/_AssertInstCore";
import { IAssertInst, IExtendedAssertInst } from "../../../src/assert/interface/IAssertInst";
import { MsgSource } from "../../../src/assert/type/MsgSource";
import { createAssertScope } from "../../../src/assert/assertScope";
import { createContext } from "../../../src/assert/scopeContext";
import { IAssertScope } from "../../../src";
import { checkError } from "../support/checkError";

describe("assertInst.ts", () => {

    afterEach(() => {
        _clearAssertInstFuncs();
    });

    describe("create inst and scope", () => {
        it("should create a new inst object", () => {
            const value = "test";
            const msg: MsgSource = "test message";
            const scope = createAssertScope(createContext(value, msg));
            const inst = scope.newInst();
            expect(inst).is.object(); // Replace Object with the actual class if known
            expect(scope.context.value).equal(value);
            expect(scope.context.getMessage()).equal(msg);
        });
    });

    describe("addAssertInstFuncDefs", () => {
        it("should add functions to the prototype", () => {
            interface ITestFuncs {
                // testFunc: (this: IAssertScope, ...args: any[]) => any;
                testFunc: (...args: any[]) => IAssertInst;
            }

            const funcs = {
                testFunc: { scopeFn: function (...args: any[]) {
                } }
            };
            let scope = createAssertScope(createContext(false));
            let inst = scope.newInst() as IExtendedAssertInst<ITestFuncs>;
            scope.that = inst;
            assert(inst["testFunc"] === undefined, "Property should not exist before adding functions");
            addAssertInstFuncDefs<ITestFuncs>(funcs);

            assert("testFunc" in inst, "Property should exist after adding functions");

            inst.testFunc().is.false("Function should return the unaltered instance object");
        });

        it("should add operation to the prototype", () => {
            interface ITestFuncs {
                testFunc: IAssertInst;
            }

            const funcs = {
                testFunc: { propFn: function (scope: IAssertScope, ...args: any[]) {
                    return inst;
                } }
            };
            let scope = createAssertScope(createContext(false));
            let inst = scope.newInst() as IExtendedAssertInst<ITestFuncs>;

            assert(inst["testFunc"] === undefined, "Property should not exist before adding functions");
            addAssertInstFuncDefs<ITestFuncs>(funcs);

            assert("testFunc" in inst, "Property should exist after adding functions");

            (inst as IExtendedAssertInst<ITestFuncs>).testFunc.is.false("Function should return the unaltered instance object");
        });

        it("should add functions to the prototype", () => {
            interface ITestFuncs {
                testFunc: (...args: any[]) => IAssertInst;
            }

            const funcs = {
                testFunc: { scopeFn: function (...args: any[]) {
                    return;
                } }
            };
            let scope = createAssertScope(createContext(false));
            let inst = scope.newInst() as IExtendedAssertInst<ITestFuncs>;
            assert.equal(inst["testFunc"], undefined, "Property should not exist before adding functions");
            addAssertInstFuncDefs<ITestFuncs>(funcs);
            assert(isFunction(inst["testFunc"]), "Property should exist before adding functions");

            inst.testFunc().is.false("Function should return the unaltered instance object");
        });

        it("should add functions to the prototype and return new instance", () => {
            interface ITestFuncs {
                testFunc1: (...args: any[]) => IAssertInst;
                testFunc2: (...args: any[]) => IAssertInst;
            }

            const funcs = {
                testFunc1: { scopeFn: function (...args: any[]) {
                    return;
                } },
                testFunc2: { scopeFn: function (...args: any[]) {
                    return this.newInst(true) as IAssertInst;
                } }
            };
            let scope = createAssertScope(createContext(false));
            let inst = scope.newInst() as IExtendedAssertInst<ITestFuncs>;
            assert(inst["testFunc1"] === undefined);
            assert(inst["testFunc2"] === undefined);
            expect(inst, "Property should not exist before adding functions").not.hasProperty("testFunc2");
            addAssertInstFuncDefs(funcs);
            assert(inst["testFunc1"] !== undefined);
            assert(inst["testFunc2"] !== undefined);
            expect(inst, "Property should not exist before adding functions").hasProperty("testFunc1");
            expect(inst, "Property should not exist before adding functions").hasProperty("testFunc2");

            // Test the functions
            (expect(false) as IExtendedAssertInst<ITestFuncs>).testFunc1().is.false("Function should return the original instance object");
            (expect(false) as IExtendedAssertInst<ITestFuncs>).testFunc2().is.true("Function should return the new instance object");
        });
    });

    describe("addAssertInstFunc", () => {
        it("should add a single function to the prototype", () => {
            interface ISingleFunc {
                singleFunc: () => IAssertInst;
            }

            const func = function (this: IAssertScope) {
                return this.newInst(true);
            };
            let scope = createAssertScope(createContext(false));
            let inst = scope.newInst() as IExtendedAssertInst<ISingleFunc>;
            expect(inst).not.hasProperty("singleFunc");
            addAssertInstFunc("singleFunc", func);
            expect(inst).hasProperty("singleFunc");

            // Test the functions (which will return a different "value" for the instance)
            (expect("Hello").not as IExtendedAssertInst<ISingleFunc>).singleFunc().is.false();
            (expect("Darkness") as IExtendedAssertInst<ISingleFunc>).singleFunc().is.true();
        });


        it("inline property func that throws with no default evalMsg", () => {
            interface IInlineFunc {
                doThrow: () => IAssertInst;
            }

            const func = function (scope: IAssertScope, evalMsg?: MsgSource) {
                throw new Error("Test - " + scope.context.getMessage(evalMsg || "Hello silence, my old companion -- failure"));
            };

            // Create an inline function that will execute the `toThrow` function with
            // no arguments when referenced, this is the same as calling `assert.toThrow()`.
            addAssertInstProperty("doThrow", func);

            checkError(() => {
                let extendedExtend = expect("Hello silence, my old companion -- failure") as IExtendedAssertInst<IInlineFunc>;
                extendedExtend.doThrow;
            }, "Hello silence, my old companion -- failure");
        });

        it("inline property func that throws with default evalMsg", () => {
            interface IInlineFunc {
                doThrow: () => IAssertInst;
            }

            const func = function (scope: IAssertScope, evalMsg?: MsgSource) {
                throw new Error("Test - " + scope.context.getMessage(evalMsg || "Hello silence, my old companion -- failure"));
            };

            // Create an inline function that will execute the `toThrow` function with
            // no arguments when referenced, this is the same as calling `assert.toThrow()`.
            addAssertInstProperty("doThrow", func, "doThrow failure message");

            checkError(() => {
                let extendedExtend = expect("Hello silence, my old companion -- failure") as IExtendedAssertInst<IInlineFunc>;
                extendedExtend.doThrow;
            }, "Test - doThrow failure message");
        });

        it("inline property func", () => {
            interface IInlineFunc {
                myFailFunc: () => IAssertInst;
            }

            const func = function (scope: IAssertScope, evalMsg?: MsgSource) {
                scope.context.eval(false, evalMsg);
            };

            // Create an inline function that will execute the `toThrow` function with
            // no arguments when referenced, this is the same as calling `assert.toThrow()`.
            addAssertInstProperty("myFailFunc", func, "expected my function to fail");

            checkError(() => {
                let extendedExtend = expect("Hello") as IExtendedAssertInst<IInlineFunc>;
                extendedExtend.myFailFunc;
            }, "expected my function to fail");
        });
    });
});