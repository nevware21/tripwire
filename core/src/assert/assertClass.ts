/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrSlice, dumpObj, fnApply, getDeferred, getLength, ICachedValue, isArray, isFunction, isNullOrUndefined, isString,
    isUndefined, objAssign, objDefine, objForEachKey, strStartsWith,
    strSubstring
} from "@nevware21/ts-utils";
import { IPromise } from "@nevware21/ts-async";
import { IAssertClass } from "./interface/IAssertClass";
import { IAssertInst } from "./interface/IAssertInst";
import { MsgSource } from "./type/MsgSource";
import { isBooleanFunc, isFunctionFunc, isNumberFunc, isNullFunc, isObjectFunc, isPlainObjectFunc, isStrictFalseFunc, isStrictTrueFunc, isUndefinedFunc } from "./funcs/is";
import { isEmptyFunc } from "./funcs/isEmpty";
import { IAssertClassDef } from "./interface/IAssertClassDef";
import { matchFunc } from "./funcs/match";
import { isErrorFunc, throwsFunc } from "./funcs/throws";
import { hasPropertyFunc, hasOwnPropertyFunc, hasDeepPropertyFunc, hasDeepOwnPropertyFunc } from "./funcs/hasProperty";
import { hasNestedPropertyFunc, hasDeepNestedPropertyFunc, nestedIncludeFunc, deepNestedIncludeFunc } from "./funcs/nested";
import { AssertionError, AssertionFailure } from "./assertionError";
import { createContext } from "./scopeContext";
import { createAssertScope } from "./assertScope";
import { IScopeFn } from "./interface/IScopeFuncs";
import { createExprAdapter } from "./adapters/exprAdapter";
import { createNotAdapter } from "./adapters/notAdapter";
import { isSealedFunc } from "./funcs/isSealed";
import { isFrozenFunc } from "./funcs/isFrozen";
import { isExtensibleFunc } from "./funcs/isExtensible";
import { isIterableFunc } from "./funcs/isIterable";
import { deepEqualsFunc, deepStrictEqualsFunc, equalsFunc, strictEqualsFunc } from "./funcs/equal";
import { aboveFunc, belowFunc, leastFunc, mostFunc, withinFunc } from "./ops/numericOp";
import { typeOfFunc } from "./funcs/typeOf";
import { instanceOfFunc } from "./funcs/instanceOf";
import { lengthFunc } from "./funcs/length";
import { closeToFunc } from "./funcs/closeTo";
import { oneOfFunc } from "./funcs/oneOf";
import { operatorFunc } from "./funcs/operator";
import {
    includeMembersFunc, includeDeepMembersFunc, includeOrderedMembersFunc, includeDeepOrderedMembersFunc,
    sameMembersFunc, sameDeepMembersFunc, sameOrderedMembersFunc, sameDeepOrderedMembersFunc, startsWithMembersFunc,
    startsWithDeepMembersFunc, endsWithMembersFunc, endsWithDeepMembersFunc, subsequenceFunc, deepSubsequenceFunc
} from "./funcs/members";
import { changesFunc, increasesFunc, decreasesFunc } from "./funcs/changes";
import { changesByFunc, increasesByFunc, decreasesByFunc, changesButNotByFunc, increasesButNotByFunc, decreasesButNotByFunc } from "./funcs/changesBy";
import { ifErrorFunc } from "./funcs/ifError";

/**
 * @internal
 * @ignore
 * Used to ensure that even for alias functions the callers "expected" function
 * will be listed as the entrypoint for the stack trace.
 * Relies on the fact that the alias function will call the actual function
 * and that JavaScript is inherently single-threaded.
 */
let _aliasStackStart: Function = null;

/**
 * @internal
 * @ignore
 * Internal type which ensures that we don't forget to add a defined function to the
 * `Assert` "class" (function).
 */
type OmitAssertClassFuncs = Omit<IAssertClass, "_$lastContext">;

/**
 * @internal
 * @ignore
 * Internal type which ensures that we don't forget to add a defined function to the
 * `Assert` "class" (function).
 */
type AssertClassFuncs = {
   readonly [key in keyof OmitAssertClassFuncs extends string | number | symbol ? keyof OmitAssertClassFuncs : never]: AssertClassDef
};

