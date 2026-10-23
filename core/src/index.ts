/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IConfig } from "./interfaces/IConfig";
import { IConfigApi } from "./interfaces/IConfigApi";
import { IConfigInst } from "./interfaces/IConfigInst";
import { IFormatterOptions } from "./interfaces/IFormatterOptions";
import { MsgSource } from "./types/MsgSource";
import { assert, addAssertFunc, addAssertFuncs, createAssert, AssertClassDef } from "./assert/assertClass";
import { AssertionError } from "./assert/assertionError";
import { AssertionErrorConstructor } from "./assert/assertionError";
import { IAssertionErrorOrgValues } from "./assert/interface/IAssertionErrorOrgValues";
import { AssertionFailure, AssertionFailureConstructor } from "./assert/assertionFailure";
import { AssertionFatal, AssertionFatalConstructor } from "./assert/assertionFatal";
import { useScope } from "./assert/useScope";
import { addAssertInstFuncDefs, addAssertInstFunc, addAssertInstFuncDef } from "./assert/assertInst";
import { expect } from "./assert/expect";
import { IAssertClass, IExtendedAssert } from "./assert/interface/IAssertClass";
import { IAssertInst, IExtendedAssertInst } from "./assert/interface/IAssertInst";
import { IAssertScopeFuncDef, AssertScopeFuncDefs } from "./assert/interface/IAssertScopeFuncDef";
import { IScopeContext, IScopeContextOverrides } from "./assert/interface/IScopeContext";
import { IAssertClassDef } from "./assert/interface/IAssertClassDef";
import { ArrayLikeOrSizedIterable } from "./types/ArrayLikeOrSizedIterable";
import { IAssertInstCore } from "./assert/interface/IAssertInstCore";
import { IDeepOp } from "./assert/interface/ops/IDeepOp";
import { IKeysOp } from "./assert/interface/ops/IKeysOp";
import { IOwnOp } from "./assert/interface/ops/IOwnOp";
import { PropertyDescriptorFn, PropertyFn } from "./assert/interface/funcs/PropertyFn";
import { IScopeFn, IScopePropFn } from "./assert/interface/IScopeFuncs";
import { IStrictlyOp } from "./assert/interface/ops/IStrictlyOp";
import { IIsOp } from "./assert/interface/ops/IIsOp";
import { IEqualOp } from "./assert/interface/ops/IEqualOp";
import { IIncludeOp } from "./assert/interface/ops/IIncludeOp";
import { IAllOp } from "./assert/interface/ops/IAllOp";
import { IAnyOp } from "./assert/interface/ops/IAnyOp";
import { IThrowOp } from "./assert/interface/ops/IThrowOp";
import { IToOp } from "./assert/interface/ops/IToOp";
import { ThrowFn } from "./assert/interface/funcs/ThrowFn";
import { INestedOp } from "./assert/interface/ops/INestedOp";
import { INotOp } from "./assert/interface/ops/INotOp";
import { IHasOp } from "./assert/interface/ops/IHasOp";
import { IHasOwnOp } from "./assert/interface/ops/IHasOwnOp";
import { IIsTypeOp } from "./assert/interface/ops/ITypeOp";
import { INumericOp } from "./assert/interface/ops/INumericOp";
import { NumberFn } from "./assert/interface/funcs/NumericFn";
import { WithinFn } from "./assert/interface/funcs/WithinFn";
import { CloseToFn } from "./assert/interface/funcs/CloseToFn";
import { OperatorFn } from "./assert/interface/funcs/OperatorFn";
import { KeysFn } from "./assert/interface/funcs/KeysFn";
import { IncludeFn } from "./assert/interface/funcs/IncludeFn";
import { ValuesFn } from "./assert/interface/funcs/ValuesFn";
import { IAssertScope } from "./assert/interface/IAssertScope";
import { EqualFn } from "./assert/interface/funcs/EqualFn";
import { AssertFn } from "./assert/interface/funcs/AssertFn";
import { ErrorLikeFn } from "./assert/interface/funcs/ErrorLikeFn";
import { InstanceOfFn } from "./assert/interface/funcs/InstanceOfFn";
import { assertConfig, addAssertionListener, removeAssertionListener } from "./config/assertConfig";
import { IConfigHost } from "./interfaces/IConfigHost";
import { IFormatCtx, IFormatter, IFormattedValue } from "./interfaces/IFormatter";
import { eFormatResult, FormatResult } from "./types/FormatResult";
import { IFormatManager } from "./interfaces/IFormatManager";
import { createEvalAdapter, EvalFn } from "./assert/adapters/evalAdapter";
import { IPropertyResultOp } from "./assert/interface/ops/IPropertyResultOp";
import { createExprAdapter } from "./assert/adapters/exprAdapter";
import { createNotAdapter } from "./assert/adapters/notAdapter";
import { createAssertScope } from "./assert/assertScope";
import { AssertInstHandlers, IAssertInstHandlers } from "./assert/interface/IAssertInstHandlers";
import { CHECK_INTERNAL_STACK_FRAME_REGEX } from "./assert/const";
import { getScopeContext, createContext } from "./assert/scopeContext";
import { SymbolFn } from "./assert/interface/funcs/SymbolFn";
import { IRemovable } from "./interfaces/IRemovable";
import { OneOfFn } from "./assert/interface/funcs/OneOfFn";
import { ChangeFn } from "./assert/interface/funcs/ChangeFn";
import { ChangeByFn } from "./assert/interface/funcs/ChangeByFn";
import { IChangeResultOp } from "./assert/interface/ops/IChangeResultOp";
import { IChangeResultValue } from "./assert/interface/ops/IChangeResultValue";
import { TripwireError, TripwireErrorConstructor } from "./errors/tripwireError";
import { AbortError, AbortErrorConstructor, IAbortProps } from "./errors/abortError";
import { SkipError, SkipErrorConstructor, ISkipProps } from "./errors/skipError";
import { TimeoutError, TimeoutErrorConstructor, ITimeoutProps } from "./errors/timeoutError";
import { ConfigHostFunc } from "./types/ConfigHostFunc";
import { createServerMgr } from "./server/ServerManager";
import { createFormatMgr } from "./config/formatManager";
import { getCurrentHost, useHost, withHost } from "./config/configHost";
import { IParsedStack, parseStack } from "./internal/parseStack";
import { cStackDetail } from "./internal/_errorSupport";
import { DEFAULT_CONFIG } from "./config/defaultConfig";
import { coreFunctions } from "./assert/internal/_baseFunctions";
import { sameMembersFunc, sameDeepMembersFunc, sameOrderedMembersFunc, sameDeepOrderedMembersFunc, includeMembersFunc, includeOrderedMembersFunc, includeDeepMembersFunc, includeDeepOrderedMembersFunc, startsWithMembersFunc, startsWithDeepMembersFunc, endsWithMembersFunc, endsWithDeepMembersFunc, subsequenceFunc, deepSubsequenceFunc } from "./assert/funcs/members";
import { isArrayFunc, isObjectFunc, isPlainObjectFunc, isFunctionFunc, isStringFunc, isNumberFunc, isBooleanFunc, isUndefinedFunc, isNullFunc, isTruthyFunc, isTrueFunc, isFalseFunc, isStrictTrueFunc, isStrictFalseFunc, isNaNFunc, isFiniteFunc } from "./assert/funcs/is";
import { equalsFunc, strictEqualsFunc, deepEqualsFunc, deepStrictEqualsFunc } from "./assert/funcs/equal";
import { orFunc } from "./assert/funcs/or";
import { hasPropertyFunc, hasOwnPropertyFunc, hasDeepPropertyFunc, hasDeepOwnPropertyFunc, hasPropertyDescriptorFunc, hasOwnPropertyDescriptorFunc } from "./assert/funcs/hasProperty";
import { hasSymbolFunc, hasOwnSymbolFunc } from "./assert/funcs/hasSymbol";
import { changesFunc, increasesFunc, decreasesFunc } from "./assert/funcs/changes";
import { changesByFunc, changesButNotByFunc, increasesByFunc, increasesButNotByFunc, decreasesByFunc, decreasesButNotByFunc } from "./assert/funcs/changesBy";
import { closeToFunc } from "./assert/funcs/closeTo";
import { existsFunc } from "./assert/funcs/exists";
import { ifErrorFunc } from "./assert/funcs/ifError";
import { instanceOfFunc } from "./assert/funcs/instanceOf";
import { isEmptyFunc } from "./assert/funcs/isEmpty";
import { isExtensibleFunc } from "./assert/funcs/isExtensible";
import { isFrozenFunc } from "./assert/funcs/isFrozen";
import { isIterableFunc } from "./assert/funcs/isIterable";
import { isSealedFunc } from "./assert/funcs/isSealed";
import { lengthFunc } from "./assert/funcs/length";
import { matchFunc } from "./assert/funcs/match";
import { hasNestedPropertyFunc, hasDeepNestedPropertyFunc, nestedIncludeFunc, deepNestedIncludeFunc } from "./assert/funcs/nested";
import { operatorFunc } from "./assert/funcs/operator";
import { throwsFunc, isErrorFunc } from "./assert/funcs/throws";
import { truthyFunc, strictlyTruthyFunc } from "./assert/funcs/truthy";
import { typeOfFunc } from "./assert/funcs/typeOf";
import { anyValuesFunc, allValuesFunc } from "./assert/funcs/valuesFunc";
import { changeResultOp } from "./assert/ops/changeResultOp";
import { notOp } from "./assert/ops/notOp";
import { aboveFunc, leastFunc, belowFunc, mostFunc, withinFunc, numericOp } from "./assert/ops/numericOp";
import { propertyResultOp } from "./assert/ops/propertyResultOp";
import { anyOp, allOp, anyOwnOp, allOwnOp } from "./assert/ops/allOp";
import { deepOp } from "./assert/ops/deepOp";
import { hasOp, hasOwnOp } from "./assert/ops/hasOp";
import { includeOp, deepIncludeOp, ownIncludeOp, deepOwnIncludeOp } from "./assert/ops/includeOp";
import { strictlyOp, deepStrictlyOp } from "./assert/ops/strictlyOp";
import { anyKeyFilterOp, allKeyFilterOp, anyDeepKeyFilterOp, allDeepKeyFilterOp, deepKeysOp } from "./assert/ops/keysOp";
import { ownOp, ownDeepOp } from "./assert/ops/ownOp";
import { ITestRunContext } from "./interfaces/runner/ITestRunContext";
import { ISuiteStateContext } from "./suite/interfaces/ISuiteStateContext";

