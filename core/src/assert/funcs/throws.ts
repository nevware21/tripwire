/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { isError, isFunction, isObject, isRegExp, isStrictNullOrUndefined, isString, strIndexOf } from "@nevware21/ts-utils";
import { MsgSource } from "../interface/types";
import { IAssertScope } from "../interface/IAssertScope";

const enum MatchError {
    Nothing = 0x00,
    ErrorInstance = 0x01,
    ErrorType = 0x02,
    MessageContains = 0x10,
    MessageMatches = 0x20,
    MessageEquals = 0x30
}

 interface IErrorMatch {
    result: boolean;
    errorLike?: ErrorConstructor | Error;
    matchError: MatchError;
}

const cErrorFnErrors: { [key: number]: MsgSource } = {
    [MatchError.Nothing]: "expected {value} to be an Error instance",
    [MatchError.ErrorInstance]: "expected {error} to be an instance of {errorLike}",
    [MatchError.ErrorType]: "expected {error} to be of {errorLike} type"
};

const cThrowsErrors: { [key: number]: MsgSource } = {
    [MatchError.Nothing]: null,
    [MatchError.ErrorInstance]: "expected {function} to throw a {errorLike} instance but {error} was thrown",
    [MatchError.ErrorType]: "expected {function} to throw an error of type {errorLike} but threw {error}",
    [MatchError.MessageContains]: "expected {function} to throw an error with a message containing {msgMatch} but it was {message}",
    [MatchError.MessageMatches]: "expected {function} to throw an error with a message matching {msgMatch} but it was {message}",
    [MatchError.MessageEquals]: "expected {function} to throw an error with a message equal to {msgMatch} but it was {message}",
    [MatchError.ErrorInstance | MatchError.MessageContains]: "expected {function} to throw a {errorLike} instance with a message containing {msgMatch} but {error} was thrown",
    [MatchError.ErrorInstance | MatchError.MessageMatches]: "expected {function} to throw a {errorLike} instance with a message matching {msgMatch} but {error} was thrown",
    [MatchError.ErrorInstance | MatchError.MessageEquals]: "expected {function} to throw a {errorLike} instance with a message equal to {msgMatch} but {error} was thrown",
    [MatchError.ErrorType | MatchError.MessageContains]: "expected {function} to throw an error of type {errorLike} with a message containing {msgMatch} but {error} was thrown",
    [MatchError.ErrorType | MatchError.MessageMatches]: "expected {function} to throw an error of type {errorLike} with a message matching {msgMatch} but {error} was thrown",
    [MatchError.ErrorType | MatchError.MessageEquals]: "expected {function} to throw an error of type {errorLike} with a message equal to {msgMatch} but {error} was thrown"
};

function _isError(value: any): value is Error {
    return isError(value) || (value && value instanceof Error);
}

export function throwsFunc<R>(this: IAssertScope, errorLike?: ErrorConstructor | Error | string | RegExp, msgMatch?: string | RegExp, evalMsg?: MsgSource): R {
    let scope = this;
    let context = scope.context;
    let value = context.value;

    // Make sure that the value is a function
    if (!isFunction(value)) {
        scope.fatal("expected {value} to be a function");
    }

    let argCount = arguments.length;
    let theMsg: MsgSource = evalMsg;       // Assume the message is the last argument
    let expCaught: Error = null;

    if (isString(errorLike) || isRegExp(errorLike)) {
        // Looks like throws(msgMatch: string | Regexp, evalMsg?: MsgSource)
        msgMatch = errorLike;
        errorLike = null;
        if (argCount === 2) {
            // If there are only two arguments, then the second argument is the message
            theMsg = msgMatch as string;
        }
    } else if (argCount > 0) {
        if (errorLike) {
            // Looks like throws(errorLike: Error | ErrorConstructor, msgMatch?: string | RegExp, evalMsg?: MsgSource)
            context.set("errorLike", errorLike);
        } else {
            // Looks like throws(msgMatch?: string | RegExp, evalMsg?: MsgSource)
            errorLike = null;
            if (argCount === 2) {
                // If there are only two arguments, then the second argument is the message
                theMsg = msgMatch as string;
            }
        }
    }
    if (!isStrictNullOrUndefined(msgMatch)) {
        context.set("msgMatch", msgMatch);
    }

    let newScope: IAssertScope = null;
    let result: any = null;
    try {
        result = value();
    } catch (e) {
        expCaught = e;
        newScope = scope.newScope(expCaught);
        let newContext = newScope.context;
        newContext.set("function", value);
        newContext.set("error", expCaught);
        newContext.set("message", _isError(expCaught) ? expCaught.message : expCaught);

        let errorLikeResult = _isErrorLikeCompatible(expCaught, errorLike as ErrorConstructor | Error);
        let msgResult = _isErrorMessageCompatible(expCaught, msgMatch);

        let combinedMsg = cThrowsErrors[errorLikeResult.matchError | msgResult.matchError] || "expected {function} to throw an error but {error} was thrown";
        
        newContext.eval(errorLikeResult.result && msgResult.result, theMsg || combinedMsg, e);

        return newScope.that;
    }

    // If we get here, then the function did not throw an error
    // Running through the context will throw an error unless
    // the context was negated like (not.throws(...))
    context.eval(false, theMsg || "expected {value} to throw an error");
            
    // If the context was not negated, then we need to throw an error and we would not get here
    newScope = scope.newScope(result);

    return newScope.that;
}

