/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { expect } from "../../../src/index";
import { checkError } from "../support/checkError";

describe("assert.changes", () => {
    describe("with getter function", () => {
        it("should pass when value changes", () => {
            let value = 1;
            const getValue = () => value;
            const changeValue = () => {
                value = 2;
            };

            assert.changes(changeValue, getValue);
        });

        it("should fail when value does not change", () => {
            let value = 1;
            const getValue = () => value;
            const noOp = () => { /* do nothing */ };

            checkError(
                () => assert.changes(noOp, getValue),
                /expected.*to change/
            );
        });

        it("should work with custom message", () => {
            let value = 1;
            const getValue = () => value;
            const noOp = () => { /* do nothing */ };

            checkError(
                () => assert.changes(noOp, getValue, "custom error"),
                "custom error"
            );
        });
    });

    describe("with object property", () => {
        it("should pass when property changes", () => {
            const obj = { count: 0 };
            const increment = () => {
                obj.count++;
            };

            assert.changes(increment, obj, "count");
        });

        it("should fail when property does not change", () => {
            const obj = { count: 5 };
            const noOp = () => { /* do nothing */ };

            checkError(
                () => assert.changes(noOp, obj, "count"),
                /expected.*to change/
            );
        });

        it("should work with symbol properties", () => {
            const sym = Symbol("test");
            const obj = { [sym]: 10 };
            const changeValue = () => {
                obj[sym] = 20;
            };

            assert.changes(changeValue, obj, sym);
        });

        it("should work with custom message", () => {
            const obj = { value: 1 };
            const noOp = () => { /* do nothing */ };

            checkError(
                () => assert.changes(noOp, obj, "value", "custom message"),
                "custom message"
            );
        });
    });

    describe("direction agnostic", () => {
        it("should pass for increase", () => {
            let value = 0;
            const getValue = () => value;
            const increment = () => {
                value++;
            };

            assert.changes(increment, getValue);
        });

        it("should pass for decrease", () => {
            let value = 10;
            const getValue = () => value;
            const decrement = () => {
                value--;
            };

            assert.changes(decrement, getValue);
        });

        it("should pass for any change", () => {
            let value = "hello";
            const getValue = () => value;
            const changeValue = () => {
                value = "world";
            };

            assert.changes(changeValue, getValue);
        });
    });
});

describe("assert.doesNotChange", () => {
    describe("with getter function", () => {
        it("should pass when value does not change", () => {
            let value = 1;
            const getValue = () => value;
            const noOp = () => { /* do nothing */ };

            assert.doesNotChange(noOp, getValue);
        });

        it("should fail when value changes", () => {
            let value = 1;
            const getValue = () => value;
            const changeValue = () => {
                value = 2;
            };

            checkError(
                () => assert.doesNotChange(changeValue, getValue),
                "not expected"
            );
        });
    });

    describe("with object property", () => {
        it("should pass when property does not change", () => {
            const obj = { count: 5 };
            const noOp = () => { /* do nothing */ };

            assert.doesNotChange(noOp, obj, "count");
        });

        it("should fail when property changes", () => {
            const obj = { count: 0 };
            const increment = () => {
                obj.count++;
            };

            checkError(
                () => assert.doesNotChange(increment, obj, "count"),
                /not expected.*to change/
            );
        });
    });
});

describe("assert.changesBy", () => {
    describe("with getter function", () => {
        it("should pass when value changes by expected delta", () => {
            let value = 0;
            const getValue = () => value;
            const addFive = () => {
                value += 5;
            };

            assert.changesBy(addFive, getValue, 5);
        });

        it("should pass for negative delta", () => {
            let value = 10;
            const getValue = () => value;
            const subtractThree = () => {
                value -= 3;
            };

            assert.changesBy(subtractThree, getValue, -3);
        });

        it("should fail when delta does not match", () => {
            let value = 0;
            const getValue = () => value;
            const addTwo = () => {
                value += 2;
            };

            checkError(
                () => assert.changesBy(addTwo, getValue, 5),
                /expected.*to change.*by.*but.*changed by/
            );
        });
    });

    describe("with object property", () => {
        it("should pass when property changes by expected delta", () => {
            const obj = { count: 10 };
            const addFive = () => {
                obj.count += 5;
            };

            assert.changesBy(addFive, obj, "count", 5);
        });

        it("should fail when delta does not match", () => {
            const obj = { count: 0 };
            const increment = () => {
                obj.count++;
            };

            checkError(
                () => assert.changesBy(increment, obj, "count", 5),
                /expected.*to change.*by.*but.*changed by/
            );
        });
    });
});

