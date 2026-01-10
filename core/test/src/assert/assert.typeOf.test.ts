/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { AssertionFailure } from "../../../src/assert/assertionError";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("assert.typeOf", () => {
    describe("strings", () => {
        it("should pass when value is a string and type is 'string'", () => {
            assert.typeOf("hello", "string");
            assert.typeOf("", "string");
            assert.typeOf(String("test"), "string");
        });

        it("should throw when value is a string but type is not 'string'", () => {
            checkError(() => {
                assert.typeOf("hello", "number");
            }, "expected \"hello\" to be of type number but got string");

            expect(() => assert.typeOf("hello", "number")).toThrow(AssertionFailure);
        });
    });

    describe("numbers", () => {
        it("should pass when value is a number and type is 'number'", () => {
            assert.typeOf(123, "number");
            assert.typeOf(0, "number");
            assert.typeOf(-456.789, "number");
            assert.typeOf(Infinity, "number");
            assert.typeOf(-Infinity, "number");
            assert.typeOf(NaN, "number");
        });

        it("should throw when value is a number but type is not 'number'", () => {
            checkError(() => {
                assert.typeOf(123, "string");
            }, "expected 123 to be of type string but got number");

            expect(() => assert.typeOf(123, "string")).toThrow(AssertionFailure);
        });
    });

    describe("booleans", () => {
        it("should pass when value is a boolean and type is 'boolean'", () => {
            assert.typeOf(true, "boolean");
            assert.typeOf(false, "boolean");
        });

        it("should throw when value is a boolean but type is not 'boolean'", () => {
            checkError(() => {
                assert.typeOf(true, "number");
            }, "expected true to be of type number but got boolean");

            expect(() => assert.typeOf(false, "string")).toThrow(AssertionFailure);
        });
    });

    describe("objects", () => {
        it("should pass when value is an object and type is 'object'", () => {
            assert.typeOf({}, "object");
            assert.typeOf({ a: 1 }, "object");
            assert.typeOf([], "object");
            assert.typeOf([1, 2, 3], "object");
            assert.typeOf(null, "object");
            assert.typeOf(new Date(), "object");
        });

        it("should throw when value is an object but type is not 'object'", () => {
            checkError(() => {
                assert.typeOf({}, "string");
            }, "expected {} to be of type string but got object");

            expect(() => assert.typeOf([], "function")).toThrow(AssertionFailure);
        });
    });

    describe("functions", () => {
        it("should pass when value is a function and type is 'function'", () => {
            assert.typeOf(() => {}, "function");
            assert.typeOf(function() {}, "function");
            assert.typeOf(Function, "function");
            assert.typeOf(assert.typeOf, "function");

            //assert.typeOf(async function() { }, "asyncfunction");
            //assert.typeOf(function* () {}, "generatorfunction");
            //assert.typeOf(async function* () { }, "asyncgeneratorfunction");
        });

        it("should throw when value is a function but type is not 'function'", () => {
            checkError(() => {
                assert.typeOf(() => {}, "object");
            }, "to be of type object but got function");

            expect(() => assert.typeOf(function() {}, "string")).toThrow(AssertionFailure);
        });
    });

    describe("undefined", () => {
        it("should pass when value is undefined and type is 'undefined'", () => {
            assert.typeOf(undefined, "undefined");
            let x: any;
            assert.typeOf(x, "undefined");
        });

        it("should throw when value is undefined but type is not 'undefined'", () => {
            checkError(() => {
                assert.typeOf(undefined, "object");
            }, "expected undefined to be of type object but got undefined");

            expect(() => assert.typeOf(undefined, "string")).toThrow(AssertionFailure);
        });
    });

    describe("null", () => {
        it("should pass when value is null and type is 'null'", () => {
            assert.typeOf(null, "null");
        });

        it("should throw when value is null but type is not 'null'", () => {
            checkError(() => {
                assert.typeOf(null, "string");
            }, "expected null to be of type string but got null");

            expect(() => assert.typeOf(null, "string")).toThrow(AssertionFailure);
        });

        it("should pass for null when type is 'object'", () => {
            expect(null).is.typeOf("object");
        });
    });

    describe("symbols", () => {
        it("should pass when value is a symbol and type is 'symbol'", () => {
            assert.typeOf(Symbol(), "symbol");
            assert.typeOf(Symbol("test"), "symbol");
            assert.typeOf(Symbol.iterator, "symbol");
        });

        it("should throw when value is a symbol but type is not 'symbol'", () => {
            checkError(() => {
                assert.typeOf(Symbol(), "string");
            }, "to be of type string but got symbol");

            expect(() => assert.typeOf(Symbol("test"), "object")).toThrow(AssertionFailure);
        });
    });

    describe("bigint", () => {
        it("should pass when value is a bigint and type is 'bigint'", () => {
            assert.typeOf(BigInt(123), "bigint");
            assert.typeOf(BigInt(0), "bigint");
            assert.typeOf(BigInt("9007199254740991"), "bigint");
        });

        it("should throw when value is a bigint but type is not 'bigint'", () => {
            checkError(() => {
                assert.typeOf(BigInt(123), "number");
            }, "to be of type number but got bigint");

            expect(() => assert.typeOf(BigInt(0), "string")).toThrow(AssertionFailure);
        });
    });

    describe("custom messages", () => {
        it("should throw with custom message when assertion fails", () => {
            const customMessage = "Custom error message";

            checkError(() => {
                assert.typeOf("hello", "number", customMessage);
            }, customMessage);

            expect(() => assert.typeOf("hello", "number", customMessage)).toThrow(new AssertionFailure(customMessage));
        });
    });
});

