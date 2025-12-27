/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { AssertClassDef, assert, addAssertFunc, addAssertFuncs, createAssert } from "./assert/assertClass";
import { AssertionError, AssertionErrorConstructor, AssertionFailure, AssertionFailureConstructor, AssertionFatal, AssertionFatalConstructor } from "./assert/assertionError";
import { useScope, _getGlobalScopeContext } from "./assert/useScope";
import { addAssertInstFuncDefs, addAssertInstFunc, addAssertInstFuncDef } from "./assert/assertInst";
import { expect } from "./assert/expect";
import { IAssertClass, IExtendedAssert } from "./assert/interface/IAssertClass";
import {
    IAssertInst, IExtendedAssertInst, IAssertScopeFuncDef, AssertScopeFuncDefs
} from "./assert/interface/IAssertInst";
import { IScopeContext, IScopeContextOverrides } from "./assert/interface/IScopeContext";
import { IAssertClassDef } from "./assert/interface/IAssertClassDef";
import { MsgSource } from "./assert/interface/types";
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
import { INotOp } from "./assert/interface/ops/INotOp";
import { IHasOp } from "./assert/interface/ops/IHasOp";
import { IIsTypeOp } from "./assert/interface/ops/ITypeOp";
import { KeysFn } from "./assert/interface/funcs/KeysFn";
import { IncludeFn } from "./assert/interface/funcs/IncludeFn";
import { ValuesFn } from "./assert/interface/funcs/ValuesFn";
import { IAssertScope } from "./assert/interface/IAssertScope";
import { EqualFn } from "./assert/interface/funcs/EqualFn";
import { AssertFn } from "./assert/interface/funcs/AssertFn";
import { ErrorLikeFn } from "./assert/interface/funcs/ErrorLikeFn";
import { assertConfig } from "./assert/config";
import { IAssertConfig, IAssertConfigDefaults } from "./assert/interface/IAssertConfig";
import { IFormatCtx, IFormatter, IFormattedValue, IFormatterOptions, eFormatResult } from "./assert/interface/IFormatter";
import { createEvalAdapter, EvalFn } from "./assert/adapters/evalAdapter";
import { IPropertyResultOp } from "./assert/interface/ops/IPropertyResultOp";
import { createExprAdapter } from "./assert/adapters/exprAdapter";
import { createAssertScope } from "./assert/assertScope";
import { AssertInstHandlers, IAssertInstHandlers } from "./assert/interface/IAssertInstHandlers";
import { CHECK_INTERNAL_STACK_FRAME_REGEX } from "./assert/const";
import { getScopeContext, createContext } from "./assert/scopeContext";
import { SymbolFn } from "./assert/interface/funcs/SymbolFn";
import { IRemovable } from "./assert/interface/IRemovable";

/**
 * Export the Error classes
 */
export {
    AssertionError,
    AssertionErrorConstructor,
    AssertionFailure,
    AssertionFailureConstructor,
    AssertionFatal,
    AssertionFatalConstructor
};

/**
 * Export the interfaces
 */
export {
    IAllOp,
    IAnyOp,
    IAssertClass,
    IAssertConfig,
    IAssertConfigDefaults,
    IScopeContext,
    IScopeContextOverrides,
    IFormatCtx,
    IFormattedValue,
    IFormatter,
    IFormatterOptions,
    IAssertClassDef,
    IAssertScope,
    IAssertInst,
    IAssertInstCore,
    IAssertInstHandlers,
    IDeepOp,
    IEqualOp,
    IExtendedAssert,
    IExtendedAssertInst,
    IHasOp,
    IIncludeOp,
    IScopePropFn,
    IIsOp,
    IKeysOp,
    INotOp,
    IOwnOp,
    PropertyDescriptorFn,
    PropertyFn,
    IPropertyResultOp,
    IAssertScopeFuncDef,
    IStrictlyOp,
    IThrowOp,
    IToOp,
    IIsTypeOp,
    IRemovable
};

/**
 * Export the types
 */
export {
    AssertClassDef,
    AssertFn,
    AssertInstHandlers,
    IScopeFn,
    ErrorLikeFn,
    EqualFn,
    EvalFn,
    IncludeFn,
    KeysFn,
    ValuesFn,
    MsgSource,
    AssertScopeFuncDefs,
    SymbolFn,
    ThrowFn
};

/**
 * Export the enums
 */
export {
    eFormatResult
};

/**
 * Export the functions (and global `assert`)
 */
export {
    assert,
    assertConfig,
    addAssertFunc,
    addAssertFuncs,
    createAssert,
    expect,
    addAssertInstFuncDef,
    addAssertInstFuncDefs,
    addAssertInstFunc,
    createEvalAdapter,
    createExprAdapter,
    createAssertScope,
    createContext,
    getScopeContext,
    useScope,
    _getGlobalScopeContext
};

/**
 * Export the constants
 */
export {
    CHECK_INTERNAL_STACK_FRAME_REGEX
};