describe("assert.notChangesBy", () => {
    it("should pass when value changes but not by expected delta", () => {
        let value = 0;
        const getValue = () => value;
        const addTwo = () => {
            value += 2;
        };

        assert.notChangesBy(addTwo, getValue, 5);
    });

    it("should fail when value changes by exactly the delta", () => {
        let value = 0;
        const getValue = () => value;
        const addFive = () => {
            value += 5;
        };

        checkError(
            () => assert.notChangesBy(addFive, getValue, 5),
            /not expected.*to change.*by/
        );
    });

    it("should not fail when value does not change at all", () => {
        let value = 0;
        const getValue = () => value;
        const noOp = () => { /* do nothing */ };

        assert.notChangesBy(noOp, getValue, 5);
    });

    it("should work with alias changesButNotBy which requires a change", () => {
        let value = 0;
        const getValue = () => value;
        const addTwo = () => {
            value += 2;
        };

        // Passes: value changes by 2, not by 5
        assert.changesButNotBy(addTwo, getValue, 5);
    });

    it("changesButNotBy should fail when value doesn't change at all", () => {
        let value = 0;
        const getValue = () => value;
        const noOp = () => { /* do nothing */ };

        checkError(
            () => assert.changesButNotBy(noOp, getValue, 5),
            /expected.*to change/
        );
    });

    it("changesButNotBy should fail when value changes by exactly the delta", () => {
        let value = 0;
        const getValue = () => value;
        const addFive = () => {
            value += 5;
        };

        checkError(
            () => assert.changesButNotBy(addFive, getValue, 5),
            /expected.*to change.*but not by/
        );
    });
});

describe("assert.increases", () => {
    describe("with getter function", () => {
        it("should pass when value increases", () => {
            let value = 0;
            const getValue = () => value;
            const increment = () => {
                value++;
            };

            assert.increases(increment, getValue);
        });

        it("should fail when value decreases", () => {
            let value = 10;
            const getValue = () => value;
            const decrement = () => {
                value--;
            };

            checkError(
                () => assert.increases(decrement, getValue),
                /expected.*to increase/
            );
        });

        it("should fail when value does not change", () => {
            let value = 5;
            const getValue = () => value;
            const noOp = () => { /* do nothing */ };

            checkError(
                () => assert.increases(noOp, getValue),
                /expected.*to increase/
            );
        });
    });

    describe("with object property", () => {
        it("should pass when property increases", () => {
            const obj = { count: 0 };
            const addFive = () => {
                obj.count += 5;
            };

            assert.increases(addFive, obj, "count");
        });

        it("should fail when property decreases", () => {
            const obj = { count: 10 };
            const subtractOne = () => {
                obj.count--;
            };

            checkError(
                () => assert.increases(subtractOne, obj, "count"),
                /expected.*to increase/
            );
        });
    });
});

describe("assert.doesNotIncrease", () => {
    it("should pass when value does not increase", () => {
        let value = 5;
        const getValue = () => value;
        const noOp = () => { /* do nothing */ };

        assert.doesNotIncrease(noOp, getValue);
    });

    it("should pass when value decreases", () => {
        let value = 10;
        const getValue = () => value;
        const decrement = () => {
            value--;
        };

        assert.doesNotIncrease(decrement, getValue);
    });

    it("should fail when value increases", () => {
        let value = 0;
        const getValue = () => value;
        const increment = () => {
            value++;
        };

        checkError(
            () => assert.doesNotIncrease(increment, getValue),
            /not expected.*to increase/
        );
    });
});

describe("assert.increasesBy", () => {
    it("should pass when value increases by expected delta", () => {
        let value = 0;
        const getValue = () => value;
        const addFive = () => {
            value += 5;
        };

        assert.increasesBy(addFive, getValue, 5);
    });

    it("should fail when increase delta does not match", () => {
        let value = 0;
        const getValue = () => value;
        const addTwo = () => {
            value += 2;
        };

        checkError(
            () => assert.increasesBy(addTwo, getValue, 5),
            /expected.*to increase.*by.*but.*increased by/
        );
    });

    it("should fail for negative delta (decrease)", () => {
        let value = 10;
        const getValue = () => value;
        const subtractThree = () => {
            value -= 3;
        };

        checkError(
            () => assert.increasesBy(subtractThree, getValue, 3),
            /expected.*to increase/
        );
    });
});