/**
 * Export server-related types and functions
 */
export { IServerManager } from "./interfaces/IServerManager";
export { ITestServerProvider } from "./suite/interfaces/ITestServerProvider";

/**
 * Re-export the shared types and functions
 */
export { ITestServer } from "./server/ITestServer";
export { IDoneFn } from "./interfaces/suite/IDoneFn";
export { IGetSetChainableFn } from "./interfaces/suite/IGetSetChainableFn";
export { IHookDefinitionFn } from "./interfaces/suite/IHookDefinitionFn";
export { ISuiteContext } from "./interfaces/suite/ISuiteContext";
export { ISuiteDefinitionFn } from "./interfaces/suite/ISuiteDefinitionFn";
export { ITestCase } from "./interfaces/suite/ITestCase";
export { ITestContext } from "./interfaces/suite/ITestContext";
export { ITestDefinitionFn } from "./interfaces/suite/ITestDefinitionFn";
export { HookFn } from "./types/HookFn";
export { SuiteFn } from "./types/SuiteFn";
export { TestFn } from "./types/TestFn";
export { eListenerEvent, ListenerEvent, ListenerEventEnum } from "./types/ListenerEvent";

/**
 * Export suite types
 */
export { IHookDefinition } from "./suite/interfaces/IHookDefinition";
export { TestStatus } from "./suite/interfaces/ITestStatus";
export { ITestSuite } from "./suite/interfaces/ITestSuite";
export { ITestResult } from "./interfaces/runner/ITestResult";
export { ISuiteResult } from "./interfaces/runner/ISuiteResult";
export { ITestFilter } from "./suite/interfaces/ITestFilter";
export { IListener } from "./interfaces/IListener";
export { eListenerAction, ListenerAction } from "./types/ListenerAction";
export { IListenerResult } from "./interfaces/IListenerResult";
export { IListenerContext } from "./interfaces/IListenerContext";
export { IListenerStartContext } from "./interfaces/IListenerStartContext";
export { IListenerEndContext } from "./interfaces/IListenerEndContext";
export { IAssertionContext } from "./assert/interface/IAssertionContext";
export { INotifyResult } from "./interfaces/INotifyResult";
export { INotificationManager } from "./interfaces/INotificationManager";
export { IAssertionListener } from "./suite/assertionListener";
export { createNotifyMgr } from "./notify/NotificationManager";