describe("assert.notTypeOf", () => {
    describe("strings", () => {
        it("should pass when value is not of the specified type", () => {
            assert.notTypeOf("hello", "number");
            assert.notTypeOf("hello", "boolean");
            assert.notTypeOf("hello", "object");
            assert.notTypeOf("hello", "function");
            assert.notTypeOf("hello", "undefined");
        });

        it("should throw when value is of the specified type", () => {
            checkError(() => {
                assert.notTypeOf("hello", "string");
            }, "not expected \"hello\" to be of type string but got string");

            expect(() => assert.notTypeOf("hello", "string")).toThrow(AssertionFailure);
        });
    });

    describe("numbers", () => {
        it("should pass when value is not of the specified type", () => {
            assert.notTypeOf(123, "string");
            assert.notTypeOf(123, "boolean");
            assert.notTypeOf(123, "object");
            assert.notTypeOf(123, "function");
        });

        it("should throw when value is of the specified type", () => {
            checkError(() => {
                assert.notTypeOf(123, "number");
            }, "not expected 123 to be of type number but got number");

            expect(() => assert.notTypeOf(456, "number")).toThrow(AssertionFailure);
        });
    });

    describe("objects", () => {
        it("should pass when value is not of the specified type", () => {
            assert.notTypeOf({}, "string");
            assert.notTypeOf({}, "number");
            assert.notTypeOf({}, "function");
        });

        it("should throw when value is of the specified type", () => {
            checkError(() => {
                assert.notTypeOf({}, "object");
            }, "not expected {} to be of type object but got object");

            expect(() => assert.notTypeOf([], "object")).toThrow(AssertionFailure);
        });
    });

    describe("functions", () => {
        it("should pass when value is not of the specified type", () => {
            assert.notTypeOf(() => {}, "string");
            assert.notTypeOf(() => {}, "number");
            assert.notTypeOf(() => {}, "object");
        });

        it("should throw when value is of the specified type", () => {
            checkError(() => {
                assert.notTypeOf(() => {}, "function");
            }, "not expected");

            expect(() => assert.notTypeOf(function() {}, "function")).toThrow(AssertionFailure);
        });
    });

    describe("custom messages", () => {
        it("should throw with custom message when assertion fails", () => {
            const customMessage = "Custom error message";

            checkError(() => {
                assert.notTypeOf("hello", "string", customMessage);
            }, customMessage + ": not expected \"hello\" to be of type string but got string");

            expect(() => assert.notTypeOf("hello", "string", customMessage)).toThrow(new AssertionFailure(customMessage));
        });
    });
});

describe("expect.is.typeof", () => {
    describe("basic usage", () => {
        it("should pass when value matches the expected type", () => {
            expect("hello").is.typeOf("string");
            expect(123).to.be.typeOf("number");
            expect(true).is.typeOf("boolean");
            expect({}).to.be.typeOf("object");
            expect(() => {}).is.typeOf("function");
            expect(undefined).to.be.typeOf("undefined");
            expect(Symbol()).is.typeOf("symbol");
            expect(BigInt(123)).to.be.typeOf("bigint");
        });

        it("should throw when value does not match the expected type", () => {
            checkError(() => {
                expect("hello").is.typeOf("number");
            }, "expected \"hello\" to be of type number but got string");

            expect(() => expect(123).to.be.typeOf("string")).toThrow(AssertionFailure);
        });
    });

    describe("with custom messages", () => {
        it("should throw with custom message when assertion fails", () => {
            const customMessage = "Should be a number";
            checkError(() => {
                expect("hello").is.typeOf("number", customMessage);
            }, customMessage);
        });
    });

    describe("arrays and objects", () => {
        it("should pass for arrays when type is 'object'", () => {
            expect([]).is.typeOf("object");
            expect([1, 2, 3]).to.be.typeOf("object");
            expect([]).is.typeOf("array");
            expect([1, 2, 3]).to.be.typeOf("array");
        });

        it("should pass for null when type is 'object'", () => {
            expect(null).is.typeOf("object");
        });
    });
});

describe("expect.is.not.typeof", () => {
    describe("basic usage", () => {
        it("should pass when value does not match the expected type", () => {
            expect("hello").is.not.typeOf("number");
            expect(123).to.not.be.typeOf("string");
            expect(true).is.not.typeOf("object");
            expect({}).to.not.be.typeOf("function");
            expect(() => {}).is.not.typeOf("string");
        });

        it("should throw when value matches the expected type", () => {
            checkError(() => {
                expect("hello").is.not.typeOf("string");
            }, "not expected \"hello\" to be of type string but got string");

            expect(() => expect(123).to.not.be.typeOf("number")).toThrow(AssertionFailure);
        });
    });

    describe("with custom messages", () => {
        it("should throw with custom message when assertion fails", () => {
            const customMessage = "Should not be a string";
            checkError(() => {
                expect("hello").is.not.typeOf("string", customMessage);
            }, "not " + customMessage);
        });
    });
});
