/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createEvalAdapter } from "../../../src/assert/adapters/evalAdapter";
import { addAssertFunc, createAssert } from "../../../src/assert/assertClass";
import { AssertionError, AssertionFailure } from "../../../src/assert/assertionError";
import { expect } from "../../../src/assert/expect";
import { IAssertClass, IExtendedAssert } from "../../../src/assert/interface/IAssertClass";
import { checkError } from "../support/checkError";

describe("addAssertFunc", function () {
    this.timeout(5000);

    interface UserAssertExtensions {
        helloDarkness: (value: number) => void;
        isDarkness: (value: any) => void;
        isMyArray: (value: any) => void;
    }

    let assert: IAssertClass;

    beforeEach(() => {
        assert = createAssert();
    });

    it("should add a new assertion function that passes", () => {
        addAssertFunc(assert, "helloDarkness", createEvalAdapter((value: any) => value > 0));
        let userAssert: IExtendedAssert<UserAssertExtensions> = assert as IExtendedAssert<UserAssertExtensions>;

        userAssert.helloDarkness(1); // Passes
    });

    it("should add a new assertion function that fails", () => {
        addAssertFunc(assert, "helloDarkness", createEvalAdapter((value: any) => value > 0));
        expect(() => (assert as IExtendedAssert<UserAssertExtensions>).helloDarkness(0)).toThrow(AssertionFailure);
    });

    it("should add a new assertion function using a string definition", () => {
        addAssertFunc(assert, "isMyArray", "is.array");
        (assert as IExtendedAssert<UserAssertExtensions>).isMyArray([]); // Passes
    });

    it("should add a new assertion function using an array of strings definition", () => {
        addAssertFunc(assert, "isDarkness", ["is", "object"]);
        (assert as IExtendedAssert<UserAssertExtensions>).isDarkness({}); // Passes
    });

    it("should throw AssertionError for invalid function definition", () => {
        expect(() => addAssertFunc(assert, "invalidFunc", 123 as any)).toThrow(AssertionError);
    });

    it("should add a new assertion function with a custom message", () => {
        addAssertFunc(assert, "isMyArray", createEvalAdapter((value) => {
            if (!Array.isArray(value) || value.length === 0) {
                throw new AssertionFailure("Expected a non-empty array");
            }

            return true;
        }));
        (assert as IExtendedAssert<UserAssertExtensions>).isMyArray([1, 2, 3]); // Passes
        expect(() => (assert as IExtendedAssert<UserAssertExtensions>).isMyArray([])).toThrowError(new AssertionFailure("Expected a non-empty array"));
    });

    describe("invalid expressions", () => {
        interface ComplexUserAssertExtensions {
            myFunc: (value: any) => void;
            notNumber: (value: number) => void;
            funcNumber: (value: number) => void;
        }
    
        it("expression with functions", () => {
            addAssertFunc(assert, "myFunc", createEvalAdapter(() => true));
            addAssertFunc(assert, "notNumber", "not().is.number");
            addAssertFunc(assert, "funcNumber", "myFunc.is.number");
            checkError(() => {
                (assert as IExtendedAssert<ComplexUserAssertExtensions>).notNumber(1); // Passes
            }, "expected a function for \"not\"");

            // The functions are added to the assert not the IAssertInst
            checkError(() => {
                (assert as IExtendedAssert<ComplexUserAssertExtensions>).funcNumber(1); // Passes
            }, /Invalid step: myFunc /);
        });

        it("should throw AssertionError for invalid function definition", () => {
            checkError(() => {
                addAssertFunc(assert, "invalidExpr", "hello({{}}).darkness.my.old.frield");
            }, "Invalid expression: {{}}");

            checkError(() => {
                addAssertFunc(assert, "invalidExpr", "hello({{}).darkness.my.old.frield");
            }, "Invalid expression: {{}");

            checkError(() => {
                addAssertFunc(assert, "invalidExpr", "hello({{}}).darkness.my.old.frield");
            }, "Invalid expression: {{}}");

            checkError(() => {
                addAssertFunc(assert, "invalidExpr", "hello({()}).darkness.my.old.frield");
            }, "Invalid expression: hello({()})");

            checkError(() => {
                addAssertFunc(assert, "invalidExpr", "hello({(}).darkness.my.old.frield");
            }, "Invalid expression: hello({(})");

            checkError(() => {
                addAssertFunc(assert, "invalidExpr", "hello({)}).darkness.my.old.frield");
            }, "Invalid expression: hello({)})");

            checkError(() => {
                addAssertFunc(assert, "invalidExpr", "hello().darkness({)}).my.old.frield");
            }, "Invalid expression: hello().darkness({)})");

            checkError(() => {
                addAssertFunc(assert, "invalidExpr", [ "hello()", "darkness({()})", "my", "old", "frield" ]);
            }, "Invalid expression: hello().darkness({()})");
        });
    });

    describe("with valid expressions", () => {
        // interface ComplexUserAssertExtensions {
        //     myFunc: (value: any) => void;
        //     notNumber: (value: number) => void;
        //     funcNumber: (value: number) => void;
        // }
    
        it("numeric expression", () => {
            addAssertFunc(assert, "myFunc", createEvalAdapter(() => true));
            addAssertFunc(assert, "notNumber", "not({0}).is.number");
            addAssertFunc(assert, "funcNumber", "not({value}).is.number");
        });
    });
});
