/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createEvalAdapter } from "../../../src/assert/adapters/evalAdapter";
import { addAssertFuncs, createAssert } from "../../../src/assert/assertClass";
import { IAssertClass, IExtendedAssert } from "../../../src/assert/interface/IAssertClass";
import { checkError } from "../support/checkError";

describe("addAssertFuncs", function () {
    this.timeout(5000);

    interface UserAssertExtensions {
        isPositive: (value: number) => void;
        isNegative: (value: number) => void;
        isMyArray: (value: any) => void;
        isDarkness: (value: any) => void;
    }

    let assert: IAssertClass;

    beforeEach(() => {
        assert = createAssert();
    });

    describe("basic functionality", () => {
        it("should add multiple assertion functions at once", () => {
            addAssertFuncs(assert, {
                isPositive: createEvalAdapter((value: any) => value > 0),
                isNegative: createEvalAdapter((value: any) => value < 0)
            });

            let userAssert = assert as IExtendedAssert<UserAssertExtensions>;
            userAssert.isPositive(1);
            userAssert.isNegative(-1);
        });

        it("should add functions with string definitions", () => {
            addAssertFuncs(assert, {
                isMyArray: "is.array",
                isDarkness: "is.object"
            });

            let userAssert = assert as IExtendedAssert<UserAssertExtensions>;
            userAssert.isMyArray([]);
            userAssert.isDarkness({});
        });

        it("should add functions with array string definitions", () => {
            addAssertFuncs(assert, {
                isMyArray: ["is", "array"],
                isDarkness: ["is", "object"]
            });

            let userAssert = assert as IExtendedAssert<UserAssertExtensions>;
            userAssert.isMyArray([]);
            userAssert.isDarkness({});
        });

        it("should add functions with mixed definition types", () => {
            addAssertFuncs(assert, {
                isPositive: createEvalAdapter((value: any) => value > 0),
                isMyArray: "is.array",
                isDarkness: ["is", "object"]
            });

            let userAssert = assert as IExtendedAssert<UserAssertExtensions>;
            userAssert.isPositive(1);
            userAssert.isMyArray([]);
            userAssert.isDarkness({});
        });

        it("should add functions with IAssertClassDef objects", () => {
            addAssertFuncs(assert, {
                isPositive: {
                    scopeFn: createEvalAdapter((value: any) => value > 0),
                    nArgs: 1
                },
                isNegative: {
                    scopeFn: createEvalAdapter((value: any) => value < 0),
                    nArgs: 2,
                    mIdx: 1
                }
            });

            let userAssert = assert as IExtendedAssert<UserAssertExtensions>;
            userAssert.isPositive(1);
            userAssert.isNegative(-1);
        });
    });

    describe("invalid definitions", () => {
        interface InvalidExtensions {
            invalidFunc: (value: any) => void;
            invalidArray: (value: any) => void;
            invalidEmpty: (value: any) => void;
            invalidNoScopeFn: (value: any) => void;
            invalidNonFunction: (value: any) => void;
        }

        it("should throw AssertionError for non-string/non-function/non-array definitions", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    invalidFunc: 123 as any
                });
            }, "Invalid definition for invalidFunc");
        });

        it("should throw AssertionError for empty array definition", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    invalidEmpty: []
                });
            }, "Invalid definition for invalidEmpty");
        });

        it("should throw AssertionError for array with non-string elements", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    invalidArray: [123, "hello"] as any
                });
            }, "Invalid definition for invalidArray");
        });

        it("should throw AssertionError for IAssertClassDef without scopeFn", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    invalidNoScopeFn: {
                        nArgs: 1
                    } as any
                });
            }, "Invalid definition for invalidNoScopeFn");
        });

        it("should throw AssertionError for IAssertClassDef with non-function scopeFn", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    invalidNonFunction: {
                        scopeFn: "not a function" as any
                    }
                });
            }, "Invalid definition for invalidNonFunction");
        });

        it("should throw AssertionError for null definition", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    invalidFunc: null as any
                });
            }, "Invalid definition for invalidFunc");
        });

        it("should throw AssertionError for undefined definition", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    invalidFunc: undefined as any
                });
            }, "Invalid definition for invalidFunc");
        });

        it("should throw AssertionError for object without scopeFn or alias", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    invalidFunc: { someProperty: "value" } as any
                });
            }, "Invalid definition for invalidFunc");
        });

        it("should handle multiple invalid definitions and report the first error", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    invalidFunc1: 123 as any,
                    invalidFunc2: null as any,
                    validFunc: createEvalAdapter(() => true)
                });
            }, "Invalid definition");
        });
    });

    describe("alias definitions", () => {
        interface AliasExtensions {
            myEqual: (actual: any, expected: any, message?: string) => void;
            myEq: (actual: any, expected: any, message?: string) => void;
            myStrictEqual: (actual: any, expected: any, message?: string) => void;
            myDeepEqual: (actual: any, expected: any, message?: string) => void;
            chainedAlias: (actual: any, expected: any, message?: string) => void;
        }

        it("should create an alias to an existing function", () => {
            addAssertFuncs(assert, {
                myEqual: { alias: "equal" }
            });

            let userAssert = assert as IExtendedAssert<AliasExtensions>;
            userAssert.myEqual(1, 1); // Should work like assert.equal
            checkError(() => {
                userAssert.myEqual(1, 2);
            }, "expected 1 to equal 2");
        });

        it("should create multiple aliases", () => {
            addAssertFuncs(assert, {
                myEqual: { alias: "equal" },
                myEq: { alias: "equal" },
                myStrictEqual: { alias: "strictEqual" }
            });

            let userAssert = assert as IExtendedAssert<AliasExtensions>;
            userAssert.myEqual(1, 1);
            userAssert.myEq(1, 1);
            userAssert.myStrictEqual(1, 1);
        });

        it("should preserve error messages from aliased functions", () => {
            addAssertFuncs(assert, {
                myEqual: { alias: "equal" }
            });

            let userAssert = assert as IExtendedAssert<AliasExtensions>;
            checkError(() => {
                userAssert.myEqual(5, 10);
            }, "expected 5 to equal 10");
        });

        it("should support aliases with custom messages", () => {
            addAssertFuncs(assert, {
                myEqual: { alias: "equal" }
            });

            let userAssert = assert as IExtendedAssert<AliasExtensions>;
            checkError(() => {
                userAssert.myEqual(5, 10, "Custom message");
            }, "Custom message: expected 5 to equal 10");
        });

        it("should allow alias to point to another alias", () => {
            addAssertFuncs(assert, {
                myEqual: { alias: "equal" },
                chainedAlias: { alias: "myEqual" }
            });

            let userAssert = assert as IExtendedAssert<AliasExtensions>;
            userAssert.chainedAlias(1, 1);
            checkError(() => {
                userAssert.chainedAlias(1, 2);
            }, "expected 1 to equal 2");
        });

        it("should create alias alongside regular function definitions", () => {
            addAssertFuncs(assert, {
                myEqual: { alias: "equal" },
                isPositive: createEvalAdapter((value: any) => value > 0),
                isMyArray: "is.array"
            });

            let userAssert = assert as IExtendedAssert<AliasExtensions & UserAssertExtensions>;
            userAssert.myEqual(1, 1);
            userAssert.isPositive(1);
            userAssert.isMyArray([]);
        });

        it("should work with deepEqual alias", () => {
            addAssertFuncs(assert, {
                myDeepEqual: { alias: "deepEqual" }
            });

            let userAssert = assert as IExtendedAssert<AliasExtensions>;
            userAssert.myDeepEqual({ a: 1, b: 2 }, { a: 1, b: 2 });
            checkError(() => {
                userAssert.myDeepEqual({ a: 1 }, { a: 2 });
            }, /expected .* to deeply equal .*/);
        });

        it("should maintain correct this context in aliased functions", () => {
            addAssertFuncs(assert, {
                myEqual: { alias: "equal" }
            });

            let userAssert = assert as IExtendedAssert<AliasExtensions>;
            // Should not throw - verifies that 'this' context is maintained
            userAssert.myEqual(1, 1);
            userAssert.myEqual("hello", "hello");
            userAssert.myEqual(true, true);
        });

        it("should support aliases with all parameter types", () => {
            addAssertFuncs(assert, {
                myEqual: { alias: "deepEqual" }
            });

            let userAssert = assert as IExtendedAssert<AliasExtensions>;
            userAssert.myEqual(null, null);
            userAssert.myEqual(undefined, undefined);
            userAssert.myEqual([], []);
            userAssert.myEqual({}, {});
        });
    });

    describe("alias edge cases", () => {
        interface EdgeCaseExtensions {
            nonExistentAlias: (value: any) => void;
            selfAlias: (value: any) => void;
        }

        it("should handle alias to non-existent function", () => {
            addAssertFuncs(assert, {
                nonExistentAlias: { alias: "doesNotExist" }
            });

            let userAssert = assert as IExtendedAssert<EdgeCaseExtensions>;
            // Should throw error when trying to call non-existent function
            checkError(() => {
                userAssert.nonExistentAlias(1);
            }, /.*/); // Any error is acceptable here
        });

        it("should support alias with empty alias property", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    selfAlias: { alias: "" } as any
                });
            }, /.*/); // Should throw some error
        });
    });

    describe("mixed valid and alias definitions", () => {
        interface MixedExtensions {
            isPositive: (value: number) => void;
            myEqual: (actual: any, expected: any) => void;
            isMyArray: (value: any) => void;
            myDeepEqual: (actual: any, expected: any) => void;
        }

        it("should add both regular and alias functions in same call", () => {
            addAssertFuncs(assert, {
                isPositive: createEvalAdapter((value: any) => value > 0),
                myEqual: { alias: "equal" },
                isMyArray: "is.array",
                myDeepEqual: { alias: "deepEqual" }
            });

            let userAssert = assert as IExtendedAssert<MixedExtensions>;
            userAssert.isPositive(1);
            userAssert.myEqual(1, 1);
            userAssert.isMyArray([]);
            userAssert.myDeepEqual({ a: 1 }, { a: 1 });
        });

        it("should fail for invalid definitions even with valid aliases", () => {
            checkError(() => {
                addAssertFuncs(assert, {
                    myEqual: { alias: "equal" },
                    invalidFunc: 123 as any,
                    isPositive: createEvalAdapter(() => true)
                });
            }, "Invalid definition");
        });
    });
});