describe("assert.notIncreasesBy", () => {
    it("should pass when value increases but not by expected delta", () => {
        let value = 0;
        const getValue = () => value;
        const addTwo = () => {
            value += 2;
        };

        assert.notIncreasesBy(addTwo, getValue, 5);
    });

    it("should fail when value increases by exactly the delta", () => {
        let value = 0;
        const getValue = () => value;
        const addFive = () => {
            value += 5;
        };

        checkError(
            () => assert.notIncreasesBy(addFive, getValue, 5),
            /not expected.*to increase.*by/
        );
    });

    it("should work with alias increasesButNotBy which requires an increase", () => {
        let value = 0;
        const getValue = () => value;
        const addTwo = () => {
            value += 2;
        };

        // Passes: value increases by 2, not by 5
        assert.increasesButNotBy(addTwo, getValue, 5);
    });

    it("increasesButNotBy should fail when value doesn't increase", () => {
        let value = 0;
        const getValue = () => value;
        const noOp = () => { /* do nothing */ };

        checkError(
            () => assert.increasesButNotBy(noOp, getValue, 5),
            /expected.*to increase/
        );
    });

    it("increasesButNotBy should fail when value increases by exactly the delta", () => {
        let value = 0;
        const getValue = () => value;
        const addFive = () => {
            value += 5;
        };

        checkError(
            () => assert.increasesButNotBy(addFive, getValue, 5),
            /expected.*to increase.*but not by/
        );
    });
});

describe("assert.decreases", () => {
    describe("with getter function", () => {
        it("should pass when value decreases", () => {
            let value = 10;
            const getValue = () => value;
            const decrement = () => {
                value--;
            };

            assert.decreases(decrement, getValue);
        });

        it("should fail when value increases", () => {
            let value = 0;
            const getValue = () => value;
            const increment = () => {
                value++;
            };

            checkError(
                () => assert.decreases(increment, getValue),
                /expected.*to decrease/
            );
        });

        it("should fail when value does not change", () => {
            let value = 5;
            const getValue = () => value;
            const noOp = () => { /* do nothing */ };

            checkError(
                () => assert.decreases(noOp, getValue),
                /expected.*to decrease/
            );
        });
    });

    describe("with object property", () => {
        it("should pass when property decreases", () => {
            const obj = { count: 10 };
            const subtractThree = () => {
                obj.count -= 3;
            };

            assert.decreases(subtractThree, obj, "count");
        });

        it("should fail when property increases", () => {
            const obj = { count: 0 };
            const addOne = () => {
                obj.count++;
            };

            checkError(
                () => assert.decreases(addOne, obj, "count"),
                /expected.*to decrease/
            );
        });
    });
});

describe("assert.doesNotDecrease", () => {
    it("should pass when value does not decrease", () => {
        let value = 5;
        const getValue = () => value;
        const noOp = () => { /* do nothing */ };

        assert.doesNotDecrease(noOp, getValue);
    });

    it("should pass when value increases", () => {
        let value = 0;
        const getValue = () => value;
        const increment = () => {
            value++;
        };

        assert.doesNotDecrease(increment, getValue);
    });

    it("should fail when value decreases", () => {
        let value = 10;
        const getValue = () => value;
        const decrement = () => {
            value--;
        };

        checkError(
            () => assert.doesNotDecrease(decrement, getValue),
            /not expected.*to decrease/
        );
    });
});

describe("assert.decreasesBy", () => {
    it("should pass when value decreases by expected delta", () => {
        let value = 10;
        const getValue = () => value;
        const subtractFive = () => {
            value -= 5;
        };

        assert.decreasesBy(subtractFive, getValue, 5);
    });

    it("should fail when decrease delta does not match", () => {
        let value = 10;
        const getValue = () => value;
        const subtractTwo = () => {
            value -= 2;
        };

        checkError(
            () => assert.decreasesBy(subtractTwo, getValue, 5),
            /expected.*to decrease.*by.*but.*changed by/
        );
    });

    it("should fail for positive delta (increase)", () => {
        let value = 0;
        const getValue = () => value;
        const addThree = () => {
            value += 3;
        };

        checkError(
            () => assert.decreasesBy(addThree, getValue, 3),
            /expected.*to decrease/
        );
    });
});

