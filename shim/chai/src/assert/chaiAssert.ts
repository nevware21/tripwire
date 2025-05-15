/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { AssertionFailure, addAssertFuncs, IAssertScope, AssertClassDef, createExprAdapter, getScopeContext } from "@nevware21/tripwire";
import { IChaiAssert } from "./interfaces/IChaiAssert";
import { chaiFailFunc } from "./funcs/chaiFailFunc";
import { isFunction } from "@nevware21/ts-utils";

export const chaiAssert: IChaiAssert = _createChaiAssert();

/**
 * @internal
 * @ignore
 * Internal function which throws an error indicating that a function is not yet implemented.
 */
function notImplemented(this: IAssertScope): void {
    this.fatal("Not implemented");
}

/**
 * @internal
 * @ignore
 * Internal type which ensures that we don't forget to add a defined function to the
 * `Assert` "class" (function).
 */
type ChaiAssertClassFuncs = {
    readonly [key in keyof IChaiAssert extends string | number | symbol ? keyof IChaiAssert : never]: AssertClassDef
};

/**
 * @internal
 * @ignore
 * Add the default assert functions to the `Assert` "class" (function)
 */
function _createChaiAssert(): IChaiAssert {

    function chaiAssert(expression: any, message?: string) {
        if (!expression) {
            throw new AssertionFailure((isFunction(message) ? message() : message) || "Assertion failed");
        }
    }

    /**
     * @internal
     * @ignore
     * Add the default instance functions
     */
    const chaiAssertFuncs: ChaiAssertClassFuncs = {
        fail: { scopeFn: chaiFailFunc, nArgs: 0 },
        isOk: "is.ok",
        ok: "is.ok",
        isNotOk: "is.not.ok",
        notOk: "is.not.ok",
        equal: { scopeFn: createExprAdapter("equal"), nArgs: 2 },
        equals: { scopeFn: createExprAdapter("equal"), nArgs: 2 },
        eq: { scopeFn: createExprAdapter("equal"), nArgs: 2 },
        notEqual: { scopeFn: createExprAdapter("not.equal"), nArgs: 2 },
        strictEqual: { scopeFn: createExprAdapter("strictly.equal"), nArgs: 2 },
        notStrictEqual: { scopeFn: createExprAdapter("not.strictly.equal"), nArgs: 2 },
        deepEqual: { scopeFn: createExprAdapter("deep.equal"), nArgs: 2 },
        notDeepEqual: { scopeFn: createExprAdapter("not.deep.equal"), nArgs: 2 },
        deepStrictEqual: { scopeFn: createExprAdapter("deep.equal"), nArgs: 2 },

        isAbove: notImplemented,
        isAtLeast: notImplemented,
        isBelow: notImplemented,
        isAtMost: notImplemented,
        isIterable: "is.iterable",
        isTrue: "is.strictly.true",
        isFalse: "is.strictly.false",
        isNotTrue: "is.strictly.not.true",
        isNotFalse: "is.strictly.not.false",
        isNull: "is.null",
        isNotNull: "is.not.null",
        isNaN: notImplemented,
        isNotNaN: notImplemented,

        exists: notImplemented,
        notExists: notImplemented,
        isUndefined: "is.undefined",
        isDefined: "is.not.undefined",
        isFunction: "is.function",
        isNotFunction: "is.not.function",
        isCallable: "is.function",
        isNotCallable: "is.not.function",
        isObject: "is.object",
        isNotObject: "is.not.object",
        isArray: "is.array",
        isNotArray: "is.not.array",
        isString: "is.string",
        isNotString: "is.not.string",
        isNumber: "is.number",
        isNotNumber: "is.not.number",
        isFinite: notImplemented,
        isBoolean: "is.boolean",
        isNotBoolean: "is.not.boolean",
        typeOf: notImplemented,
        notTypeOf: notImplemented,
        instanceOf: notImplemented,
        notInstanceOf: notImplemented,
        include: { scopeFn: createExprAdapter("include"), nArgs: 2 },
        notInclude: { scopeFn: createExprAdapter("not.include"), nArgs: 2 },
        deepInclude: { scopeFn: createExprAdapter("deep.include"), nArgs: 2 },
        notDeepInclude: { scopeFn: createExprAdapter("not.deep.include"), nArgs: 2 },
        nestedInclude: notImplemented,
        notNestedInclude: notImplemented,
        deepNestedInclude: notImplemented,
        notDeepNestedInclude: notImplemented,
        ownInclude: notImplemented, //{ scopeFn: createExprAdapter("own.include"), nArgs: 2 },
        notOwnInclude: notImplemented, //{ scopeFn: createExprAdapter("not.own.include"), nArgs: 2 },
        deepOwnInclude: notImplemented, //{ scopeFn: createExprAdapter("deep.own.include"), nArgs: 2 },
        notDeepOwnInclude: notImplemented, //{ scopeFn: createExprAdapter("not.deep.own.include"), nArgs: 2 },
        match: { scopeFn: createExprAdapter("match"), nArgs: 2 },
        notMatch: { scopeFn: createExprAdapter("not.match"), nArgs: 2 },
        property: { scopeFn: createExprAdapter("has.property"), nArgs: 2 },
        ownProperty: { scopeFn: createExprAdapter("has.own.property"), nArgs: 2 },
        notProperty: { scopeFn: createExprAdapter("not.has.property"), nArgs: 2 },
        notOwnProperty: { scopeFn: createExprAdapter("not.has.own.property"), nArgs: 2 },
        deepProperty: { scopeFn: createExprAdapter("has.deep.property"), nArgs: 2 },
        notDeepProperty: { scopeFn: createExprAdapter("not.has.deep.property"), nArgs: 2 },

        propertyVal: notImplemented,
        ownPropertyVal: notImplemented,
        notPropertyVal: notImplemented,
        notOwnPropertyVal: notImplemented,
        deepPropertyVal: notImplemented,
        deepOwnPropertyVal: notImplemented,
        notDeepPropertyVal: notImplemented,
        notDeepOwnPropertyVal: notImplemented,

        lengthOf: notImplemented,
        throw: { scopeFn: createExprAdapter("throws"), nArgs: 3 },
        throws: { scopeFn: createExprAdapter("throws"), nArgs: 3 },
        Throw: { scopeFn: createExprAdapter("throws"), nArgs: 3 },
        doesNotThrow: { scopeFn: createExprAdapter("not.throws"), nArgs: 3 },
        operator: notImplemented,
        closeTo: notImplemented,
        approximately: notImplemented,

        sameMembers: notImplemented,
        notSameMembers: notImplemented,
        sameDeepMembers: notImplemented,
        notSameDeepMembers: notImplemented,
        sameOrderedMembers: notImplemented,
        notSameOrderedMembers: notImplemented,
        sameDeepOrderedMembers: notImplemented,
        notSameDeepOrderedMembers: notImplemented,

        includeOrderedMembers: notImplemented,
        notIncludeOrderedMembers: notImplemented,
        includeDeepOrderedMembers: notImplemented,
        notIncludeDeepOrderedMembers: notImplemented,

        includeMembers: { scopeFn: createExprAdapter("includes.all"), nArgs: 2 },
        notIncludeMembers: { scopeFn: createExprAdapter("not.includes.all"), nArgs: 2 },

        includeDeepMembers: notImplemented,
        notIncludeDeepMembers: notImplemented,

        oneOf: notImplemented,
        changes: notImplemented,
        changesBy: notImplemented,

        doesNotChange: notImplemented,
        changesButNotBy: notImplemented,
        
        increases: notImplemented,
        increasesBy: notImplemented,
        doesNotIncrease: notImplemented,
        increasesButNotBy: notImplemented,

        decreases: notImplemented,
        decreasesBy: notImplemented,
        doesNotDecrease: notImplemented,
        doesNotDecreaseBy: notImplemented,
        decreasesButNotBy: notImplemented,

        ifError: notImplemented,
        isExtensible: "is.extensible",
        extensible: "is.extensible",
        isNotExtensible: "is.not.extensible",
        notExtensible: "is.not.extensible",

        isSealed: "is.sealed",
        sealed: "is.sealed",
        isNotSealed: "is.not.sealed",
        notSealed: "is.not.sealed",

        isFrozen: "is.frozen",
        frozen: "is.frozen",
        isNotFrozen: "is.not.frozen",
        notFrozen: "is.not.frozen",

        isEmpty: "is.empty",
        empty: "is.empty",
        isNotEmpty: "is.not.empty",
        notEmpty: "is.not.empty",

        hasAnyKeys: { scopeFn: createExprAdapter("has.any.keys"), nArgs: 2 },
        hasAllKeys: { scopeFn: createExprAdapter("has.all.keys"), nArgs: 2 },
        containsAllKeys: { scopeFn: createExprAdapter("contains.all.keys"), nArgs: 2 },

        doesNotHaveAnyKeys: { scopeFn: createExprAdapter("not.has.any.keys"), nArgs: 2 },
        doesNotHaveAllKeys: { scopeFn: createExprAdapter("not.has.all.keys"), nArgs: 2 },

        hasAnyDeepKeys: notImplemented,
        hasAllDeepKeys: notImplemented,
        containsAllDeepKeys: notImplemented,
        doesNotHaveAnyDeepKeys: notImplemented,
        doesNotHaveAllDeepKeys: notImplemented,

        nestedProperty: notImplemented,
        notNestedProperty: notImplemented,
        nestedPropertyVal: notImplemented,
        notNestedPropertyVal: notImplemented,
        deepNestedPropertyVal: notImplemented,
        notDeepNestedPropertyVal: notImplemented
    };

    function chaiResponseHandler(response: any) {
        return getScopeContext(response).value;
    }

    addAssertFuncs(chaiAssert, chaiAssertFuncs, chaiResponseHandler);

    return chaiAssert as IChaiAssert;
}
