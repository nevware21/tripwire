/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestSuite } from "./interfaces/ITestSuite";
import { _createContext } from "./context";
import { ISuiteStateContext } from "./interfaces/ISuiteStateContext";
import { fnCall, getGlobal, isNumber, isPromiseLike, objDefine } from "@nevware21/ts-utils";
import { doFinally, IPromise } from "@nevware21/ts-async";
import { _childOccurrence, _generateId, _resetIdGenerator } from "./idGenerator";
import { getCurrentHost } from "../config/configHost";
import { ISuiteContext } from "../interfaces/suite/ISuiteContext";
import { SuiteFn } from "../types/SuiteFn";
import { ISuiteDefinitionFn } from "../interfaces/suite/ISuiteDefinitionFn";

/**
 * @internal
 * @ignore
 * The browser/worker runner -- and, within this repo's own monorepo, the node-target CLI's
 * own describe/it/assert bootstrap -- can end up with two independently-loaded copies of this
 * module (one pre-built, one transpiled fresh from source for whatever a test file imports by
 * relative path), each with its own closure-scoped module state. A plain `let` here would give
 * each copy its own independent root suite, so a suite/test registered through one copy's
 * describe()/it() would be completely invisible to the other copy's test runner -- silently
 * dropping every test in that file from the run, not merely failing it. Storing the actual
 * state on a single, shared slot keyed off the real JS global object (the one thing every copy
 * of this module, however it got loaded, genuinely shares) makes every copy observe and
 * contribute to the same suite tree regardless of which one is asked. Mirrors the identical
 * problem/fix already applied to _configHost.ts's _gblSlot.
 */
const _gblSlotKey = "__nevware21_tripwire_suiteContextSlot__";

function _gblSlot(): { context?: ISuiteStateContext } {
    const g: any = getGlobal() || {};
    let slot: { context?: ISuiteStateContext } = g[_gblSlotKey];
    if (!slot) {
        slot = {};
        g[_gblSlotKey] = slot;
    }

    return slot;
}

function _getDefaultSuiteTimeout(): number {
    const cfg = getCurrentHost().opts.v;
    return isNumber(cfg.timeout) ? cfg.timeout : 2000;
}

function _getDefaultSuiteSlow(): number {
    const cfg = getCurrentHost().opts.v;
    return isNumber((cfg as any).slow) ? (cfg as any).slow : 75;
}

function _getDefaultSuiteRetries(): number {
    const cfg = getCurrentHost().opts.v;
    return isNumber((cfg as any).retries) ? (cfg as any).retries : 0;
}

function _getInheritedSuiteValue(suite: ITestSuite, key: "timeout" | "slow" | "retries"): number | undefined {
    let current: ITestSuite | undefined = suite;

    while (current) {
        const value = (current as any)[key];
        if (isNumber(value)) {
            return value;
        }

        current = current.parent;
    }

    return undefined;
}

/**
 * Create a new test suite
 * @internal
 */
function _createSuite(description: string, parent?: ITestSuite): ITestSuite {
    let testSuite: ITestSuite = {
        // The occurrence must be counted before the caller pushes this suite into the parent.
        id: _generateId(description, parent ? parent.id : undefined, _childOccurrence(parent, description)),
        description: description,
        parent: parent,
        suites: [],
        tests: [],
        beforeAllHooks: [],
        afterAllHooks: [],
        beforeEachHooks: [],
        afterEachHooks: [],
        only: false,
        skip: false,
        timeout: parent ? parent.timeout : undefined,
        slow: parent ? parent.slow : undefined,
        retries: parent ? parent.retries : undefined
    };

    return testSuite;
}

/**
 * Create a Mocha-like suite-definition runtime context for a specific suite.
 * @internal
 */
function _createSuiteRunContext(suite: ITestSuite): ISuiteContext {
    let context: ISuiteContext = {
        timeout: function(ms?: number): any {
            if (arguments.length > 0) {
                suite.timeout = ms;
                return this;
            }

            const value = _getInheritedSuiteValue(suite, "timeout");
            return isNumber(value) ? value : _getDefaultSuiteTimeout();
        },
        slow: function(ms?: number): any {
            if (arguments.length > 0) {
                suite.slow = ms;
                return this;
            }

            const value = _getInheritedSuiteValue(suite, "slow");
            return isNumber(value) ? value : _getDefaultSuiteSlow();
        },
        retries: function(count?: number): any {
            if (arguments.length > 0) {
                suite.retries = count;
                return this;
            }

            const value = _getInheritedSuiteValue(suite, "retries");
            return isNumber(value) ? value : _getDefaultSuiteRetries();
        }
    };

    objDefine(context, "server", {
        g: () => {
            let serverMgr = getCurrentHost().serverMgr;
            return serverMgr ? serverMgr.server : null;
        }
    });

    return context;
}

/**
 * @internal
 * Gets the current root suite context
 * @returns the current suite context
 */
function _getRootContext(): ISuiteStateContext {
    const slot = _gblSlot();
    if (!slot.context) {
        slot.context = _createContext();
    }

    return slot.context;
}

/**
 * @internal
 * Gets the current test suite, if one doesn't exist then it creates a root suite
 */
