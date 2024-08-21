/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { AssertionFailure } from "../../../src/assert/assertionError";
import { expect } from "../../../src/assert/expect";
import { checkError } from "../support/checkError";

describe("expect.fail", () => {

    it("simple", function () {
        checkError(function () {
            expect(1).fail(); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            expect(1).fail("Hello Darkness, my old friend"); // Throws AssertionError
        }, /Hello Darkness/);

        checkError(function () {
            expect(1).fail(() => "Looks like we have failed again"); // Throws AssertionError
        }, /Looks like we have failed again/);
    });

    it("null", function () {
        checkError(function () {
            expect(null).fail(); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            expect(null).fail(null as any); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            expect(null).fail(null as any, null); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            expect(null).fail(null as any, null, null as any); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            expect(null).fail(null as any, null, null as any, null as any); // Throws AssertionError
        }, /assert.*failure/);
    });

    it("undefined", function () {
        checkError(function () {
            expect(undefined).fail(); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            expect(undefined).fail(undefined as any); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            expect(undefined).fail(undefined as any, undefined); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            expect(undefined).fail(undefined as any, undefined, undefined as any); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            expect(undefined).fail(undefined as any, undefined, undefined as any, undefined as any); // Throws AssertionError
        }, /assert.*failure/);
    });
    it("should always fail with message", function () {
        checkError(function () {
            expect(1).fail("Hello Darkness, my old friend");
        }, /Hello Darkness/);
    });

    it("Should produce default message", function () {
        checkError(function () {
            expect(null).fail();
        }, /assert.*failure/);
    });

    it("Reference as property", function () {
        checkError(function () {
            (expect(null) as any)["fail"](); // Throws AssertionError
        }, /assert.*failure/);

        checkError(function () {
            (expect(null) as any)["fail"]("Hello Darkness, my old friend"); // Throws AssertionError
        }, /Hello Darkness/);

        checkError(function () {
            (expect(null) as any)["fail"](() => "Looks like we have failed again"); // Throws AssertionError
        }, /Looks like we have failed again/);

        checkError(function () {
            (expect(null) as any)["fail"]();
        }, /assert.*failure/);
    });

    it("Extended format", function () {
        checkError(function () {
            expect(null).fail(1, 2, "Expected 1 to equal 2", "==");
        }, /Expected 1 to equal 2/);
    });

    it("Check error type", function () {
        expect(() => {
            expect(null).fail();
        }).to.throw(AssertionFailure);
    });

    describe("Negation doesn't work", function () {

        it("simple", function () {
            checkError(function () {
                expect(1).not.fail(); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                expect(1).not.fail("Hello Darkness, my old friend"); // Throws AssertionError
            }, /Hello Darkness/);

            checkError(function () {
                expect(1).not.fail(() => "Looks like we have failed again"); // Throws AssertionError
            }, /Looks like we have failed again/);
        });

        it("null", function () {
            checkError(function () {
                expect(null).not.fail(); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                expect(null).not.fail(null as any); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                expect(null).not.fail(null as any, null); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                expect(null).not.fail(null as any, null, null as any); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                expect(null).not.fail(null as any, null, null as any, null as any); // Throws AssertionError
            }, /assert.*failure/);
        });

        it("undefined", function () {
            checkError(function () {
                expect(undefined).not.fail(); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                expect(undefined).not.fail(undefined as any); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                expect(undefined).not.fail(undefined as any, undefined); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                expect(undefined).not.fail(undefined as any, undefined, undefined as any); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                expect(undefined).not.fail(undefined as any, undefined, undefined as any, undefined as any); // Throws AssertionError
            }, /assert.*failure/);
        });

        it("should always fail with message", function () {
            checkError(function () {
                expect(1).not.fail("Hello Darkness, my old friend");
            }, /Hello Darkness/);
        });

        it("Should produce default message", function () {
            checkError(function () {
                expect(null).not.fail();
            }, /assert.*failure/);
        });

        it("Reference as property", function () {
            checkError(function () {
                (expect(null).not as any)["fail"](); // Throws AssertionError
            }, /assert.*failure/);

            checkError(function () {
                (expect(null).not as any)["fail"]("Hello Darkness, my old friend"); // Throws AssertionError
            }, /Hello Darkness/);

            checkError(function () {
                (expect(null).not as any)["fail"](() => "Looks like we have failed again"); // Throws AssertionError
            }, /Looks like we have failed again/);

            checkError(function () {
                (expect(null).not as any)["fail"]();
            }, /assert.*failure/);
        });

        it("Extended format", function () {
            checkError(function () {
                expect(null).not.fail(1, 2, "Expected 1 to equal 2", "==");
            }, /Expected 1 to equal 2/);
        });
    });
});
