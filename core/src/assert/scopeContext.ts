/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrForEach, arrIndexOf, arrSlice, fnApply, fnCall, getDeferred, getLength, isArray, isFunction, isObject,
    isPlainObject, newSymbol,  objAssign,  objDefineProps, objForEachKey, objHasOwnProperty, objKeys,
    strEndsWith, strIndexOf, strLeft, strSubstring
} from "@nevware21/ts-utils";
import { _getAssertScope, _isAssertInst } from "./internal/_instCreator";
import { useScope } from "./useScope";
import { getCurrentHost } from "../config/configHost";
import { INotifyResult } from "../interfaces/INotifyResult";
import { eListenerAction } from "../types/ListenerAction";
import { MsgSource } from "../types/MsgSource";
import { IConfig } from "../interfaces/IConfig";
import { _formatValue } from "../internal/_formatValue";
import { IAssertionContext } from "./interface/IAssertionContext";
import { IConfigInst } from "../interfaces/IConfigInst";
import { AssertionFailure } from "./assertionFailure";
import { AssertionFatal } from "./assertionFatal";
import { IScopeContext, IScopeContextOverrides } from "./interface/IScopeContext";
import { EMPTY_STRING } from "../internal/const";

const cScopeContextTag = newSymbol("@nevware21/tripwire#IScopeContext");
const DetailsSymbol = (/* #__PURE__*/getDeferred(() => newSymbol("_$details")));

function _createStackTracker(parentstack?: Function[]): Function[] {
    let theStack: Function[] = [];
    let orgPush = theStack.push;
    let orgUnshift = theStack.unshift;

    if (parentstack) {
        arrForEach(parentstack, (fn) => {
            fnCall(orgPush, theStack, fn);
        });
    }

    // Override the push function to push onto the child stack
    objDefineProps(theStack, {
        push: {
            v: function _arrPush(fn: Function) {
                let theArgs = arguments;
                arrForEach(theArgs, (fn) => {
                    let pos = arrIndexOf(theStack, fn);
                    if (pos === -1) {
                        fnCall(orgPush, theStack, fn);
                    }
                });

                return theStack.length;
            }
        },
        unshift: {
            v: function _arrUnshift(fn: Function) {
                let theArgs = arguments;
                arrForEach(theArgs, (fn) => {
                    let pos = arrIndexOf(theStack, fn);
                    if (pos === -1) {
                        fnCall(orgUnshift, theStack, fn);
                    } else {
                        // Move the function to the front of the stack
                        theStack.splice(pos, 1);
                        fnCall(orgUnshift, theStack, fn);
                    }
                });

                return theStack.length;
            }
        }
    });

    return theStack;
}

function _getTokenValue(context: IScopeContext, details: any, token: string, opName?: string): { has: boolean, value: any } {
    let value: any;
    let hasToken = true;

    let idx = strIndexOf(token, "(");
    if (idx != -1 && strEndsWith(token, ")")) {
        // Find the closing parenthesis, there may be nested ones so we need to track them
        let openParens = 1;
        let lp = idx + 1;
        let tokenLen = token.length;
        while (openParens > 0 && lp < tokenLen) {
            if (token[lp] == "(") {
                openParens++;
            } else if (token[lp] == ")") {
                openParens--;
                if (openParens == 0) {
                    let result = _getTokenValue(context, details, strSubstring(token, idx + 1, lp), strSubstring(token, 0, idx));
                    if (result.has) {
                        return result;
                    } else {
                        // Just break out and treat it as a normal token
                        break;
                    }
                }
            }

            lp++;
        }
    }

    // Try and resolve the token value (name) as a property on the details object
    if (objHasOwnProperty(details, token)) {
        value = details[token];
    } else {
        switch (token) {
            case "value":
                value = details["actual"];
                break;
            case "path":
                let path = context.get("opPath");
                value = path.join(" ");
                break;
            default:
                hasToken = false;
        }
    }

    if (opName) {
        if (opName === "len" || opName === "length") {
            value = getLength(value);
            hasToken = true;
        } else if (opName === "typeof") {
            if (value === null) {
                value = "null";
            } else if (value === undefined) {
                value = "undefined";
            } else if (isObject(value)) {
                if (value.constructor && value.constructor.name) {
                    value = value.constructor.name;
                } else {
                    value = typeof value;
                }
            } else {
                value = typeof value;
            }

            hasToken = true;
        } else {
            // not a supported operation
            hasToken = false;
        }
    }

    return {
        has: hasToken,
        value: value
    };
}