export function _getCurrentSuite(): ITestSuite {
    let context = _getRootContext();

    if (context.length === 0) {
        if (!context.root) {
            context.root = _createSuite("root");
        }

        context.add(context.root);
    }

    return context.current;
}

/**
 * Reset the current suite state
 * @since 0.2.0
 */
export function resetSuite() {
    _getRootContext().reset();
    _resetIdGenerator();
}

/**
 * Get the root suite
 * @since 0.2.0
 */
export function getRootSuite(): ITestSuite {
    let context = _getRootContext();
    let rootSuite = context.root;

    if (!rootSuite) {
        rootSuite = _createSuite("root");
        context.root = rootSuite;
    }

    return rootSuite;
}

/**
 * Create an isolated suite context for testing
 * @returns A new root suite that is isolated from the global suite
 * @since 0.2.0
 */
export function createSuite(): ITestSuite {
    // Every root has the same ID: a root has no parent and no siblings, so its occurrence is
    // always 0 and repeated createSuite() calls (eg. in a loop) each reproduce it. IDs below the
    // root are derived from the tree itself (see _childOccurrence), so nothing here needs to be
    // isolated from the ambient suite's ID sequence.
    return _createSuite("root");
}

/**
 * Temporarily use a different suite context
 * Useful for testing the suite module itself without polluting the global suite
 * @param suite - The suite to use as the temporary root
 * @param callback - Function to execute with the temporary suite context (can be sync or async)
 * @returns A promise if the callback is async, otherwise void
 * @since 0.2.0
 */
export function useSuite(suite: ITestSuite, callback: SuiteFn): void | IPromise<void> {
    const slot = _gblSlot();

    // Save current context
    const previousContext: ISuiteStateContext | undefined = slot.context;

    // Note: nothing about ID generation is saved or isolated here. An ID depends only on the
    // parent's ID, the description and the count of same-named siblings already under that parent
    // (see _childOccurrence), so declaring against this suite cannot disturb the ambient tree's
    // IDs, and two useSuite() calls against the *same* suite correctly continue its numbering
    // rather than each restarting from zero.

    // Set new context
    slot.context = _createContext();
    if (suite) {
        slot.context.add(suite);
        slot.context.root = suite;
    }

    const suiteCtx = _createSuiteRunContext(suite);

    try {
        const result = fnCall(callback, suiteCtx);
        if (isPromiseLike(result)) {
            return doFinally(result, function() {
                // Restore previous context
                slot.context = previousContext;
            }) as IPromise<void>;
        }
    } catch(e) {
        // terminal error occurred
        slot.context = previousContext;
        throw e;
    }

    // Synchronous callback - restore immediately
    slot.context = previousContext;
}

function _runSpec(suite: ITestSuite, callback: SuiteFn): void | IPromise<void> {
    let context = _getRootContext();
    let suiteCtx = _createSuiteRunContext(suite);
    let isAsync = false;

    context.add(suite);
    try {
        let result = fnCall(callback, suiteCtx);
        if (isPromiseLike(result)) {
            isAsync = true;
            // Removed by identity rather than popped: several asynchronous definitions can be pending at
            // once and settle in any order, so the suite on top of the stack when this one settles is
            // not necessarily this one. Popping it would close another definition's suite and leave this
            // suite current, so later declarations would be nested under it.
            return doFinally(result, function() {
                context.rm(suite);
            }) as IPromise<void>;
        }
    } finally {
        if (!isAsync) {
            context.rm(suite);
        }
    }
}

/**
 * Define a test suite (Mocha/Jasmine style)
 * @internal
 */
function _describeFn(description: string, specDefinitions: SuiteFn): void | IPromise<void> {
    const parent = _getCurrentSuite();
    const suite = _createSuite(description, parent);
    parent.suites.push(suite);

    return _runSpec(suite, specDefinitions);
}

/**
 * Define a test suite that should be the only one to run
 */
_describeFn.only = function (description: string, specDefinitions: SuiteFn): void | IPromise<void> {
    const parent = _getCurrentSuite();
    const suite = _createSuite(description, parent);
    suite.only = true;
    parent.suites.push(suite);

    return _runSpec(suite, specDefinitions);
};

/**
 * Skip a test suite
 */
_describeFn.skip = function (description: string, specDefinitions: SuiteFn): void | IPromise<void> {
    const parent = _getCurrentSuite();
    const suite = _createSuite(description, parent);
    suite.skip = true;
    parent.suites.push(suite);

    return _runSpec(suite, specDefinitions);
};

/**
 * Mocha/Jasmine style describe
 * @since 0.2.0
 */
export const describe: ISuiteDefinitionFn = _describeFn as ISuiteDefinitionFn;

/**
 * Mocha TDD style suite (alias for describe)
 * @since 0.2.0
 */
export const suite: ISuiteDefinitionFn = _describeFn as ISuiteDefinitionFn;

/**
 * Jasmine style xdescribe (alias for describe.skip)
 * @since 0.2.0
 */
export const xdescribe: ISuiteDefinitionFn = _describeFn.skip as ISuiteDefinitionFn;

/**
 * Jasmine style fdescribe (alias for describe.only)
 * @since 0.2.0
 */
export const fdescribe: ISuiteDefinitionFn = _describeFn.only as ISuiteDefinitionFn;