/**
 * Identifies the assertion definition or a {@link IScopeFn} function
 * that can be called on the current scoped instance.
 */
export type AssertClassDef = IAssertClassDef | IScopeFn | string | string[];

/**
 * A singleton instance of the {@link IAssertClass} interface that can be used to perform various
 * assertions, the functions check the provided expression and throw an {@link AssertionFailure}
 * if the expression is false.
 *
 * The `assert` contains a number of functions that can be used to perform various assertions, like
 * checking if a value is `true`, `false`, `null`, `undefined`, `empty`, `equal`, `strictly equal`,
 * `deep equal`, etc.
 *
 * The `assert` object is also a function that can be called directly with the following parameters:
 * @param expr - The expression to evaluate.
 * @param initMsg - The message to display if the assertion fails. This can be a string or a function that returns a string.
 * @throws An {@link AssertionFailure} if the expression is false.
 * @example
 * ```typescript
 * import { assert } from "@nevware21/tripwire";
 *
 * assert(1 === 1);
 * assert(true, "This is true");
 * assert(false, "This is false");
 * assert.equal(1, 1);
 * assert.isTrue(true);
 * assert.isFalse(false);
 * assert.isNull(null);
 * assert.isUndefined(undefined);
 * assert.isEmpty([]);
 * ```
 * @group Entrypoint
 * @group Assert
 * @since 0.1.0
 */
export let assert: IAssertClass = createAssert();

/**
 * Creates and returns a new instance of the {@link IAssertClass} interface that can be used to perform various
 * assertions, the functions check the provided expression and throw an {@link AssertionFailure}
 * if the expression is false.
 * @returns A new instance of the {@link IAssertClass} interface.
 * @example
 * ```typescript
 * import { createAssert } from "@nevware21/tripwire";
 *
 * const assert = createAssert();
 *
 * assert(1 === 1);
 * assert(true, "This is true");
 * assert(false, "This is false");
 * assert.equal(1, 1);
 * assert.isTrue(true);
 * assert.isFalse(false);
 * assert.isNull(null);
 * assert.isUndefined(undefined);
 * ```
 * @group Assert
 * @since 0.1.0
 */
