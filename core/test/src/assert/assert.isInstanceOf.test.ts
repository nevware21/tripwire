/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert, AssertionFailure, expect } from "../../../src/index";

describe("assert.isInstanceOf", () => {
    
    it("should pass for Date instance", () => {
        assert.isInstanceOf(new Date(), Date);
    });

    it("should pass for Array instance", () => {
        assert.isInstanceOf([], Array);
        assert.isInstanceOf([1, 2, 3], Array);
    });

    it("should pass for Error instance", () => {
        assert.isInstanceOf(new Error(), Error);
        assert.isInstanceOf(new TypeError(), TypeError);
        assert.isInstanceOf(new RangeError(), RangeError);
    });

    it("should pass for Object instance", () => {
        assert.isInstanceOf({}, Object);
        assert.isInstanceOf([], Object); // Arrays are objects
        assert.isInstanceOf(new Date(), Object); // Dates are objects
    });

    it("should pass for custom class instance", () => {
        class MyClass {}
        class MySubClass extends MyClass {}
        
        assert.isInstanceOf(new MyClass(), MyClass);
        assert.isInstanceOf(new MySubClass(), MySubClass);
        assert.isInstanceOf(new MySubClass(), MyClass); // Inheritance
    });

    it("should pass for RegExp instance", () => {
        assert.isInstanceOf(/test/, RegExp);
        assert.isInstanceOf(new RegExp("test"), RegExp);
    });

    it("should pass for Map and Set instances", () => {
        assert.isInstanceOf(new Map(), Map);
        assert.isInstanceOf(new Set(), Set);
        assert.isInstanceOf(new WeakMap(), WeakMap);
        assert.isInstanceOf(new WeakSet(), WeakSet);
    });

    it("should pass for Promise instance", () => {
        assert.isInstanceOf(Promise.resolve(), Promise);
        assert.isInstanceOf(new Promise(() => {}), Promise);
    });

    it("should fail for primitive string", () => {
        try {
            assert.isInstanceOf("hello", String);
            assert.fail("Should have thrown");
        } catch (e) {
            expect(() => assert.isInstanceOf("hello", String)).to.throw(AssertionFailure);
        }
    });

    it("should fail for primitive number", () => {
        try {
            assert.isInstanceOf(123, Number);
            assert.fail("Should have thrown");
        } catch (e) {
            expect(() => assert.isInstanceOf(123, Number)).to.throw(AssertionFailure);
        }
    });

    it("should fail for primitive boolean", () => {
        try {
            assert.isInstanceOf(true, Boolean);
            assert.fail("Should have thrown");
        } catch (e) {
            expect(() => assert.isInstanceOf(true, Boolean)).to.throw(AssertionFailure);
        }
    });

    it("should fail for wrong constructor", () => {
        try {
            assert.isInstanceOf([], Date);
            assert.fail("Should have thrown");
        } catch (e) {
            expect(() => assert.isInstanceOf([], Date)).to.throw(AssertionFailure);
        }
    });

    it("should fail for null", () => {
        try {
            assert.isInstanceOf(null, Object);
            assert.fail("Should have thrown");
        } catch (e) {
            expect(() => assert.isInstanceOf(null, Object)).to.throw(AssertionFailure);
        }
    });

    it("should fail for undefined", () => {
        try {
            assert.isInstanceOf(undefined, Object);
            assert.fail("Should have thrown");
        } catch (e) {
            expect(() => assert.isInstanceOf(undefined, Object)).to.throw(AssertionFailure);
        }
    });

    it("should support custom error message", () => {
        try {
            assert.isInstanceOf(123, Date, "Custom error message");
            assert.fail("Should have thrown");
        } catch (e: any) {
            assert.equal(e.message.includes("Custom error message"), true);
        }
    });

    it("should work with expect syntax", () => {
        expect(new Date()).is.instanceOf(Date);
        expect([]).is.instanceOf(Array);
        expect(new Error()).is.instanceOf(Error);
    });

    it("should work with expect to.be syntax", () => {
        expect(new Date()).to.be.instanceOf(Date);
        expect([1, 2, 3]).to.be.an.instanceOf(Array);
        expect({}).to.be.an.instanceOf(Object);
    });

    it("should work with expect chaining", () => {
        expect(new Date()).is.a.instanceOf(Date);
        expect([]).is.an.instanceOf(Array);
    });
});