describe("assert.notDecreasesBy", () => {
    it("should pass when value decreases but not by expected delta", () => {
        let value = 10;
        const getValue = () => value;
        const subtractTwo = () => {
            value -= 2;
        };

        assert.notDecreasesBy(subtractTwo, getValue, 5);
    });

    it("should fail when value decreases by exactly the delta", () => {
        let value = 10;
        const getValue = () => value;
        const subtractFive = () => {
            value -= 5;
        };

        checkError(
            () => assert.notDecreasesBy(subtractFive, getValue, 5),
            /not expected.*to decrease.*by/
        );
    });

    it("should work with alias decreasesButNotBy which requires a decrease", () => {
        let value = 10;
        const getValue = () => value;
        const subtractTwo = () => {
            value -= 2;
        };

        // Passes: value decreases by 2, not by 5
        assert.decreasesButNotBy(subtractTwo, getValue, 5);
    });

    it("decreasesButNotBy should fail when value doesn't decrease", () => {
        let value = 10;
        const getValue = () => value;
        const noOp = () => { /* do nothing */ };

        checkError(
            () => assert.decreasesButNotBy(noOp, getValue, 5),
            /expected.*to decrease/
        );
    });

    it("decreasesButNotBy should fail when value decreases by exactly the delta", () => {
        let value = 10;
        const getValue = () => value;
        const subtractFive = () => {
            value -= 5;
        };

        checkError(
            () => assert.decreasesButNotBy(subtractFive, getValue, 5),
            /expected.*to decrease.*but not by/
        );
    });
});

describe("expect flow: changesButNotBy, increasesButNotBy, decreasesButNotBy", () => {
    it("expect().to.changesButNotBy should work", () => {
        let value = 0;
        const getValue = () => value;
        const addTwo = () => {
            value += 2;
        };

        // Should pass - changed by 2, not by 5
        expect(addTwo).to.changesButNotBy(getValue, 5);
    });

    it("expect().to.increasesButNotBy should work", () => {
        let value = 0;
        const getValue = () => value;
        const addTwo = () => {
            value += 2;
        };

        // Should pass - increased by 2, not by 5
        expect(addTwo).to.increasesButNotBy(getValue, 5);
    });

    it("expect().to.decreasesButNotBy should work", () => {
        let value = 10;
        const getValue = () => value;
        const subtractTwo = () => {
            value -= 2;
        };

        // Should pass - decreased by 2, not by 5
        expect(subtractTwo).to.decreasesButNotBy(getValue, 5);
    });
});

describe("expect flow: change/increase/decrease with .not.by()", () => {
    describe("change().not.by()", () => {
        it("should pass when value changes but not by the specified delta", () => {
            let value = 0;
            const getValue = () => value;
            const addTwo = () => {
                value += 2;
            };

            // Should pass - changed by 2, not by 5
            expect(addTwo).to.change(getValue).not.by(5);
        });

        it("should fail when value changes by exactly the specified delta", () => {
            let value = 0;
            const getValue = () => value;
            const addFive = () => {
                value += 5;
            };

            checkError(
                () => expect(addFive).to.change(getValue).not.by(5),
                /expected.*to change by.*but it changed by/
            );
        });

        it("should work with object property", () => {
            const obj = { count: 0 };
            const addTwo = () => {
                obj.count += 2;
            };

            // Should pass - changed by 2, not by 5
            expect(addTwo).to.change(obj, "count").not.by(5);
        });
    });

    describe("increase().not.by()", () => {
        it("should pass when value increases but not by the specified delta", () => {
            let value = 0;
            const getValue = () => value;
            const addTwo = () => {
                value += 2;
            };

            // Should pass - increased by 2, not by 5
            expect(addTwo).to.increase(getValue).not.by(5);
        });

        it("should fail when value increases by exactly the specified delta", () => {
            let value = 0;
            const getValue = () => value;
            const addFive = () => {
                value += 5;
            };

            checkError(
                () => expect(addFive).to.increase(getValue).not.by(5),
                /expected.*to change by.*but it changed by/
            );
        });

        it("should fail with correct error message when delta matches", () => {
            let value = 10;
            const getValue = () => value;
            const addThree = () => {
                value += 3;
            };

            checkError(
                () => expect(addThree).to.increase(getValue).not.by(3),
                /expected.*to change by.*but it changed by 3/
            );
        });
    });

    describe("decrease().not.by()", () => {
        it("should pass when value decreases but not by the specified delta", () => {
            let value = 10;
            const getValue = () => value;
            const subtractTwo = () => {
                value -= 2;
            };

            // Should pass - decreased by 2, not by 5
            expect(subtractTwo).to.decrease(getValue).not.by(5);
        });

        it("should fail when value decreases by exactly the specified delta", () => {
            let value = 10;
            const getValue = () => value;
            const subtractFive = () => {
                value -= 5;
            };

            checkError(
                () => expect(subtractFive).to.decrease(getValue).not.by(5),
                /expected.*to change by.*but it changed by/
            );
        });

        it("should fail with correct error message when delta matches", () => {
            let value = 10;
            const getValue = () => value;
            const subtractThree = () => {
                value -= 3;
            };

            checkError(
                () => expect(subtractThree).to.decrease(getValue).not.by(3),
                /expected.*to change by.*but it changed by.*3/
            );
        });
    });
});