export function createAssert(): IAssertClass {
    function assert(expr: boolean, initMsg?: MsgSource) {
        if (!expr) {
            throw new AssertionFailure((isFunction(initMsg) ? initMsg() : initMsg) || "Assertion failed");
        }
    }

    /**
     * @internal
     * @ignore
     * Add the default class functions
     */
    const assertFuncs: AssertClassFuncs = {
        fail: { scopeFn: createExprAdapter("fail"), nArgs: 0 },             // No `actual` value is passed to this function
        fatal: { scopeFn: createExprAdapter("fatal"), nArgs: 0 },           // No `actual` value is passed to this function

        isOk: "ok",                                                         // The `isOk` function is an alias for `truthy`
        ok: "ok",                                                           // The `ok` function is an alias for `truthy`

        isNotOk: "not.ok",                                                  // The `isNotOk` function is an alias for `not.truthy`

        equal: { scopeFn: equalsFunc, nArgs: 2 },
        equals: { alias: "equal" },
        strictEqual: { scopeFn: strictEqualsFunc, nArgs: 2 },
        strictEquals: { alias: "strictEqual" },
        notStrictEqual: { scopeFn: createNotAdapter(strictEqualsFunc), nArgs: 2 },
        deepEqual: { scopeFn: deepEqualsFunc, nArgs: 2 },
        deepEquals: { alias: "deepEqual" },
        deepStrictEqual: { scopeFn: deepStrictEqualsFunc, nArgs: 2 },
        deepStrictEquals: { alias: "deepStrictEqual" },

        notEqual: { scopeFn: createNotAdapter(equalsFunc), nArgs: 2 },
        notEquals: { alias: "notEqual" },
        notDeepEqual: { scopeFn: createNotAdapter(deepEqualsFunc), nArgs: 2 },
        notDeepEquals: { alias: "notDeepEqual" },

        isTrue: isStrictTrueFunc,
        isFalse: isStrictFalseFunc,
        isNotTrue: createNotAdapter(isStrictTrueFunc),
        isNotFalse: createNotAdapter(isStrictFalseFunc),

        isNull: isNullFunc,
        isNotNull: createNotAdapter(isNullFunc),

        isUndefined: isUndefinedFunc,
        isNotUndefined: createNotAdapter(isUndefinedFunc),

        isEmpty: isEmptyFunc,
        isNotEmpty: createNotAdapter(isEmptyFunc),

        isSealed: isSealedFunc,
        isNotSealed: createNotAdapter(isSealedFunc),

        isFrozen: isFrozenFunc,
        isNotFrozen: createNotAdapter(isFrozenFunc),

        isFunction: isFunctionFunc,
        isNotFunction: createNotAdapter(isFunctionFunc),

        isObject: isObjectFunc,
        isNotObject: createNotAdapter(isObjectFunc),

        isPlainObject: isPlainObjectFunc,
        isNotPlainObject: createNotAdapter(isPlainObjectFunc),

        includes: { scopeFn: createExprAdapter("includes"), nArgs: 2 },     // The `includes` function is an alias for `hasProperty`

        isError: { scopeFn: isErrorFunc, nArgs: 2 },

        isString: createExprAdapter("is.string"),
        isNotString: createExprAdapter("not.is.string"),

        isArray: createExprAdapter("is.array"),
        isNotArray: createExprAdapter("not.is.array"),

        isNumber: isNumberFunc,
        isNotNumber: createExprAdapter("not.is.number"),

        isBoolean: isBooleanFunc,
        isNotBoolean: createExprAdapter("not.is.boolean"),

        isExtensible: isExtensibleFunc,
        isNotExtensible: createNotAdapter(isExtensibleFunc),

        isIterable: isIterableFunc,
        isNotIterable: createNotAdapter(isIterableFunc),

        isNaN: createExprAdapter("is.nan"),
        isNotNaN: createExprAdapter("not.is.nan"),

        typeOf: { scopeFn: typeOfFunc, nArgs: 2 },
        notTypeOf: { scopeFn: createNotAdapter(typeOfFunc), nArgs: 2 },


        isFinite: createExprAdapter("is.finite"),
        isNotFinite: createExprAdapter("not.is.finite"),

        exists: createExprAdapter("to.exist"),
        notExists: createExprAdapter("not.to.exist"),

        ifError: { scopeFn: ifErrorFunc, nArgs: 1 },

        isInstanceOf: { scopeFn: instanceOfFunc, nArgs: 2 },
        isNotInstanceOf: { scopeFn: createNotAdapter(instanceOfFunc), nArgs: 2 },

        throws: { scopeFn: throwsFunc, nArgs: 3 },
        doesNotThrow: { scopeFn: createNotAdapter(throwsFunc), nArgs: 3 },

        match: { scopeFn: matchFunc, nArgs: 2 },
        notMatch: { scopeFn: createNotAdapter(matchFunc), nArgs: 2 },

        hasProperty: { scopeFn: hasPropertyFunc, nArgs: 3 },
        hasOwnProperty: { scopeFn: hasOwnPropertyFunc, nArgs: 3 },
        notHasProperty: { scopeFn: createNotAdapter(hasPropertyFunc), nArgs: 3 },
        notHasOwnProperty: { scopeFn: createNotAdapter(hasOwnPropertyFunc), nArgs: 3 },
        hasDeepProperty: { scopeFn: hasDeepPropertyFunc, nArgs: 3 },
        notHasDeepProperty: { scopeFn: createNotAdapter(hasDeepPropertyFunc), nArgs: 3 },
        hasDeepOwnProperty: { scopeFn: hasDeepOwnPropertyFunc, nArgs: 3 },
        notHasDeepOwnProperty: { scopeFn: createNotAdapter(hasDeepOwnPropertyFunc), nArgs: 3 },

        // Nested property operations
        nestedProperty: { scopeFn: hasNestedPropertyFunc, nArgs: 3 },
        notNestedProperty: { scopeFn: createNotAdapter(hasNestedPropertyFunc), nArgs: 3 },
        deepNestedProperty: { scopeFn: hasDeepNestedPropertyFunc, nArgs: 3 },
        notDeepNestedProperty: { scopeFn: createNotAdapter(hasDeepNestedPropertyFunc), nArgs: 3 },
        nestedInclude: { scopeFn: nestedIncludeFunc, nArgs: 2 },
        notNestedInclude: { scopeFn: createNotAdapter(nestedIncludeFunc), nArgs: 2 },
        deepNestedInclude: { scopeFn: deepNestedIncludeFunc, nArgs: 2 },
        notDeepNestedInclude: { scopeFn: createNotAdapter(deepNestedIncludeFunc), nArgs: 2 },

        // Own include operations (checks only own properties, not inherited)
        ownInclude: { scopeFn: createExprAdapter("own.include"), nArgs: 2 },
        notOwnInclude: { scopeFn: createExprAdapter("not.own.include"), nArgs: 2 },
        deepOwnInclude: { scopeFn: createExprAdapter("deep.own.include"), nArgs: 2 },
        notDeepOwnInclude: { scopeFn: createExprAdapter("not.deep.own.include"), nArgs: 2 },

        // Numeric comparison operations
        isAbove: { scopeFn: aboveFunc, nArgs: 2 },
        isNotAbove: { scopeFn: createNotAdapter(aboveFunc), nArgs: 2 },
        isAtLeast: { scopeFn: leastFunc, nArgs: 2 },
        isNotAtLeast: { scopeFn: createNotAdapter(leastFunc), nArgs: 2 },
        isBelow: { scopeFn: belowFunc, nArgs: 2 },
        isNotBelow: { scopeFn: createNotAdapter(belowFunc), nArgs: 2 },
        isAtMost: { scopeFn: mostFunc, nArgs: 2 },
        isNotAtMost: { scopeFn: createNotAdapter(mostFunc), nArgs: 2 },
        isWithin: { scopeFn: withinFunc, nArgs: 3 },
        isNotWithin: { scopeFn: createNotAdapter(withinFunc), nArgs: 3 },

        // Length checking
        lengthOf: { scopeFn: lengthFunc, nArgs: 2 },
        notLengthOf: { scopeFn: createNotAdapter(lengthFunc), nArgs: 2 },
        sizeOf: { alias: "lengthOf" },
        notSizeOf: { alias: "notLengthOf" },

        // Approximate equality (closeTo)
        closeTo: { scopeFn: closeToFunc, nArgs: 3 },
        notCloseTo: { scopeFn: createNotAdapter(closeToFunc), nArgs: 3 },
        approximately: { alias: "closeTo" },
        notApproximately: { alias: "notCloseTo" },

        // Change/increase/decrease detection
        changes: { scopeFn: changesFunc, nArgs: 3 },
        doesNotChange: { scopeFn: createNotAdapter(changesFunc), nArgs: 3 },
        changesBy: { scopeFn: changesByFunc, nArgs: 4 },
        notChangesBy: { scopeFn: createNotAdapter(changesByFunc), nArgs: 4 },
        changesButNotBy: { scopeFn: changesButNotByFunc, nArgs: 4 },
        increases: { scopeFn: increasesFunc, nArgs: 3 },
        doesNotIncrease: { scopeFn: createNotAdapter(increasesFunc), nArgs: 3 },
        increasesBy: { scopeFn: increasesByFunc, nArgs: 4 },
        notIncreasesBy: { scopeFn: createNotAdapter(increasesByFunc), nArgs: 4 },
        increasesButNotBy: { scopeFn: increasesButNotByFunc, nArgs: 4 },
        decreases: { scopeFn: decreasesFunc, nArgs: 3 },
        doesNotDecrease: { scopeFn: createNotAdapter(decreasesFunc), nArgs: 3 },
        decreasesBy: { scopeFn: decreasesByFunc, nArgs: 4 },
        notDecreasesBy: { scopeFn: createNotAdapter(decreasesByFunc), nArgs: 4 },
        decreasesButNotBy: { scopeFn: decreasesButNotByFunc, nArgs: 4 },

        // Value membership (oneOf)
        oneOf: { scopeFn: oneOfFunc, nArgs: 2 },
        notOneOf: { scopeFn: createNotAdapter(oneOfFunc), nArgs: 2 },

        // Operator comparison
        operator: { scopeFn: operatorFunc, nArgs: 3 },

        // Member comparison
        sameMembers: { scopeFn: sameMembersFunc, nArgs: 2 },
        notSameMembers: { scopeFn: createNotAdapter(sameMembersFunc), nArgs: 2 },
        sameDeepMembers: { scopeFn: sameDeepMembersFunc, nArgs: 2 },
        notSameDeepMembers: { scopeFn: createNotAdapter(sameDeepMembersFunc), nArgs: 2 },
        sameOrderedMembers: { scopeFn: sameOrderedMembersFunc, nArgs: 2 },
        notSameOrderedMembers: { scopeFn: createNotAdapter(sameOrderedMembersFunc), nArgs: 2 },
        sameDeepOrderedMembers: { scopeFn: sameDeepOrderedMembersFunc, nArgs: 2 },
        notSameDeepOrderedMembers: { scopeFn: createNotAdapter(sameDeepOrderedMembersFunc), nArgs: 2 },
        includeMembers: { scopeFn: includeMembersFunc, nArgs: 2 },
        notIncludeMembers: { scopeFn: createNotAdapter(includeMembersFunc), nArgs: 2 },
        includeDeepMembers: { scopeFn: includeDeepMembersFunc, nArgs: 2 },
        notIncludeDeepMembers: { scopeFn: createNotAdapter(includeDeepMembersFunc), nArgs: 2 },
        includeOrderedMembers: { scopeFn: includeOrderedMembersFunc, nArgs: 2 },
        notIncludeOrderedMembers: { scopeFn: createNotAdapter(includeOrderedMembersFunc), nArgs: 2 },
        includeDeepOrderedMembers: { scopeFn: includeDeepOrderedMembersFunc, nArgs: 2 },
        notIncludeDeepOrderedMembers: { scopeFn: createNotAdapter(includeDeepOrderedMembersFunc), nArgs: 2 },
        startsWithMembers: { scopeFn: startsWithMembersFunc, nArgs: 2 },
        notStartsWithMembers: { scopeFn: createNotAdapter(startsWithMembersFunc), nArgs: 2 },
        startsWithDeepMembers: { scopeFn: startsWithDeepMembersFunc, nArgs: 2 },
        notStartsWithDeepMembers: { scopeFn: createNotAdapter(startsWithDeepMembersFunc), nArgs: 2 },
        endsWithMembers: { scopeFn: endsWithMembersFunc, nArgs: 2 },
        notEndsWithMembers: { scopeFn: createNotAdapter(endsWithMembersFunc), nArgs: 2 },
        endsWithDeepMembers: { scopeFn: endsWithDeepMembersFunc, nArgs: 2 },
        notEndsWithDeepMembers: { scopeFn: createNotAdapter(endsWithDeepMembersFunc), nArgs: 2 },
        subsequence: { scopeFn: subsequenceFunc, nArgs: 2 },
        notSubsequence: { scopeFn: createNotAdapter(subsequenceFunc), nArgs: 2 },
        deepSubsequence: { scopeFn: deepSubsequenceFunc, nArgs: 2 },
        notDeepSubsequence: { scopeFn: createNotAdapter(deepSubsequenceFunc), nArgs: 2 },

        // Keys operations (non-deep, uses strict equality)
        hasAnyKeys: { scopeFn: createExprAdapter("has.any.keys"), nArgs: 2 },
        hasAllKeys: { scopeFn: createExprAdapter("has.all.keys"), nArgs: 2 },
        doesNotHaveAnyKeys: { scopeFn: createExprAdapter("not.has.any.keys"), nArgs: 2 },
        doesNotHaveAllKeys: { scopeFn: createExprAdapter("not.has.all.keys"), nArgs: 2 },

        // Deep keys operations
        hasAnyDeepKeys: { scopeFn: createExprAdapter("has.any.deep.keys"), nArgs: 2 },
        hasAllDeepKeys: { scopeFn: createExprAdapter("has.all.deep.keys"), nArgs: 2 },
        notHaveAnyDeepKeys: { scopeFn: createExprAdapter("not.has.any.deep.keys"), nArgs: 2 },
        doesNotHaveAnyDeepKeys: { alias: "notHaveAnyDeepKeys" },
        notHaveAllDeepKeys: { scopeFn: createExprAdapter("not.has.all.deep.keys"), nArgs: 2 },
        doesNotHaveAllDeepKeys: { alias: "notHaveAllDeepKeys" }
    };

    addAssertFuncs(assert, assertFuncs);

    return assert as IAssertClass;
}