/**
 * Checks if the current value an error and optionally compares it to the expected error
 * @param this - The current {@link IAssertScope} object
 * @param errorLike - The error or error constructor to compare the value to
 * @param evalMsg - The message to display if the value is not an error
 * @returns The current {@link IAssertScope.that} (`this`) object
 */
export function isErrorFunc<R>(this: IAssertScope, errorLike?: ErrorConstructor | Error, evalMsg?: MsgSource): R {
    let context = this.context;
    let errorValue = context.value;

    if (errorLike) {
        context.set("errorLike", errorLike);
    }

    context.set("error", errorValue);

    if (errorLike) {
        let errorLikeResult = _isErrorLikeCompatible(errorValue, errorLike);

        context.eval(errorLikeResult.result, evalMsg || cErrorFnErrors[errorLikeResult.matchError] || cErrorFnErrors[MatchError.Nothing]);
    } else {
        context.eval(_isError(errorValue), evalMsg || cErrorFnErrors[MatchError.Nothing]);
    }

    return this.that;
}

function _isErrorLikeCompatible(errorValue: any, errorLike: ErrorConstructor | Error): IErrorMatch {
    let errError: Error = null;
    let errType: ErrorConstructor = null;

    if (errorLike) {
        if (_isError(errorLike)) {
            // Looks like throws(errorLike: Error, msgMatch?: string | RegExp, evalMsg?: MsgSource)
            errError = errorLike;
        } else {
            // Looks like throws(errorLike: ErrorConstructor, msgMatch?: string | RegExp, evalMsg?: MsgSource)
            errType = errorLike;
        }

        if (errError instanceof Error || _isError(errError)) {
            // The error is an Error instance, so compare the constructors of the error and the value
            return {
                result: errorValue && (errorValue.constructor instanceof errError.constructor || errorValue instanceof errError.constructor),
                errorLike: errorLike,
                matchError: MatchError.ErrorInstance
            };
        }
        
        if ((isObject(errType) || isFunction(errType)) && "constructor" in errType) {
            // The error is a constructor, so check if the value is an instance of the error
            return {
                result: errorValue && (errorValue.constructor === errType || errorValue instanceof errType),
                errorLike: errorLike,
                matchError: MatchError.ErrorType
            };
            //, evalMsg || "expected {value} to be of {errorLike} type.");
        }

        return {
            result: errorValue instanceof errType,
            errorLike: errorLike,
            matchError: MatchError.ErrorType
        };
    }
    
    // We where not given a specific error to compare to, so just check if the value is an error
    return {
        result: true,
        matchError: MatchError.Nothing
    };
    //, evalMsg || "expected {value} to be an Error instance");
}

function _isErrorMessageCompatible(errorValue: Error, msgMatch: string | RegExp): IErrorMatch {
    let message = _isError(errorValue) ? errorValue.message : errorValue;
    if (isString(msgMatch)) {
        return {
            result: message == msgMatch || strIndexOf(message, msgMatch) >= 0,
            matchError: MatchError.MessageContains
        }
    }

    if (isRegExp(msgMatch)) {
        return {
            result: msgMatch.test(message),
            matchError: MatchError.MessageMatches
        };
    }

    if (msgMatch) {
        return {
            result: msgMatch == message,
            matchError: MatchError.MessageEquals
        };
    }

    return {
        result: true,
        matchError: MatchError.Nothing
    };
}