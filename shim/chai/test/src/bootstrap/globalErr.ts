import { AssertionError, CHECK_INTERNAL_STACK_FRAME_REGEX, expect } from "@nevware21/tripwire";
import { arrSlice, dumpObj, isFunction, strTrim } from "@nevware21/ts-utils";
import { objForEachKey } from "@nevware21/ts-utils";

const rInnerException = /Inner Exception.*/;

var isStackSupported = false;
if (typeof Error.captureStackTrace !== "undefined") {
    try {
        throw Error();
    } catch (err) {
        if (typeof err.stack !== "undefined") {
            isStackSupported = true;
        }
    }
}

function _type(obj: any): string {
    if (typeof obj === "undefined") {
        return "undefined";
    }
    
    if (obj === null) {
        return "null";
    }
  
    const stringTag = obj[Symbol.toStringTag];
    if (typeof stringTag === "string") {
        return stringTag;
    }

    const type = Object.prototype.toString.call(obj).slice(8, -1);

    return type;
}
  
/**
 * Validate that the given function throws an error.
 *
 * By default, also validate that the thrown error's stack trace doesn't contain
 * Chai implementation frames. Stack trace validation can be disabled by
 * providing a truthy `skipStackTest` argument.
 *
 * Optionally validate some additional properties of the error:
 *
 * If val is a string, validate val equals the error's .message
 * If val is a regex, validate val matches the error's .message
 * If val is an object, validate val's props are included in the error object
 *
 * @param {Function} function that's expected to throw an error
 * @param {Mixed} expected properties of the expected error
 * @param {Boolean} skipStackTest if truthy, don't validate stack trace
 */
export function globalErr<T>(fn: Function, val?: T, skipStackTest?: boolean) {
    if (!isFunction(fn)) {
        throw new AssertionError("Invalid fn");
    }

    try {
        fn();
    } catch (err) {
        if (isStackSupported && !skipStackTest) {
            let theStack: string = err.stack;
            if (theStack) {
                let stackLines = theStack.split("\n");
                for (let lp = 0; lp < stackLines.length; lp++) {
                    if (rInnerException.test(stackLines[lp])) {
                        stackLines = arrSlice(stackLines, 0, lp);
                        break;
                    }
                }

                theStack = stackLines.join("\n");
                if (strTrim(theStack) === "") {
                    theStack = "";
                }

                if (CHECK_INTERNAL_STACK_FRAME_REGEX.test(theStack)) {
                    throw new AssertionError("implementation frames not properly filtered from stack trace", err);
                }
                if (theStack.indexOf("globalErr") === -1) {
                    console.error("globalErr missing - " + dumpObj(err));
                }
                
                expect(theStack).contains("globalErr").not.match(
                    CHECK_INTERNAL_STACK_FRAME_REGEX,
                    "implementation frames not properly filtered from stack trace {value}"
                );
            }
        }

        // try {
        switch (_type(val).toLowerCase()) {
            case "undefined":
                return;
            case "string":
                if (err.message.indexOf(val as string) === -1) {
                    throw new AssertionError("Expected an error with [" + val + "] but got [" + err.message + "]", err);
                }
                return;
                // return expect(err.message).to.include(val);
            case "regexp":
                if (!(val as RegExp).test(err.message)) {
                    throw new AssertionError("Expected an error to match [" + val + "] but got [" + err.message + "]", err);
                }
                return;
                //return expect(err.message).to.match(val as RegExp);
            case "object":
                return objForEachKey(val, (key) =>{
                    expect(err).to.have.property(key).value.to.deep.equal((val as any)[key]);
                });
        }
        // } catch (e) {
        //     throw new AssertionError("Failed val - " + dumpObj(val), e);
        // }

        throw new AssertionError("Invalid val - " + dumpObj(val), err);
    }

    throw new AssertionError("Expected an error with [" + dumpObj(val) + "] but no error was thrown");
}