/**
 * Adds a new assertion function to the `Assert` "class" (function).
 * @param name - The name of the function to add.
 * @param fnDef - The definition of the function to add, this can be a string (`is.object`),
 * an array of strings (`["is", "obejct"]`) which identify the sequence of operations to perform
 * or a {@link IScopeFn} function, or an {@link IAssertClassDef} object.
 * @throws An {@link AssertionError} if the definition is invalid.
 * @example
 * ```typescript
 * addAssertFunc("isPositive", (value) => this._context.eval(value > 0, "Expected a positive number"));
 *
 * assert.isPositive(1); // Passes
 * assert.isPositive(0); // Fails - throws an AssertionFailure
 * ```
 * @group Assert
 * @since 0.1.0
 */
export function addAssertFunc(target: any, name: string, fnDef: AssertClassDef, responseHandler?: (result: any) => any) {
    addAssertFuncs(target, {
        [name]: fnDef
    }, responseHandler);
}

/**
 * Adds multiple new assertion functions to the {@link assert} instance, it does not
 * add these functions to the {@link IAssertInst} "class" so they will be only available
 * by directly referencing the `assert` instance.
 *
 * This method allows you to add multiple assertion functions at once. Each function is defined by a name and a definition.
 * The definition can be a string, an array of strings, a function, or an object that implements the `IAssertDef` interface.
 *
 * @param target - The instance to add the functions to.
 * @param funcs - An object where the keys are the names of the functions to add, and the values are their definitions.
 * @throws An {@link AssertionError} if any of the definitions are invalid.
 * @example
 * ```typescript
 * addAssertFuncs({
 *     isPositive: (value) => this._context.eval(value > 0)
 *     isNegative: (value) => this._context.eval(value < 0),
 *     isArray: "is.array",
 *     isObject: ["is", "object"]
 * });
 *
 * assert.isPositive(1); // Passes
 * assert.isPositive(0); // Fails - throws an AssertionFailure
 * assert.isNegative(-1); // Passes
 * assert.isArray([]); // Passes
 * assert.isObject({}); // Passes
 * ```
 * @group Assert
 * @since 0.1.0
 */
