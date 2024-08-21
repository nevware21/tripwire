/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertScopeFuncDef, AssertScopeFuncDefs } from "./interface/IAssertInst";
import { IScopeFn, IScopePropFn } from "./interface/IScopeFuncs";
import { _addAssertInstFuncs } from "./internal/_addAssertInstFuncs";
import { _getAssertProto } from "./internal/_AssertInstCore";
import { MsgSource } from "./interface/types";

/**
 * Adds a set of scope functions to the assert (instance) prototype which
 * will extend (or replace) {@link IAssertInst} definition, you can then use the
 * {@link IExtendedAssertInst} type to cast the instance object returned via
 * the {@link expect} function as it will contain the newly added functions.
 *
 * Note: These functions are NOT added to the {@link assert} or the instance
 * returned via the {@link createAssert} only the {@link IAssertInst} object returned
 * via the {@link expect} function.
 * - Use the {@link addAssertFunc} or {@link addAssertFuncs} to add functions to the
 * {@link IAssertClass} and instances returned via {@link createAssert}.
 * @param funcs - The map of functions to add to the prototype.
 * @example
 * ```typescript
 * addAssertInstFuncDefs({
 *   myFunc: {
 *      scopeFn: function myFunc(this: IAssertScope) {
 *         // Do something
 *     }
 *  }
 * });
 *
 * interface MyExpect extends IAssertInst {
 *   myFunc(): void;
 * }
 *
 * let inst = expect("hello");
 * let extInst = inst as IExtendedAssertInst<MyExpect>;
 * extInst.myFunc();
 * ```
 * @group Expect
 * @since 0.1.0
 */
export function addAssertInstFuncDefs<T>(funcs: AssertScopeFuncDefs<T>) {
    _addAssertInstFuncs(_getAssertProto(), funcs, true);
}

/**
 * Adds a single scope function to the assert (instance) prototype, which will
 * extend (or replace) {@link IAssertInst} definition, you can then use the
 * {@link IExtendedAssertInst} type to cast the instance object returned via
 * the {@link expect} function as it will contain the newly added function.
 *
 * Note: These functions are NOT added to the {@link assert} or the instance
 * returned via the {@link createAssert} only the {@link IAssertInst} object returned
 * via the {@link expect} function.
 * - Use the {@link addAssertFunc} or {@link addAssertFuncs} to add functions to the
 * {@link IAssertClass} and instances returned via {@link createAssert}.
 * @param name - The name of the function to add.
 * @param func - The function to add.
 * @example
 * ```typescript
 * addAssertInstFunc("myFunc", function myFunc(this: IAssertScope) {
 *   // Do something
 * });
 *
 * interface MyExpect extends IAssertInst {
 *  myFunc(): void;
 * }
 *
 * let inst = expect("hello");
 * let extInst = inst as IExtendedAssertInst<MyExpect>;
 * extInst.myFunc();
 * ```
 * @group Expect
 * @since 0.1.0
 */
export function addAssertInstFunc<T>(name: keyof T, func: IScopeFn) {
    _addAssertInstFuncs(_getAssertProto(), {
        [name]: {
            scopeFn: func
        }
    }, true);
}

/**
 * Adds a single scope property function to the assert (instance) prototype, which will
 * extend (or replace) {@link IAssertInst} definition, you can then use the
 * {@link IExtendedAssertInst} type to cast the instance object returned via
 * the {@link expect} function as it will contain the newly added function.
 *
 * Note: These properties are NOT added to the {@link assert} or the instance
 * returned via the {@link createAssert} only the {@link IAssertInst} object returned
 * via the {@link expect} function.
 * @param name - The name of the property to add.
 * @param func - The function to add.
 * @param evalMsg - An optional message to use for the evaluation.
 * @example
 * ```typescript
 * addAssertInstProperty("myProp", function myProp(this: IAssertScope) {
 *   // Do something when the property is accessed
 *   this.context.eval(this.context.value === "darkness", "expected {value} to be 'darkness'");
 * });
 *
 * interface MyExpect extends IAssertInst {
 *   myProp: void;
 * }
 *
 * let inst = expect("hello");
 * let extInst = inst as IExtendedAssertInst<MyExpect>;
 * extInst.myProp;          // throws AssertionFailure
 * ```
 * @group Expect
 * @since 0.1.0
 */
export function addAssertInstProperty<T>(name: keyof T, func: IScopePropFn, evalMsg?: MsgSource) {
    _addAssertInstFuncs(_getAssertProto(), {
        [name]: {
            propFn: func,
            evalMsg: evalMsg
        }
    }, true);
}

/**
 * Adds a single scope function or property to the assert (instance) prototype, which will
 * extend (or replace) {@link IAssertInst} definition, you can then use the
 * {@link IExtendedAssertInst} type to cast the instance object returned via the {@link expect}
 * function as it will contain the newly added function or property.
 *
 * Note: This function/property is NOT added to the {@link assert} or the instance returned
 * via the {@link createAssert} only the {@link IAssertInst} object returned via the {@link expect}
 * function.
 * @param name - The name of the function to add.
 * @param funcDef - The function to add.
 * @example
 * ```typescript
 * addAssertInstFuncDef("myFunc", {
 *    scopeFn: function myFunc(this: IAssertScope) {
 *       // Do something
 *   }
 * });
 *
 * addAssertInstFuncDef("myProp", {
 *   propFn: function myProp(this: IAssertScope) {
 *    // Do something when the property is accessed
 *   this.context.eval(this.context.value === "darkness", "expected {value} to be 'darkness'");
 *  }
 * });
 *
 * interface MyExpect extends IAssertInst {
 *    myFunc(): void;
 *    myProp: void;
 * }
 *
 * let inst = expect("hello");
 * let extInst = inst as IExtendedAssertInst<MyExpect>;
 * extInst.myFunc();
 * extInst.myProp;          // throws AssertionFailure
 * ```
 * @group Expect
 * @since 0.1.0
 */
export function addAssertInstFuncDef<T>(name: keyof T, funcDef: IAssertScopeFuncDef) {
    _addAssertInstFuncs(_getAssertProto(), {
        [name]: funcDef
    }, true);
}