/**
 * Export runner types and functions
 */
export { ITestRunner } from "./interfaces/runner/ITestRunner";
export { ITestRunnerOptions } from "./interfaces/runner/ITestRunnerOptions";
export { ITestSummary } from "./interfaces/runner/ITestSummary";
export { IHookFailure } from "./interfaces/runner/IHookFailure";
export {
    IRunnerMetrics,
    IRunnerMetricTrace,
    IRunnerMetricCounts,
    IRunnerMetricExecutionSample,
    IRunnerPerTestWaitMetric,
    IRunnerRetryDetail,
    IRunnerTimeoutHotspot,
    IRunnerTracePattern,
    IRunnerSlowestExecutions,
    IRunnerRetryDiagnostics,
    IRunnerTimeoutDiagnostics,
    IRunnerTraceCompression,
    RunnerExecutionMode,
    RunnerMetricEvent,
    RunnerMetricType
} from "./interfaces/runner/IRunnerMetrics";

/**
 * Export suite functions
 */
export {
    describe, suite, xdescribe, fdescribe,
    resetSuite, getRootSuite, createSuite, useSuite
} from "./suite/suite";

export { it, spec, test, xit, fit } from "./suite/it";
export { after, afterAll } from "./suite/after";
export { afterEach } from "./suite/afterEach";
export { before, beforeAll } from "./suite/before";
export { beforeEach } from "./suite/beforeEach";