export function addAssertFuncs(target: any, funcs: { [key: string]: AssertClassDef }, responseHandler?: (result: any) => any) {
    objForEachKey(funcs, (name, def: AssertClassDef) => {
        let theDef: IAssertClassDef;

        if (isFunction(def)) {
            theDef = {
                scopeFn: def
            };
        } else if (isArray<string>(def)) {
            if (isString(def[0]) && def.length > 0) {
                theDef = {
                    expr: def
                };
            }
        } else if (isString(def)) {
            theDef = {
                expr: def
            };
        } else {
            theDef = def;
        }

        // Sanity check to ensure we have a valid definition (must have at least one of the properties defined)
        if (!theDef || (!(isFunction(theDef.scopeFn) || isString(theDef.expr) || isArray<string>(theDef.expr) || theDef.alias))) {
            throw new AssertionError("Invalid definition for " + name + ": " + JSON.stringify(theDef), null, addAssertFuncs);
        }

        objDefine(target, name, {
            l: _createLazyInstHandler(target, name, theDef, addAssertFunc, responseHandler)
        });
    });
}

function _createLazyInstHandler(target: any, propName: string, argDef: IAssertClassDef, internalErrorStackStart: Function, responseHandler?: (result: any) => any): ICachedValue<(...args: any[]) => void | IAssertInst | IPromise<IAssertInst>> {
    return getDeferred(() => {
        // Clone the definition to avoid modifying the original as it "may" be reused
        let theDef: IAssertClassDef = objAssign({}, argDef);

        // See if we can simplify / eliminate the expression definition, if it's just a "not" prefix
        if (theDef.expr && isUndefined(theDef.not)) {
            if (isString(theDef.expr)) {
                if (theDef.expr === "not") {
                    theDef.not = true;
                    theDef.expr = null;
                } else if (getLength(theDef.expr) > 4 && strStartsWith(theDef.expr, "not.")) {
                    theDef.not = true;
                    theDef.expr = strSubstring(theDef.expr, 4);
                }
            } else if (theDef.expr[0] === "not") {
                theDef.not = true;
                theDef.expr = theDef.expr.length > 1 ? arrSlice(theDef.expr as string[], 1) : null;
            }
        }

        if (theDef.alias) {
            return _createAliasFunc(theDef.alias);
        }

        return _createProxyFunc(target, propName, theDef, internalErrorStackStart, responseHandler);
    });
}