/**
 * Returns the scope context for the given value, if it is an {@link IAssertInst}
 * instance it will return its context, if it's a {@link IAssertScope} it will
 * return the context of the scope, if it's already a context it will return itself.
 * Otherwise it will create a new context with the value.
 * @param value - The value to get the context for.
 * @returns - The assocated context or a new context for the value.
 * @group Scope
 * @since 0.1.0
 */
export function getScopeContext(value: any): IScopeContext {
    if (value && value[cScopeContextTag]) {
        return value;
    }

    let scope = _isAssertInst(value) ? _getAssertScope(value) : value;
    if (scope && scope.context && scope.context[cScopeContextTag]) {
        return scope.context;
    }

    return createContext(value);
}

/**
 * Creates a new context object.
 * @param value The value of the context.
 * @param initMsg The initial message of the context.
 * @group Scope
 * @since 0.1.0
 */
export function createContext<T>(value?: T, initMsg?: MsgSource, stackStart?: Function, orgArgs?: any[], cfgOverrides?: IConfig): IScopeContext {
    function _resolveMessage(context: IScopeContext, theMsg: MsgSource) {
        let message: string = (isFunction(theMsg) ? theMsg() : theMsg) || EMPTY_STRING;

        // replace tokens
        if (strIndexOf(message, "{") != -1) {
            let details = context.getDetails();
            let start = 0;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                let open = strIndexOf(message, "{", start);
                if (open == -1) {
                    break;
                }
                if (message[open + 1] == "{") {
                    start = open + 2;
                    continue;
                }
                let close = strIndexOf(message, "}", open);
                if (close == -1) {
                    break;
                }

                let result = _getTokenValue(context, details, strSubstring(message, open + 1, close));
                if (result.has) {
                    let prefix = strLeft(message, open) + _formatValue(context.opts, result.value);
                    message = prefix + strSubstring(message, close + 1);
                    start = prefix.length;
                } else {
                    // Unresolved token, so just skip it and continue
                    start = open + 1;
                }
            }
        }

        return message;
    }

    /**
     * Reports an evaluation to the listeners of the active host. `ctx` is the context the evaluation was
     * invoked on -- the leaf of the scope chain, not this root context -- as only it holds the values the
     * message tokens (eg. `{expected}`) resolve against and the operation path that led here.
     */
    function _notifyAssert(ctx: IScopeContext, passed: boolean, e?: any, evalMsg?: MsgSource, causedBy?: Error): INotifyResult | undefined {
        const activeHost = getCurrentHost();
        const notifyMgr = (activeHost && activeHost.notifyMgr) || cfgHost.notifyMgr;
        let notifyResult: INotifyResult;
        // Only build the (deferred) assertion context when something is actually listening
        if (notifyMgr && (!notifyMgr.hasListeners || notifyMgr.hasListeners())) {
            /*
             * Notify listeners of evaluation
             * Wrap context in a lazy value so it's only evaluated if listeners exist
             */
            const assertContext = getDeferred<IAssertionContext>(() => {
                return {
                    value: ctx.value,
                    message: evalMsg ? ctx.getEvalMessage(evalMsg, true) : undefined,
                    opPath: ctx.get("opPath"),
                    negated: ctx.get("negate") === true,
                    passed,
                    error: e
                };
            });

            notifyResult = notifyMgr.notifyAssertion(assertContext);
        }

        return notifyResult;
    }

    let values: any = {};
    let cfgHost = getCurrentHost();
    let cfgInst = getDeferred<IConfigInst>(() => {
        if (cfgOverrides) {
            return cfgHost.opts.v.$ops.clone(cfgOverrides);
        }

        return cfgHost.opts.v;
    });

    let theStack: Function[] = _createStackTracker();
    let context: IScopeContext  = {
        opts: null,
        _$stackFn: null,
        value: null,
        getMessage: function (evalMsg?: MsgSource, skipOverrides?: boolean) {
            let _this = this;

            let theInitMsg = _resolveMessage(_this, initMsg);
            let message = _this.getEvalMessage(evalMsg, skipOverrides);
            if (theInitMsg) {
                message = theInitMsg + (message ? ": " + message : EMPTY_STRING);
            }

            return message;
        },
        getEvalMessage: function (evalMsg?: MsgSource, skipOverrides?: boolean) {
            let _this = this;
            let path = _this.get("opPath");

            let message = _resolveMessage(_this, evalMsg);

            return message || (path ? path.join(" ") : EMPTY_STRING);
        },
        getDetails: function () {
            let _this = this;
            let details: any = {
                actual: _this.value,
                showDiff: cfgInst.v.showDiff
            };
            arrForEach(_this.keys(), (key) => {
                details[key] = _this.get(key);
            });

            return details;
        },
        eval: function (expr: boolean, evalMsg?: MsgSource, causedBy?: Error) {
            let _this = this;
            let notifyResult: INotifyResult | null = null;

            try {
                if (!expr) {
                    _this.fail(evalMsg, _this.getDetails(), this._$stackFn, causedBy);
                }

                notifyResult = _notifyAssert(_this, true, null, evalMsg, causedBy);
            } catch (e) {
                notifyResult = _notifyAssert(_this, false, e, evalMsg, causedBy);
                // If we have a notification result and it's not to continue then rethrow
                if (!notifyResult || notifyResult.action !== eListenerAction.Continue) {
                    // Rethrow the error if we are not deferring
                    throw e;
                }

                // Record deferred assertion failures against the currently executing test result.
                const currentHost = getCurrentHost();
                const activeTestResult = ((currentHost as any) && (currentHost as any)._activeTestResult) || (cfgHost as any)._activeTestResult;
                if (activeTestResult) {
                    if (!activeTestResult.deferredErrors) {
                        activeTestResult.deferredErrors = [];
                    }

                    activeTestResult.deferredErrors.push(e as Error);
                }
            } finally {
                if (notifyResult && notifyResult.action === eListenerAction.Abort) {
                    // Notification manager is forcing the evaluation to fail
                    let abortDetails = _this.getDetails();
                    abortDetails.aborted = true;
                    abortDetails.abortReason = notifyResult.reason;
                    _this.fail(notifyResult.reason || evalMsg, abortDetails, this._$stackFn);
                }
            }

            return _this;
        },
        fail: function (msg: MsgSource, details: any, stackStart?: Function | Function[], causedBy?: Error): never {
            let _this = this;
            let theStack: Function[] = null;

            if (!cfgInst.v.fullStack) {
                theStack = _createStackTracker(_this._$stackFn);
                if (stackStart) {
                    if (!isArray(stackStart)) {
                        theStack.push(stackStart);
                    } else {
                        arrForEach(stackStart, (fn) => {
                            theStack.push(fn);
                        });
                    }
                }
            }

            // Use the scope context during error throwing
            return useScope(_this, () => {
                let theDetails = details || _this.getDetails();
                throw new AssertionFailure(_this.getMessage(msg), causedBy, theDetails, theStack);
            });
        },
        fatal: function (msg: MsgSource, details: any, stackStart?: Function | Function[], causedBy?: Error): never {
            let _this = this;
            let theStack: Function[] = null;

            if (!cfgInst.v.fullStack) {
                theStack = _createStackTracker(_this._$stackFn);
                if (stackStart) {
                    if (!isArray(stackStart)) {
                        theStack.push(stackStart);
                    } else {
                        arrForEach(stackStart, (fn) => {
                            theStack.push(fn);
                        });
                    }
                }
            }

            // Use the scope context during error throwing
            return useScope(_this, () => {
                // As this always throws we don't need to resolve the message via _this.getMessage
                // as we don't want the "not" prefix if this is used within a "not" operation.
                let theInitMsg = _resolveMessage(_this, initMsg);
                let path = _this.get("opPath");
                let message = _resolveMessage(_this, msg) || (path ? path.join(" ") : EMPTY_STRING);

                if (theInitMsg) {
                    message = theInitMsg + (message ? ": " + message : EMPTY_STRING);
                }

                throw new AssertionFatal(message, causedBy, details || _this.getDetails(), theStack);
            });
        },
        setOp: function (opName: string) {
            let _this = this;
            _this.set("operation", opName);

            // Track the operation path
            let path = _this.get("opPath");
            if (!path) {
                path = [];
                _this.set("opPath", path);
            }

            path.push(opName);

            return _this;
        },
        get: function (name: string) {
            return values[name];
        },
        set: function (name: string, value: any) {
            values[name] = value;

            return this;
        },
        keys: function () {
            return objKeys(values);
        },
        new: function (value: any, overrides?: IScopeContextOverrides) {
            return _childContext(context, value, overrides, stackStart);
        },
        orgArgs: null
    };

    if (stackStart) {
        theStack.push(stackStart);
    }

    return objDefineProps<IScopeContext>(context, {
        _$stackFn: {
            v: theStack,
            e: false
        },
        opts: {
            g: () => cfgInst.v
        },
        value: {
            v: value,
            w: false
        },
        orgArgs: {
            v: orgArgs,
            w: false
        },
        [DetailsSymbol.v]: {                    // Define a non-enumerable symbol based property to get the details
            g: () => context.getDetails(),      // This is useful when debugging to be able to see the details without calling the function
            e: false
        },
        [cScopeContextTag]: {
            v: true,
            e: false
        }
    });
}