/**
 * Export test filters
 */
export {
    createOnlyFilter
} from "./suite/filters/onlyFilter";

export {
    createSuiteIDFilter,
    createTestIDFilter
} from "./suite/filters/idFilter";

export {
    createSuiteNameFilter,
    createTestNameFilter
} from "./suite/filters/nameFilter";

export {
    createSuiteInstanceFilter,
    createTestInstanceFilter
} from "./suite/filters/instanceFilter";

/**
 * Export filter helpers
 */
export {
    findMatchingTestsAndSuites,
    findMatchingSuites,
    findMatchingTests,
    IFilterMatchResult
} from "./suite/filterHelpers";

/**
 * Export the Error classes
 */
export {
    AssertionError, AssertionErrorConstructor, AssertionFailure, AssertionFailureConstructor,
    AssertionFatal, AssertionFatalConstructor, IAssertionErrorOrgValues,
    TripwireError, TripwireErrorConstructor,
    AbortError, AbortErrorConstructor, IAbortProps,
    SkipError, SkipErrorConstructor, ISkipProps,
    TimeoutError, TimeoutErrorConstructor, ITimeoutProps
};

/**
 * Export the interfaces
 */
export {
    IAllOp, IAnyOp, IAssertClass, IAssertClassDef, IConfig, IConfigInst, IConfigApi, IConfigHost,
    IAssertInst, IAssertInstCore, IAssertInstHandlers, IAssertScope, IAssertScopeFuncDef,
    IChangeResultOp, IChangeResultValue, IDeepOp, IEqualOp, IExtendedAssert, IExtendedAssertInst,
    IFormatCtx, IFormattedValue, IFormatter, IFormatterOptions, IFormatManager, IHasOp, IHasOwnOp, IIncludeOp,
    IIsOp, IIsTypeOp, IKeysOp, INestedOp, INotOp, INumericOp, IOwnOp, IPropertyResultOp, IRemovable,
    IScopeContext, IScopeContextOverrides, IScopePropFn, IStrictlyOp, IThrowOp, IToOp,
    PropertyDescriptorFn, PropertyFn, IParsedStack,
    ITestRunContext, ISuiteStateContext
};

