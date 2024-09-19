/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import {
    arrForEach, arrIndexOf, arrSlice, fnApply, getLazy, isArray, isFunction, isPlainObject,
    newSymbol,  objAssign, objDefine, objDefineProps, objForEachKey, objHasOwnProperty,
    objKeys, strIndexOf, strLeft, strSubstring
} from "@nevware21/ts-utils";
import { IScopeContext, IScopeContextOverrides } from "./interface/IScopeContext";
import { AssertionFailure } from "./assertionError";
import { MsgSource } from "./interface/types";
import { EMPTY_STRING } from "./internal/const";
import { assertConfig } from "./config";
import { IAssertConfig } from "./interface/IAssertConfig";
import { _getAssertScope, _isAssertInst } from "./internal/_instCreator";
import { _formatValue } from "./internal/_formatValue";

const cScopeContextTag = newSymbol("@nevware21/tripwire#IScopeContext");

function _createStackTracker(parentstack?: Function[]): Function[] {
    let theStack: Function[] = [];
    let orgPush = theStack.push;
    let orgUnshift = theStack.unshift;

    if (parentstack) {
        arrForEach(parentstack, (fn) => {
            orgPush.call(theStack, fn);
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
                        orgPush.call(theStack, fn);
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
                        orgUnshift.call(theStack, fn);
                    } else {
                        // Move the function to the front of the stack
                        theStack.splice(pos, 1);
                        orgUnshift.call(theStack, fn);
                    }
                });

                return theStack.length;
            }
        }
    });

    return theStack;
}

/**
 * Returns the scope context for the given value, if it is an {@link IAssertInst}
 * instance it will return it's context, if it's a {@link IAssertScope} it will
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
 * @param msg The message of the context.
 * @group Scope
 * @since 0.1.0
 */
export function createContext<T>(value?: T, initMsg?: MsgSource, stackStart?: Function, orgArgs?: any[], defOptions?: IAssertConfig): IScopeContext {
    let values: any = {};
    let theOptions = getLazy<IAssertConfig>(() => assertConfig.clone(defOptions));
    let theStack: Function[] = _createStackTracker();

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
                
                let hasToken = true;
                let token = strSubstring(message, open + 1, close);
                let value: any;
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

                if (hasToken) {
                    let prefix = strLeft(message, open) + _formatValue(value);
                    message = prefix + strSubstring(message, close + 1);
                    start = prefix.length;
                } else {
                    start = open + 1;
                }
            }
        }

        return message;
    }

    let context: IScopeContext  = {
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
                actual: _this.value
            };
            arrForEach(_this.keys(), (key) => {
                details[key] = _this.get(key);
            });

            return details;
        },
        eval: function (expr: boolean, evalMsg?: MsgSource, causedBy?: Error) {
            let _this = this;

            if (!expr) {
                _this.fail(evalMsg, _this.getDetails(), this._$stackFn, causedBy);
            }
        
            return _this;
        },
        fail: function (msg: MsgSource, details: any, stackStart?: Function | Function[], causedBy?: Error) {
            let _this = this;
            let theStack = null;
            
            if (!theOptions.v.fullStack) {
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

            throw new AssertionFailure(_this.getMessage(msg), causedBy, details || _this.getDetails(), theStack);
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
        opts: null,
        orgArgs: null
    };

    objDefine(context, "_$stackFn", {
        v: theStack,
        e: false
    });

    objDefine(context as any, cScopeContextTag, {
        v: true,
        e: false
    });
    
    if (stackStart) {
        context._$stackFn.push(stackStart);
    }

    return objDefineProps<IScopeContext>(context, {
        opts: {
            g: () => theOptions.v
        },
        value: {
            g: () => value
        },
        orgArgs: {
            g: () => orgArgs
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
        _$stackFn: null,
        value: null,
        getMessage: _proxyFn(parent, "getMessage", overrides),
        getEvalMessage: _proxyFn(parent, "getEvalMessage", overrides),
        getDetails: _proxyFn(parent, "getDetails", overrides),
        eval: _proxyFn(parent, "eval", overrides),
        fail: _proxyFn(parent, "fail", overrides),
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
        opts: null,
        orgArgs: null
    };

    objDefine(newContext as any, cScopeContextTag, {
        v: true,
        e: false
    });

    return objDefineProps(newContext, {
        _$stackFn: {
            v: childStack,
            e: false
        },
        "opts": {
            g: () => parent.opts
        },
        value: {
            g: () => value
        },
        orgArgs: {
            g: () => parent.orgArgs
        }
    });
}

