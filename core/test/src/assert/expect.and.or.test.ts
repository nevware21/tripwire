/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";
import { assert } from "../../../src/assert/assertClass";
import { checkError } from "../support/checkError";
import { addAssertInstFunc } from "../../../src/assert/assertInst";
import { _clearAssertInstFuncs } from "../../../src/assert/internal/_AssertInstCore";
import { IAssertScope } from "../../../src/assert/interface/IAssertScope";
import { IAssertInst, IExtendedAssertInst } from "../../../src/assert/interface/IAssertInst";


/*
 * Every scope function returns `this.that`. Before this, `scope.that` at the moment a function ran
 * was the callable wrapper built for that same function, so a call returned a bare function and
 * nothing could follow it -- `expect(5).is.number().is.above(1)` threw on `.is`, although the
 * interfaces declared the chain valid.
 */
describe("chaining after a called assertion", () => {
    it("should return an instance that the chain can continue from", () => {
        expect(5).is.number().is.above(1);
        expect("abc").to.be.a.string().to.have.lengthOf(3);
        expect([1, 2]).is.array().to.have.lengthOf(2);
        expect({ a: 1, b: 2 }).to.have.property("a").and.has.property("b");
    });

    it("should report the failure of the later assertion", () => {
        checkError(() => {
            expect(5).is.number().is.above(10);
        }, "expected 5 to be above 10");

        checkError(() => {
            expect(5).is.string().is.above(1);
        }, "expected 5 to be a string");
    });

    it("should keep a not from earlier in the chain, as Chai does", () => {
        checkError(() => {
            expect(5).is.not.string().is.above(1);
        }, "not expected 5 to be above 1");
    });

    describe("custom instance functions", () => {
        interface IProbe {
            probe(): IAssertInst;
        }

        afterEach(() => {
            _clearAssertInstFuncs();
        });

        it("should chain after a custom function that returns this.that", () => {
            addAssertInstFunc("probe", function (this: IAssertScope) {
                this.context.eval(this.context.value === 7, "expected {value} to be 7");
                return this.that;
            });

            (expect(7) as IExtendedAssertInst<IProbe>).probe().to.equal(7);

            checkError(() => {
                (expect(8) as IExtendedAssertInst<IProbe>).probe().to.equal(8);
            }, "expected 8 to be 7");
        });
    });
});

describe("expect.and", () => {
    it("should continue the chain on the same value", () => {
        expect(5).is.number().and.is.above(1).and.is.below(10);
        expect("abc").to.be.a.string().and.to.have.lengthOf(3);
        expect(5).and.is.number();
    });

    it("should report whichever assertion fails", () => {
        checkError(() => {
            expect(5).is.number().and.is.above(10);
        }, "expected 5 to be above 10");

        checkError(() => {
            expect(5).is.string().and.is.above(1);
        }, "expected 5 to be a string");
    });

    it("should keep the chain's not, so prefer separate statements to drop a negation", () => {
        expect(5).is.not.string().and.is.above(10);

        checkError(() => {
            expect(5).is.not.string().and.is.above(1);
        }, "not expected 5 to be above 1");
    });

    it("should still continue on the parent object after a property result", () => {
        // `and` on a property result keeps asserting on the object; `that`/`value` switch to the property.
        expect({ a: 1, b: 2 }).has.property("a").and.has.property("b").and.is.object();
        expect({ a: { b: 2 } }).has.property("a").that.has.property("b").that.equal(2);
    });
});

describe("expect.or", () => {
    it("should pass when any clause passes", () => {
        expect(5).or((e) => e.is.number());
        expect(5).or((e) => e.is.string(), (e) => e.is.number());
        expect(5).or((e) => e.is.above(10), (e) => e.is.below(0), (e) => e.equal(5));
    });

    it("should stop at the first passing clause", () => {
        let evaluated: string[] = [];

        expect(5).or(
            (e) => {
                evaluated.push("a"); e.is.number();
            },
            (e) => {
                evaluated.push("b"); e.is.above(1);
            }
        );

        assert.deepEqual(evaluated, ["a"]);
    });

    it("should fail when every clause fails, listing each reason", () => {
        checkError(() => {
            expect(5).or((e) => e.is.above(10), (e) => e.is.below(0));
        }, "expected 5 to pass at least one of 2 assertions (failures: [\"expected 5 to be above 10\",\"expected 5 to be below 0\"])");
    });

    it("should not let the outer not leak into the clauses", () => {
        // not(or(A, B)) passes only when neither clause passes.
        expect(5).not.or((e) => e.is.string(), (e) => e.is.above(10));

        checkError(() => {
            expect(5).not.or((e) => e.is.string(), (e) => e.is.number());
        }, "not expected 5 to pass at least one of 2 assertions");
    });

    it("should give each clause a clean instance, so a failed clause leaves nothing behind", () => {
        // The first clause fails under its own `not`; the second must see neither that `not`
        // nor any state the failure left in its context.
        expect(5).or((e) => e.is.not.number(), (e) => e.is.number());
    });

    it("should chain on like any other assertion", () => {
        expect(5).or((e) => e.is.number()).and.is.above(1);
        expect(5).or((e) => e.is.number()).is.below(10);
    });

    it("should propagate a fatal from a clause rather than treating it as a failed clause", () => {
        checkError(() => {
            expect(5).or((e) => e.is.oneOf(5 as any), (e) => e.is.number());
        }, "must be an array, ArrayLike, or iterable", false);
    });

    it("should propagate a non-assertion error thrown by a clause", () => {
        let caught: any = null;
        try {
            expect(5).or(() => {
                throw new Error("boom");
            }, (e) => e.is.number());
        } catch (e) {
            caught = e;
        }

        assert.isNotNull(caught, "the error should have propagated");
        assert.equal(caught.message, "boom");
        assert.equal(caught.name, "Error");
    });

    it("should reject a call with no clauses or a non-function clause", () => {
        checkError(() => {
            expect(5).or();
        }, "or() requires at least one clause");

        checkError(() => {
            expect(5).or("nope" as any);
        }, "or() clauses must be functions, found \"nope\"");
    });
});