function _extractInitMsg(theArgs: any[], numArgs?: number, mIdx?: number): string {
    // Extract the message if its present to be passed to the scope context
    let msg: string;
    if (!isUndefined(mIdx)) {
        if (mIdx >= 0) {
            // Positive index
            if (theArgs.length > mIdx) {
                msg = theArgs[mIdx];
                theArgs.splice(mIdx, 1);
            }
        } else {
            // Negative index
            let idx = theArgs.length + mIdx;
            if (idx >= 0 && idx < theArgs.length && numArgs >= 0 && numArgs < theArgs.length) {
                msg = theArgs[idx];
                theArgs.splice(idx, 1);
            }
        }
    }

    return msg;
}

function _createAliasFunc(alias: string) {
    return function _aliasProxyFunc(): IAssertInst | IPromise<IAssertInst> {
        let _this = this;
        let currentAliasStackStart = _aliasStackStart;

        try {
            _aliasStackStart = _aliasStackStart || _aliasProxyFunc;
            return fnApply(_this[alias as keyof IAssertInst], _this, arguments);
        } finally {
            // Restore previous alias stack start
            _aliasStackStart = currentAliasStackStart;
        }
    };
}

function _createProxyFunc(theAssert: IAssertClass, assertName: string, def: IAssertClassDef, internalErrorStackStart: Function, responseHandler: (result: any) => any): (...args: any[]) => void | IAssertInst | IPromise<IAssertInst> {
    // let steps: IStepDef[];
    let scopeFn: IScopeFn = def.scopeFn;
    let mIdx: number = def.mIdx || -1;
    let numArgs: number = isNullOrUndefined(def.nArgs) ? 1 : def.nArgs;

    if (def.expr && getLength(def.expr) > 0) {
        // Convert the expression into a scope function
        scopeFn = createExprAdapter(def.expr, scopeFn);
    }

    if (def.not) {
        // Wrap the function in a "not" adapter
        scopeFn = createNotAdapter(scopeFn);
    }

    if (!isFunction(scopeFn)) {
        throw new AssertionError("Invalid definition for " + assertName + ": " + dumpObj(def), null, internalErrorStackStart);
    }

    return function _assertFunc(): void | IAssertInst | IPromise<IAssertInst> {
        let theArgs = arrSlice(arguments, 0);
        let orgArgs = arrSlice(theArgs);

        // Extract the initial message from the passed arguments (if present)
        let initMsg = _extractInitMsg(theArgs, numArgs, mIdx);
        let scopeArgs: any[];

        // Extract the actual value from the arguments
        let actualValue: any;
        if (theArgs.length > 0 && numArgs > 0) {
            // Get the actual "value" from the first argument
            actualValue = theArgs[0];
            scopeArgs = arrSlice(theArgs, 1);
        }

        // Create the initial scope `expect(value, initMsg)` and run any defined steps
        // Using either the current alias entry point or the current function
        let newScope = createAssertScope(createContext(actualValue, initMsg, _aliasStackStart || _assertFunc, orgArgs));
        newScope.context._$stackFn.push(_aliasStackStart || _assertFunc);

        newScope.context.setOp(assertName + "()");

        objDefine(theAssert, "_$lastContext", {
            v: newScope.context
        });

        let theResult = newScope.exec(scopeFn, scopeArgs || theArgs, scopeFn.name || (scopeFn as any)["displayName"] || "anonymous") as void | IAssertInst | IPromise<IAssertInst>;

        return responseHandler ? responseHandler(theResult) : theResult;
    };
}