/**
 * Export the types
 */
export {
    ArrayLikeOrSizedIterable, AssertClassDef, AssertFn, AssertInstHandlers, AssertScopeFuncDefs,
    ChangeByFn, ChangeFn, CloseToFn, ConfigHostFunc, EqualFn, ErrorLikeFn, EvalFn, IncludeFn, InstanceOfFn,
    IScopeFn, KeysFn, MsgSource, NumberFn, OneOfFn, OperatorFn, SymbolFn, ThrowFn, ValuesFn,
    WithinFn
};

/**
 * Export the enums
 */
export {
    eFormatResult, FormatResult
};

/**
 * Export assertion functions
 */
export {
    sameMembersFunc, sameDeepMembersFunc, sameOrderedMembersFunc, sameDeepOrderedMembersFunc,
    includeMembersFunc, includeOrderedMembersFunc, includeDeepMembersFunc, includeDeepOrderedMembersFunc,
    startsWithMembersFunc, startsWithDeepMembersFunc, endsWithMembersFunc, endsWithDeepMembersFunc,
    subsequenceFunc, deepSubsequenceFunc,
    isArrayFunc, isObjectFunc, isPlainObjectFunc, isFunctionFunc, isStringFunc, isNumberFunc,
    isBooleanFunc, isUndefinedFunc, isNullFunc, isTruthyFunc, isTrueFunc, isFalseFunc,
    isStrictTrueFunc, isStrictFalseFunc, isNaNFunc, isFiniteFunc,
    equalsFunc, strictEqualsFunc, deepEqualsFunc, deepStrictEqualsFunc, orFunc,
    hasPropertyFunc, hasOwnPropertyFunc, hasDeepPropertyFunc, hasDeepOwnPropertyFunc,
    hasPropertyDescriptorFunc, hasOwnPropertyDescriptorFunc,
    hasSymbolFunc, hasOwnSymbolFunc,
    changesFunc, increasesFunc, decreasesFunc,
    changesByFunc, changesButNotByFunc, increasesByFunc, increasesButNotByFunc, decreasesByFunc, decreasesButNotByFunc,
    closeToFunc,
    existsFunc,
    ifErrorFunc,
    instanceOfFunc,
    isEmptyFunc,
    isExtensibleFunc,
    isFrozenFunc,
    isIterableFunc,
    isSealedFunc,
    lengthFunc,
    matchFunc,
    hasNestedPropertyFunc, hasDeepNestedPropertyFunc, nestedIncludeFunc, deepNestedIncludeFunc,
    operatorFunc,
    throwsFunc, isErrorFunc,
    truthyFunc, strictlyTruthyFunc,
    typeOfFunc,
    anyValuesFunc, allValuesFunc
};

/**
 * Export operator functions
 */
export {
    changeResultOp,
    notOp,
    aboveFunc, leastFunc, belowFunc, mostFunc, withinFunc, numericOp,
    propertyResultOp,
    anyOp, allOp, anyOwnOp, allOwnOp,
    deepOp,
    hasOp, hasOwnOp,
    includeOp, deepIncludeOp, ownIncludeOp, deepOwnIncludeOp,
    strictlyOp, deepStrictlyOp,
    anyKeyFilterOp, allKeyFilterOp, anyDeepKeyFilterOp, allDeepKeyFilterOp, deepKeysOp,
    ownOp, ownDeepOp
};

/**
 * Export the core functions (and global `assert`)
 */
export {
    addAssertFunc, addAssertFuncs, addAssertInstFunc, addAssertInstFuncDef, addAssertInstFuncDefs,
    assert, assertConfig, addAssertionListener, removeAssertionListener, createAssert, createAssertScope, createContext, createEvalAdapter,
    createExprAdapter, createNotAdapter, expect, getScopeContext, useScope,
    createServerMgr, createFormatMgr, parseStack, getCurrentHost, useHost, withHost
};

/**
 * Export the constants
 */
export {
    CHECK_INTERNAL_STACK_FRAME_REGEX, DEFAULT_CONFIG, cStackDetail, coreFunctions
};

/**
 * Export the test runner factory
 */
export { createTestRunner } from "./suite/runner";