/**
 * Create a proxied function that will call the override function if it exists and protect
 * against infinite recursion.
 * @param parent - The parent context, when not calling the override function
 * @param overName - The name of the function to proxy
 * @param overrides - The overrides object
 * @returns
 */
function _proxyFn<R>(parent: IScopeContext, name: keyof IScopeContextOverrides | keyof IScopeContext, overrides?: IScopeContextOverrides) {
    let callingOverride = false;
    let overrideFn = overrides ? (overrides as any)[name] : null;

    return function() {
        // Save current this context
        let _this = this;
        let theArgs = arrSlice(arguments);
        let skipOverrides = false;
        if (name == "getEvalMessage" || name == "getMessage") {
            if (theArgs.length >= 2) {
                skipOverrides = theArgs[1];
            }
        }
        if (!callingOverride && overrideFn && !skipOverrides) {
            // We should only get here if we are not already calling the override
            // function. This is to prevent infinite recursion.
            try {
                callingOverride = true;
                // Add ourselves as the first argument, so that we get called back as "the parent"
                // So that the correct "context" is used, if we used our real "parent" this would
                // bypass the current context "values" (and the actual `value`).
                theArgs.unshift(_this);
                return fnApply(overrideFn, _this, theArgs);
            } finally {
                callingOverride = false;
            }
        }

        return fnApply(parent[name], _this, theArgs);
    } as R;
}

