/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { expect } from "../../../src/assert/expect";

describe("expect change/increase/decrease", () => {
    describe("change", () => {
        it("should pass when function changes object property", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 20;
            };
            
            expect(fn).to.change(obj, "val");
        });

        it("should pass when function changes getter return value", () => {
            let value = 10;
            const getValue = () => value;
            const fn = () => {
                value = 20;
            };
            
            expect(fn).to.change(getValue);
        });

        it("should pass when using .by() with correct delta", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 15;
            };
            
            expect(fn).to.change(obj, "val").by(5);
        });

        it("should fail when function doesn't change value", () => {
            const obj = { val: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.change(obj, "val")).to.throw();
        });

        it("should fail with correct error message when value doesn't change", () => {
            const obj = { val: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.change(obj, "val")).to.throw(/expected.*to change.*val/);
        });

        it("should fail when .by() delta doesn't match", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 15;
            };
            
            expect(() => expect(fn).to.change(obj, "val").by(10)).to.throw();
        });

        it("should fail with correct error message when .by() delta doesn't match", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 15;
            };
            
            expect(() => expect(fn).to.change(obj, "val").by(10)).to.throw(/expected.*to change by 10.*but.*changed by 5/);
        });

        it("should work with negative changes", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 5;
            };
            
            expect(fn).to.change(obj, "val").by(-5);
        });

        it("should work with not operator", () => {
            const obj = { val: 10 };
            const fn = () => { /* no change */ };
            
            expect(fn).to.not.change(obj, "val");
        });
    });

    describe("increase", () => {
        it("should pass when function increases object property", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count = 10;
            };
            
            expect(fn).to.increase(obj, "count");
        });

        it("should pass when function increases getter return value", () => {
            let count = 0;
            const getCount = () => count;
            const fn = () => {
                count++;
            };
            
            expect(fn).to.increase(getCount);
        });

        it("should pass when using .by() with correct delta", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count += 10;
            };
            
            expect(fn).to.increase(obj, "count").by(10);
        });

        it("should fail when function decreases value", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count = 5;
            };
            
            expect(() => expect(fn).to.increase(obj, "count")).to.throw();
        });

        it("should fail with correct error message when value decreases", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count = 5;
            };
            
            expect(() => expect(fn).to.increase(obj, "count")).to.throw(/expected.*to increase.*count/);
        });

        it("should fail when function doesn't change value", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.increase(obj, "count")).to.throw();
        });

        it("should fail with correct error message when value doesn't change", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.increase(obj, "count")).to.throw(/expected.*to increase.*count/);
        });

        it("should fail when .by() delta doesn't match", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count += 10;
            };
            
            expect(() => expect(fn).to.increase(obj, "count").by(5)).to.throw();
        });

        it("should fail with correct error message when .by() delta doesn't match", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count += 10;
            };
            
            expect(() => expect(fn).to.increase(obj, "count").by(5)).to.throw(/expected.*to change by 5.*but.*changed by 10/);
        });

        it("should work with not operator when value decreases", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count = 5;
            };
            
            expect(fn).to.not.increase(obj, "count");
        });

        it("should work with not operator when value stays same", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(fn).to.not.increase(obj, "count");
        });
    });

    describe("decrease", () => {
        it("should pass when function decreases object property", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count = 5;
            };
            
            expect(fn).to.decrease(obj, "count");
        });

        it("should pass when function decreases getter return value", () => {
            let count = 10;
            const getCount = () => count;
            const fn = () => {
                count--;
            };
            
            expect(fn).to.decrease(getCount);
        });

        it("should pass when using .by() with correct delta", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count -= 3;
            };
            
            expect(fn).to.decrease(obj, "count").by(3);
        });

        it("should fail when function increases value", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count = 10;
            };
            
            expect(() => expect(fn).to.decrease(obj, "count")).to.throw();
        });

        it("should fail with correct error message when value increases", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count = 10;
            };
            
            expect(() => expect(fn).to.decrease(obj, "count")).to.throw(/expected.*to decrease.*count/);
        });

        it("should fail when function doesn't change value", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.decrease(obj, "count")).to.throw();
        });

        it("should fail with correct error message when value doesn't change", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.decrease(obj, "count")).to.throw(/expected.*to decrease.*count/);
        });

        it("should fail when .by() delta doesn't match", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count -= 3;
            };
            
            expect(() => expect(fn).to.decrease(obj, "count").by(5)).to.throw();
        });

        it("should fail with correct error message when .by() delta doesn't match", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count -= 3;
            };
            
            expect(() => expect(fn).to.decrease(obj, "count").by(5)).to.throw(/expected.*to change by 5.*but.*changed by 3/);
        });

        it("should work with not operator when value increases", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count = 10;
            };
            
            expect(fn).to.not.decrease(obj, "count");
        });

        it("should work with not operator when value stays same", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(fn).to.not.decrease(obj, "count");
        });
    });

    describe("aliases", () => {
        it("should support changes alias for change", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 20;
            };
            
            expect(fn).to.changes(obj, "val");
        });

        it("should support increases alias for increase", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count = 10;
            };
            
            expect(fn).to.increases(obj, "count");
        });

        it("should support decreases alias for decrease", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count = 5;
            };
            
            expect(fn).to.decreases(obj, "count");
        });
    });

    describe("changeBy", () => {
        it("should pass when function changes value by the specified delta", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 15;
            };
            
            expect(fn).to.changeBy(obj, "val", 5);
        });

        it("should pass when using getter function with correct delta", () => {
            let value = 10;
            const getValue = () => value;
            const fn = () => {
                value = 15;
            };
            
            expect(fn).to.changeBy(getValue, 5);
        });

        it("should pass with negative delta", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 5;
            };
            
            expect(fn).to.changeBy(obj, "val", -5);
        });

        it("should pass with positive delta for negative change (sign-agnostic)", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 5;  // actual delta is -5
            };
            
            // Should pass because changeBy ignores sign (|-5| === |5|)
            expect(fn).to.changeBy(obj, "val", 5);
        });

        it("should pass with negative delta for positive change (sign-agnostic)", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 15;  // actual delta is 5
            };
            
            // Should pass because changeBy ignores sign (|5| === |-5|)
            expect(fn).to.changeBy(obj, "val", -5);
        });

        it("should pass with getter function using opposite sign delta", () => {
            let value = 10;
            const getValue = () => value;
            const fn = () => {
                value = 3;  // actual delta is -7
            };
            
            // Should pass because changeBy ignores sign (|-7| === |7|)
            expect(fn).to.changeBy(getValue, 7);
        });

        it("should fail when delta doesn't match", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 15;
            };
            
            expect(() => expect(fn).to.changeBy(obj, "val", 10)).to.throw();
        });

        it("should fail with correct error message when delta doesn't match", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 15;
            };
            
            expect(() => expect(fn).to.changeBy(obj, "val", 10)).to.throw(/expected.*to change.*"val".*by 10.*but.*changed by 5/);
        });

        it("should work with changesBy alias", () => {
            const obj = { val: 10 };
            const fn = () => {
                obj.val = 20;
            };
            
            expect(fn).to.changesBy(obj, "val", 10);
        });
    });

    describe("increaseBy", () => {
        it("should pass when function increases value by the specified delta", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count += 10;
            };
            
            expect(fn).to.increaseBy(obj, "count", 10);
        });

        it("should pass when using getter function with correct delta", () => {
            let count = 5;
            const getCount = () => count;
            const fn = () => {
                count += 10;
            };
            
            expect(fn).to.increaseBy(getCount, 10);
        });

        it("should fail when delta doesn't match", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count += 10;
            };
            
            expect(() => expect(fn).to.increaseBy(obj, "count", 5)).to.throw();
        });

        it("should fail with correct error message when delta doesn't match", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count += 10;
            };
            
            expect(() => expect(fn).to.increaseBy(obj, "count", 5)).to.throw(/expected.*to increase.*"count".*by 5.*but.*increased by 10/);
        });

        it("should fail when value decreases", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count = 5;
            };
            
            expect(() => expect(fn).to.increaseBy(obj, "count", 5)).to.throw();
        });

        it("should fail with correct error message when value decreases", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count = 5;
            };
            
            expect(() => expect(fn).to.increaseBy(obj, "count", 5)).to.throw(/expected.*to increase.*count/);
        });

        it("should fail when value doesn't change", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.increaseBy(obj, "count", 5)).to.throw();
        });

        it("should fail with correct error message when value doesn't change", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.increaseBy(obj, "count", 5)).to.throw(/expected.*to increase.*count/);
        });

        it("should work with increasesBy alias", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count += 7;
            };
            
            expect(fn).to.increasesBy(obj, "count", 7);
        });
    });

    describe("decreaseBy", () => {
        it("should pass when function decreases value by the specified delta", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count -= 3;
            };
            
            expect(fn).to.decreaseBy(obj, "count", 3);
        });

        it("should pass when using getter function with correct delta", () => {
            let count = 10;
            const getCount = () => count;
            const fn = () => {
                count -= 3;
            };
            
            expect(fn).to.decreaseBy(getCount, 3);
        });

        it("should fail when delta doesn't match", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count -= 3;
            };
            
            expect(() => expect(fn).to.decreaseBy(obj, "count", 5)).to.throw();
        });

        it("should fail with correct error message when delta doesn't match", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count -= 3;
            };
            
            expect(() => expect(fn).to.decreaseBy(obj, "count", 5)).to.throw(/expected.*to decrease.*"count".*by 5.*but.*changed by -3/);
        });

        it("should fail when value increases", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count = 10;
            };
            
            expect(() => expect(fn).to.decreaseBy(obj, "count", 3)).to.throw();
        });

        it("should fail with correct error message when value increases", () => {
            const obj = { count: 5 };
            const fn = () => {
                obj.count = 10;
            };
            
            expect(() => expect(fn).to.decreaseBy(obj, "count", 3)).to.throw(/expected.*to decrease.*count/);
        });

        it("should fail when value doesn't change", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.decreaseBy(obj, "count", 3)).to.throw();
        });

        it("should fail with correct error message when value doesn't change", () => {
            const obj = { count: 10 };
            const fn = () => { /* no change */ };
            
            expect(() => expect(fn).to.decreaseBy(obj, "count", 3)).to.throw(/expected.*to decrease.*count/);
        });

        it("should work with decreasesBy alias", () => {
            const obj = { count: 10 };
            const fn = () => {
                obj.count -= 4;
            };
            
            expect(fn).to.decreasesBy(obj, "count", 4);
        });
    });
});