describe("assert.isNotInstanceOf", () => {
    
    it("should pass for primitive string not being String object", () => {
        assert.isNotInstanceOf("hello", Number);
        assert.isNotInstanceOf("hello", Date);
    });

    it("should pass for number not being other types", () => {
        assert.isNotInstanceOf(123, String);
        assert.isNotInstanceOf(123, Date);
        assert.isNotInstanceOf(123, Array);
    });

    it("should pass for object not being Array", () => {
        assert.isNotInstanceOf({}, Array);
        assert.isNotInstanceOf({}, Date);
        assert.isNotInstanceOf({}, RegExp);
    });

    it("should pass for array not being Date", () => {
        assert.isNotInstanceOf([], Date);
        assert.isNotInstanceOf([], RegExp);
        assert.isNotInstanceOf([], Error);
    });

    it("should pass for null not being any type", () => {
        assert.isNotInstanceOf(null, Object);
        assert.isNotInstanceOf(null, Array);
        assert.isNotInstanceOf(null, Date);
    });

    it("should pass for undefined not being any type", () => {
        assert.isNotInstanceOf(undefined, Object);
        assert.isNotInstanceOf(undefined, String);
        assert.isNotInstanceOf(undefined, Number);
    });

    it("should pass for custom class not being another class", () => {
        class MyClass {}
        class OtherClass {}
        
        assert.isNotInstanceOf(new MyClass(), OtherClass);
    });

    it("should fail for Date instance being Date", () => {
        try {
            assert.isNotInstanceOf(new Date(), Date);
            assert.fail("Should have thrown");
        } catch (e) {
            expect(() => assert.isNotInstanceOf(new Date(), Date)).to.throw(AssertionFailure);
        }
    });

    it("should fail for Array instance being Array", () => {
        try {
            assert.isNotInstanceOf([], Array);
            assert.fail("Should have thrown");
        } catch (e) {
            expect(() => assert.isNotInstanceOf([], Array)).to.throw(AssertionFailure);
        }
    });

    it("should fail for Array being Object", () => {
        try {
            assert.isNotInstanceOf([], Object);
            assert.fail("Should have thrown");
        } catch (e) {
            expect(() => assert.isNotInstanceOf([], Object)).to.throw(AssertionFailure);
        }
    });

    it("should support custom error message", () => {
        try {
            assert.isNotInstanceOf(new Date(), Date, "Custom error message");
            assert.fail("Should have thrown");
        } catch (e: any) {
            assert.equal(e.message.includes("Custom error message"), true);
        }
    });

    it("should work with expect not syntax", () => {
        expect(123).is.not.instanceOf(String);
        expect("hello").is.not.instanceOf(Number);
        expect({}).is.not.instanceOf(Array);
    });

    it("should work with expect to.not.be syntax", () => {
        expect(123).to.not.be.instanceOf(Date);
        expect("hello").to.not.be.an.instanceOf(Array);
        expect({}).to.not.be.an.instanceOf(RegExp);
    });
});

describe("expect chaining with instanceof", () => {
    
    it("should support is.instanceOf", () => {
        expect(new Date()).is.instanceOf(Date);
        expect([]).is.instanceOf(Array);
    });

    it("should support to.be.instanceof", () => {
        expect(new Date()).to.be.instanceOf(Date);
        expect([]).to.be.instanceOf(Array);
    });

    it("should support is.a.instanceof", () => {
        expect(new Date()).is.a.instanceOf(Date);
    });

    it("should support is.an.instanceof", () => {
        expect([]).is.an.instanceOf(Array);
    });

    it("should support not.instanceof", () => {
        expect(123).is.not.instanceOf(String);
        expect("hello").is.not.instanceOf(Number);
    });

    it("should throw for failed instanceof check", () => {
        expect(() => {
            expect(123).is.instanceOf(Date);
        }).to.throw(AssertionFailure);
    });

    it("should throw for failed not.instanceof check", () => {
        expect(() => {
            expect(new Date()).is.not.instanceOf(Date);
        }).to.throw(AssertionFailure);
    });
});

describe("constructor parameter validation", () => {

    it("should throw when constructor is a number", () => {
        expect(() => {
            assert.isInstanceOf(new Date(), 123 as any);
        }).to.throw(AssertionFailure, /constructor to be a function, got number/);
    });

    it("should throw when constructor is a string", () => {
        expect(() => {
            assert.isInstanceOf(new Date(), "Date" as any);
        }).to.throw(AssertionFailure, /constructor to be a function, got string/);
    });

    it("should throw when constructor is a boolean", () => {
        expect(() => {
            assert.isInstanceOf(new Date(), true as any);
        }).to.throw(AssertionFailure, /constructor to be a function, got boolean/);
    });

    it("should throw when constructor is null", () => {
        expect(() => {
            assert.isInstanceOf(new Date(), null as any);
        }).to.throw(AssertionFailure, /constructor to be a function, got object/);
    });

    it("should throw when constructor is undefined", () => {
        expect(() => {
            assert.isInstanceOf(new Date(), undefined as any);
        }).to.throw(AssertionFailure, /constructor to be a function, got undefined/);
    });

    it("should throw when constructor is a plain object", () => {
        expect(() => {
            assert.isInstanceOf(new Date(), {} as any);
        }).to.throw(AssertionFailure, /constructor to be a function, got object/);
    });

    it("should throw when constructor is a symbol", () => {
        expect(() => {
            assert.isInstanceOf(new Date(), Symbol() as any);
        }).to.throw(AssertionFailure, /constructor to be a function, got symbol/);
    });

    it("should throw with custom message when constructor is invalid", () => {
        expect(() => {
            assert.isInstanceOf(new Date(), 123 as any, "Custom validation message");
        }).to.throw(AssertionFailure, /Custom validation message/);
    });
});

describe("instanceof edge cases", () => {

    it("should handle inheritance correctly", () => {
        class Parent {}
        class Child extends Parent {}
        
        let child = new Child();
        
        assert.isInstanceOf(child, Child);
        assert.isInstanceOf(child, Parent); // Child is also instance of Parent
        assert.isInstanceOf(child, Object); // Everything is instance of Object
    });

    it("should handle Error subclasses", () => {
        let typeError = new TypeError("test");
        
        assert.isInstanceOf(typeError, TypeError);
        assert.isInstanceOf(typeError, Error); // TypeError extends Error
        assert.isInstanceOf(typeError, Object);
    });

    it("should handle built-in types", () => {
        assert.isInstanceOf(new String("test"), String);
        assert.isInstanceOf(new Number(123), Number);
        assert.isInstanceOf(new Boolean(true), Boolean);
    });

    it("should handle function constructors", () => {
        function MyConstructor() {}
        let instance = new (MyConstructor as any)();
        
        assert.isInstanceOf(instance, MyConstructor as any);
    });

    it("should handle anonymous constructors", () => {
        let AnonymousClass = class {};
        let instance = new AnonymousClass();
        
        assert.isInstanceOf(instance, AnonymousClass);
    });
});