function _childContext<V>(parent: IScopeContext, value: V, overrides?: IScopeContextOverrides, stackStart?: Function): IScopeContext {
    let values: any = {};
    let childStack: Function[] = _createStackTracker(parent._$stackFn);

    if (stackStart) {
        childStack.push(stackStart);
    }

    let newContext: IScopeContext = {
        opts: null,
        _$stackFn: null,
        value: null,
        getMessage: _proxyFn(parent, "getMessage", overrides),
        getEvalMessage: _proxyFn(parent, "getEvalMessage", overrides),
        getDetails: _proxyFn(parent, "getDetails", overrides),
        eval: _proxyFn(parent, "eval", overrides),
        fail: _proxyFn(parent, "fail", overrides),
        fatal: _proxyFn(parent, "fatal", overrides),
        setOp: _proxyFn(parent, "setOp", null),
        get: function (name: string) {
            let _this = this;
            if (objHasOwnProperty(values, name)) {
                return values[name];
            }

            let parentValue = parent.get(name);
            // Handle some special cases where we don't want to support
            // overrriding the parent's value, so we return a copy of the
            // parent's value
            if (isArray(parentValue)) {
                // Shallow copy the array
                parentValue = arrSlice(parentValue);
                _this.set(name, parentValue);
            } else if(isPlainObject(parentValue)) {
                parentValue = objAssign({}, parentValue);
                _this.set(name, parentValue);
            }

            return parentValue;
        },
        set: function (name: string, value: any) {
            values[name] = value;

            return this;
        },
        keys: function () {
            let theKeys = parent.keys();
            objForEachKey(values, (key) => {
                if (arrIndexOf(theKeys, key) == -1) {
                    theKeys.push(key);
                }
            });

            return theKeys;
        },
        new: function (value: any, overrides?: IScopeContextOverrides) {
            return _childContext(newContext, value, overrides, stackStart);
        },
        orgArgs: null
    };

    return objDefineProps(newContext, {
        _$stackFn: {
            v: childStack,
            e: false
        },
        opts: {
            g: () => parent.opts
        },
        value: {
            v: value,
            w: false
        },
        orgArgs: {
            v: parent.orgArgs,
            w: false
        },
        [DetailsSymbol.v]: {                    // Define a non-enumerable symbol based property to get the details
            g: () => newContext.getDetails(),   // This is useful when debugging to be able to see the details without calling the function
            e: false
        },
        [cScopeContextTag]: {
            v: true,
            e: false
        }
    });
}

