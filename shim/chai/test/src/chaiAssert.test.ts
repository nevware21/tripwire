/**
 * This is a modified version of the original Chai library tests to convert it
 * into TypeScript to ensure that the shim is type-safe and conforms to the
 * default operation of the original chai `assert` function.
 */

import { assert } from "../../src/index"
import { globalErr as err } from "./bootstrap/globalErr";

describe("assert", function () {

    it("assert", function () {
        var foo = "bar";
        assert(foo == "bar", "expected foo to equal `bar`");

        err(function () {
            assert(foo == "baz", "expected foo to equal `bar`");
        }, "expected foo to equal `bar`");

        err(function () {
            assert(foo == "baz", function() {
                return "expected foo to equal `bar`";
            });
        }, "expected foo to equal `bar`");
    });

    describe("fail", function() {
        it("should accept a message as the 3rd argument", function () {
            err(function() {
                assert.fail(0, 1, "this has failed");
            }, /this has failed/);
        });

        it("should accept a message as the only argument", function () {
            err(function() {
                assert.fail("this has failed");
            }, /this has failed/);
        });

        it("should produce a default message when called without any arguments", function () {
            //assertConfig.fullStack = false;
            
            err(function() {
                assert.fail();
            }, /assert\.fail()/);
        });
    });

    it("isTrue", function () {
        assert.isTrue(true);

        err(function() {
            assert.isTrue(false, "blah");
        }, "blah: expected false to be strictly true");

        err(function() {
            assert.isTrue(1);
        }, "expected 1 to be strictly true");

        err(function() {
            assert.isTrue("test");
        }, "expected \"test\" to be strictly true");
    });

    it("isNotTrue", function () {
        assert.isNotTrue(false);

        err(function() {
            assert.isNotTrue(true, "blah");
        }, "blah: not expected true to be strictly true");
    });

    it("isOk / ok", function () {
        ["isOk", "ok"].forEach(function (isOk) {
            (assert as any)[isOk](true);
            (assert as any)[isOk](1);
            (assert as any)[isOk]("test");

            err(function () {
                (assert as any)[isOk](false, "blah");
            }, "blah: expected false to be truthy");

            err(function () {
                (assert as any)[isOk](0);
            }, "expected 0 to be truthy");

            err(function () {
                (assert as any)[isOk]("");
            }, "expected \"\" to be truthy");
        });
    });

    it("isNotOk, notOk", function () {
        ["isNotOk", "notOk"].forEach(function (isNotOk) {
            (assert as any)[isNotOk](false);
            (assert as any)[isNotOk](0);
            (assert as any)[isNotOk]("");

            err(function () {
                (assert as any)[isNotOk](true, "blah");
            }, "blah: not expected true to be truthy");

            err(function () {
                (assert as any)[isNotOk](1);
            }, "not expected 1 to be truthy");

            err(function () {
                (assert as any)[isNotOk]("test");
            }, "not expected \"test\" to be truthy");
        });
    });

    it("isFalse", function () {
        assert.isFalse(false);

        err(function() {
            assert.isFalse(true, "blah");
        }, "blah: expected true to be strictly false");

        err(function() {
            assert.isFalse(0);
        }, "expected 0 to be strictly false");
    });

    it("isNotFalse", function () {
        assert.isNotFalse(true);

        err(function() {
            assert.isNotFalse(false, "blah");
        }, "blah: not expected false to be strictly false");
    });

    it("equal", function () {
        var foo;
        assert.equal(foo, undefined);

        var sym = Symbol();
        assert.equal(sym, sym);

        err(function () {
            assert.equal(1, 2, "blah");
        }, "blah: expected 1 to equal 2");
    });

    // it("typeof", function () {
    //     assert.typeOf("test", "string");
    //     assert.typeOf(true, "boolean");
    //     assert.typeOf(5, "number");
    
    //     assert.typeOf(() => {}, "function");
    //     assert.typeOf(function() {}, "function");
    //     assert.typeOf(async function() {}, "asyncfunction");
    //     assert.typeOf(function*() {}, "generatorfunction");
    //     assert.typeOf(async function*() {}, "asyncgeneratorfunction");
    //     assert.typeOf(Symbol(), "symbol");
    
    //     err(function () {
    //         assert.typeOf(5, "function", "blah");
    //     }, "blah: expected 5 to be a function");
    
    //     err(function () {
    //         assert.typeOf(function() {}, "asyncfunction", "blah");
    //     }, "blah: expected [Function] to be an asyncfunction");

    //     err(function () {
    //         assert.typeOf(5, "string", "blah");
    //     }, "blah: expected 5 to be a string");
    // });

    // it("notTypeOf", function () {
    //     assert.notTypeOf("test", "number");
    
    //     assert.notTypeOf(() => {}, "string");
    //     assert.notTypeOf(function() {}, "string");
    //     assert.notTypeOf(async function() {}, "string");
    //     assert.notTypeOf(function*() {}, "string");
    //     assert.notTypeOf(async function*() {}, "string");

    //     err(function () {
    //         assert.notTypeOf(5, "number", "blah");
    //     }, "blah: not expected 5 to be a number");
    
    //     err(function () {
    //         assert.notTypeOf(() => {}, "function", "blah");
    //     }, "blah: not expected [Function] to be a function");
    // });

    // it("instanceOf", function() {
    //     class Foo {}
    //     assert.instanceOf(new Foo(), Foo);

    //     // Normally, `instanceof` requires that the constructor be a function or an
    //     // object with a callable `@@hasInstance`. But in some older browsers such
    //     // as IE11, `instanceof` also accepts DOM-related interfaces such as
    //     // `HTMLElement`, despite being non-callable objects in those browsers.
    //     // See: https://github.com/chaijs/chai/issues/1000.
    //     if (typeof document !== "undefined" &&
    //     typeof document.createElement !== "undefined" &&
    //     typeof HTMLElement !== "undefined") {
    //         assert.instanceOf(document.createElement("div"), HTMLElement);
    //     }

    //     err(function(){
    //         assert.instanceOf(new Foo(), 1, "blah");
    //     }, "blah: The instanceof assertion needs a constructor but Number was given.");

    //     err(function(){
    //         assert.instanceOf(new Foo(), "batman");
    //     }, "The instanceof assertion needs a constructor but String was given.");

    //     err(function(){
    //         assert.instanceOf(new Foo(), {});
    //     }, "The instanceof assertion needs a constructor but Object was given.");

    //     err(function(){
    //         assert.instanceOf(new Foo(), true);
    //     }, "The instanceof assertion needs a constructor but Boolean was given.");

    //     err(function(){
    //         assert.instanceOf(new Foo(), null);
    //     }, "The instanceof assertion needs a constructor but null was given.");

    //     err(function(){
    //         assert.instanceOf(new Foo(), undefined);
    //     }, "The instanceof assertion needs a constructor but undefined was given.");

    //     err(function(){
    //         function Thing(){}
    //         var t = new Thing();
    //         Thing.prototype = 1337;
    //         assert.instanceOf(t, Thing);
    //     }, "The instanceof assertion needs a constructor but Function was given.", true);

    //     err(function(){
    //         assert.instanceOf(new Foo(), Symbol());
    //     }, "The instanceof assertion needs a constructor but Symbol was given.");

    //     err(function() {
    //         var FakeConstructor = {};
    //         var fakeInstanceB = 4;
    //         FakeConstructor[Symbol.hasInstance] = function (val) {
    //             return val === 3;
    //         };

    //         assert.instanceOf(fakeInstanceB, FakeConstructor);
    //     }, "expected 4 to be an instance of an unnamed constructor")

    //     err(function () {
    //         assert.instanceOf(5, Foo, "blah");
    //     }, "blah: expected 5 to be an instance of Foo");

    //     function CrashyObject() {}
    //     CrashyObject.prototype.inspect = function () {
    //         throw new Error("Arg's inspect() called even though the test passed");
    //     };
    //     assert.instanceOf(new CrashyObject(), CrashyObject);
    // });

    // it("notInstanceOf", function () {
    //     function Foo(){}
    //     assert.notInstanceOf(new Foo(), String);

    //     err(function(){
    //         assert.notInstanceOf(new Foo(), 1, "blah");
    //     }, "blah: The instanceof assertion needs a constructor but Number was given.");

    //     err(function(){
    //         assert.notInstanceOf(new Foo(), "batman");
    //     }, "The instanceof assertion needs a constructor but String was given.");

    //     err(function(){
    //         assert.notInstanceOf(new Foo(), {});
    //     }, "The instanceof assertion needs a constructor but Object was given.");

    //     err(function(){
    //         assert.notInstanceOf(new Foo(), true);
    //     }, "The instanceof assertion needs a constructor but Boolean was given.");

    //     err(function(){
    //         assert.notInstanceOf(new Foo(), null);
    //     }, "The instanceof assertion needs a constructor but null was given.");

    //     err(function(){
    //         assert.notInstanceOf(new Foo(), undefined);
    //     }, "The instanceof assertion needs a constructor but undefined was given.");

    //     err(function(){
    //         assert.notInstanceOf(new Foo(), Symbol());
    //     }, "The instanceof assertion needs a constructor but Symbol was given.");

    //     err(function() {
    //         var FakeConstructor = {};
    //         var fakeInstanceB = 4;
    //         FakeConstructor[Symbol.hasInstance] = function (val) {
    //             return val === 4;
    //         };

    //         assert.notInstanceOf(fakeInstanceB, FakeConstructor);
    //     }, "expected 4 to not be an instance of an unnamed constructor");

    //     err(function () {
    //         assert.notInstanceOf(new Foo(), Foo, "blah");
    //     }, "blah: expected Foo{} to not be an instance of Foo");
    // });

    it("isObject", function () {
        class Foo{
            constructor() {}
        }
        assert.isObject({});
        assert.isObject(new Foo());

        err(function() {
            assert.isObject(true, "blah");
        }, "blah: expected true to be an Object");

        err(function() {
            assert.isObject(Foo);
        }, "expected [Function:Foo] to be an Object");

        err(function() {
            assert.isObject("foo");
        }, "expected \"foo\" to be an Object");
    });

    it("isNotObject", function () {
        assert.isNotObject(5);

        err(function() {
            assert.isNotObject({}, "blah");
        }, "blah: not expected {} to be an Object");
    });

    it("notEqual", function() {
        assert.notEqual(3, 4);

        var sym1 = Symbol()
            , sym2 = Symbol();
        assert.notEqual(sym1, sym2);

        err(function () {
            assert.notEqual(5, 5, "blah");
        }, "blah: not expected 5 to equal 5");
    });

    it("strictEqual", function() {
        assert.strictEqual("foo", "foo");

        var sym = Symbol();
        assert.strictEqual(sym, sym);

        err(function () {
            assert.strictEqual("5", 5 as any, "blah");
        }, " blah: expected \"5\" to strictly equal 5");
    });

    it("notStrictEqual", function() {
        assert.notStrictEqual(5, "5" as any);

        var sym1 = Symbol()
            , sym2 = Symbol();
        assert.notStrictEqual(sym1, sym2);

        err(function () {
            assert.notStrictEqual(5, 5, "blah");
        }, "blah: not expected 5 to strictly equal 5");
    });

    it("deepEqual", function() {
        assert.deepEqual({tea: "chai"}, {tea: "chai"});
        assert.deepStrictEqual({tea: "chai"}, {tea: "chai"});  // Alias of deepEqual

        assert.deepEqual([NaN], [NaN]);
        assert.deepEqual({tea: NaN}, {tea: NaN});

        err(function () {
            assert.deepEqual({tea: "chai"}, {tea: "black"}, "blah");
        }, "blah: expected {tea:\"chai\"} to deeply equal {tea:\"black\"}");

        var obja = Object.create({ tea: "chai" })
            , objb = Object.create({ tea: "chai" });

        assert.deepEqual(obja, objb);

        var obj1 = Object.create({tea: "chai"})
            , obj2 = Object.create({tea: "black"});

        err(function () {
            assert.deepEqual(obj1, obj2);
        }, "expected [Object:{}] to deeply equal [Object:{}]");
    });

    it("deepEqual (ordering)", function() {
        var a = { a: "b", c: "d" }
            , b = { c: "d", a: "b" };
        assert.deepEqual(a, b);
    });

    it("deepEqual /regexp/", function() {
        assert.deepEqual(/a/, /a/);
        assert.notDeepEqual(/a/, /b/);
        assert.notDeepEqual(/a/, {} as any);
        assert.deepEqual(/a/g, /a/g);
        assert.notDeepEqual(/a/g, /b/g);
        assert.deepEqual(/a/i, /a/i);
        assert.notDeepEqual(/a/i, /b/i);
        assert.deepEqual(/a/m, /a/m);
        assert.notDeepEqual(/a/m, /b/m);
    });

    it("deepEqual (Date)", function() {
        var a = new Date(1, 2, 3)
            , b = new Date(4, 5, 6);
        assert.deepEqual(a, a);
        assert.notDeepEqual(a, b);
        assert.notDeepEqual(a, {} as any);
    });

    it("deepEqual (circular)", function() {
        var circularObject = {} as any
            , secondCircularObject = {} as any;
        circularObject.field = circularObject;
        secondCircularObject.field = secondCircularObject;

        assert.deepEqual(circularObject, secondCircularObject);

        err(function() {
            secondCircularObject.field2 = secondCircularObject;
            assert.deepEqual(circularObject, secondCircularObject);
        }, "expected {field:{field:(c)}} to deeply equal {field:{field:(c),field2:(c)},field2:{field:(c),field2:(c)}}");
    });

    it("notDeepEqual", function() {
        assert.notDeepEqual({tea: "jasmine"}, {tea: "chai"});

        err(function () {
            assert.notDeepEqual({tea: "chai"}, {tea: "chai"}, "blah");
        }, "blah: not expected {tea:\"chai\"} to deeply equal {tea:\"chai\"}");
    });

    it("notDeepEqual (circular)", function() {
        var circularObject = {} as any
            , secondCircularObject = { tea: "jasmine" } as any;
        circularObject.field = circularObject;
        secondCircularObject.field = secondCircularObject;

        assert.notDeepEqual(circularObject, secondCircularObject);

        err(function() {
            delete secondCircularObject.tea;
            assert.notDeepEqual(circularObject, secondCircularObject);
        }, "not expected {field:{field:(c)}} to deeply equal {field:{field:(c)}}");
    });

    it("isNull", function() {
        assert.isNull(null);

        err(function () {
            assert.isNull(undefined, "blah");
        }, "blah: expected undefined to be null");
    });

    it("isNotNull", function() {
        assert.isNotNull(undefined);

        err(function () {
            assert.isNotNull(null, "blah");
        }, "blah: not expected null to be null");
    });

    // it("isNaN", function() {
    //     assert.isNaN(NaN);

    //     err(function (){
    //         assert.isNaN(Infinity, "blah");
    //     }, "blah: expected Infinity to be NaN");

    //     err(function (){
    //         assert.isNaN(undefined);
    //     }, "expected undefined to be NaN");

    //     err(function (){
    //         assert.isNaN({});
    //     }, "expected {} to be NaN");

    //     err(function (){
    //         assert.isNaN(4);
    //     }, "expected 4 to be NaN");
    // });

    // it("isNotNaN", function() {
    //     assert.isNotNaN(4);
    //     assert.isNotNaN(Infinity);
    //     assert.isNotNaN(undefined);
    //     assert.isNotNaN({});

    //     err(function (){
    //         assert.isNotNaN(NaN, "blah");
    //     }, "blah: not expected NaN to be NaN");
    // });

    // it("exists", function() {
    //     var meeber = "awesome";
    //     var iDoNotExist: any;

    //     assert.exists(meeber);
    //     assert.exists(0);
    //     assert.exists(false);
    //     assert.exists("");

    //     err(function (){
    //         assert.exists(iDoNotExist, "blah");
    //     }, "blah: expected undefined to exist");
    // });

    // it("notExists", function() {
    //     var meeber = "awesome";
    //     var iDoNotExist: any;

    //     assert.notExists(iDoNotExist);

    //     err(function (){
    //         assert.notExists(meeber, "blah");
    //     }, "blah: expected \"awesome\" to not exist");
    // });

    it("isUndefined", function() {
        assert.isUndefined(undefined);

        err(function () {
            assert.isUndefined(null, "blah");
        }, "blah: expected null to be undefined");
    });

    // it("isDefined", function() {
    //     assert.isDefined(null);

    //     err(function () {
    //         assert.isDefined(undefined, "blah");
    //     }, "blah: expected undefined to not equal undefined");
    // });

    // it("isCallable", function() {
    //     var func = function() {};
    //     assert.isCallable(func);

    //     var func1 = async function() {};
    //     assert.isCallable(func1);

    //     var func2 = function* () {}
    //     assert.isCallable(func2);

    //     var func3 = async function* () {}
    //     assert.isCallable(func3);

    //     err(function () {
    //         assert.isCallable({}, "blah");
    //     }, "blah: expected {} to be a callable function");
    // });
  
    // it("isNotCallable", function() {
    //     assert.isNotCallable(false);
    //     assert.isNotCallable(10);
    //     assert.isNotCallable("string");

    //     err(function () {
    //         assert.isNotCallable(function() {}, "blah");
    //     }, "blah: not expected [Function] to be a callable function");
    // });

    it("isFunction", function() {
        var func = function() {};
        assert.isFunction(func);

        err(function () {
            assert.isFunction({}, "blah");
        }, "blah: expected {} to be a function");
    });

    it("isNotFunction", function () {
        assert.isNotFunction(5);

        err(function () {
            assert.isNotFunction(function () {}, "blah");
        }, "blah: not expected [Function] to be a function");
    });

    it("isArray", function() {
        assert.isArray([]);
        assert.isArray([]);

        err(function () {
            assert.isArray({}, "blah");
        }, "blah: expected {} to be an array");
    });

    it("isNotArray", function () {
        assert.isNotArray(3);

        err(function () {
            assert.isNotArray([], "blah");
        }, "blah: not expected [] to be an array");

        err(function () {
            assert.isNotArray([]);
        }, "not expected [] to be an array");
    });

    it("isString", function() {
        assert.isString("Foo");
        // assert.isString(new String("foo"));

        err(function () {
            assert.isString(1, "blah");
        }, "blah: expected 1 to be a string");
    });

    it("isNotString", function () {
        assert.isNotString(3);
        assert.isNotString([ "hello" ]);

        err(function () {
            assert.isNotString("hello", "blah");
        }, "blah: not expected \"hello\" to be a string");
    });

    it("isNumber", function() {
        assert.isNumber(1);
        assert.isNumber(Number("3"));

        err(function () {
            assert.isNumber("1", "blah");
        }, "blah: expected \"1\" to be a number");
    });

    it("isNotNumber", function () {
        assert.isNotNumber("hello");
        assert.isNotNumber([ 5 ]);

        err(function () {
            assert.isNotNumber(4, "blah");
        }, "blah: not expected 4 to be a number");
    });

    // it("isFinite", function() {
    //     assert.isFinite(4);
    //     assert.isFinite(-10);

    //     err(function(){
    //         assert.isFinite(NaN, "blah");
    //     }, "blah: expected NaN to be a finite number");

    //     err(function(){
    //         assert.isFinite(Infinity);
    //     }, "expected Infinity to be a finite number");

    //     err(function(){
    //         assert.isFinite("foo");
    //     }, "expected \"foo\" to be a finite number");

    //     err(function(){
    //         assert.isFinite([]);
    //     }, "expected [] to be a finite number");

    //     err(function(){
    //         assert.isFinite({});
    //     }, "expected {} to be a finite number");
    // })

    it("isBoolean", function() {
        assert.isBoolean(true);
        assert.isBoolean(false);

        err(function () {
            assert.isBoolean("1", "blah");
        }, "blah: expected \"1\" to be a boolean");
    });

    it("isNotBoolean", function () {
        assert.isNotBoolean("true");

        err(function () {
            assert.isNotBoolean(true, "blah");
        }, "blah: not expected true to be a boolean");

        err(function () {
            assert.isNotBoolean(false);
        }, "not expected false to be a boolean");
    });

    it("include", function() {
        assert.include("foobar", "bar");
        assert.include("", "");
        assert.include([ 1, 2, 3], 3);

        // .include should work with Error objects and objects with a custom
        // `@@toStringTag`.
        // assert.include(new Error("foo"), {message: "foo"});
        // var customObj = {a: 1};
        // customObj[Symbol.toStringTag] = "foo";

        // assert.include(customObj, {a: 1});

        // var obj1 = {a: 1}
        //     , obj2 = {b: 2};
        // assert.include([obj1, obj2], obj1);
        // assert.include({foo: obj1, bar: obj2}, {foo: obj1});
        // assert.include({foo: obj1, bar: obj2}, {foo: obj1, bar: obj2});

        // var map = new Map();
        // var val = [{a: 1}];
        // map.set("a", val);
        // map.set("b", 2);
        // map.set("c", -0);
        // map.set("d", NaN);

        // assert.include(map, val);
        // assert.include(map, 2);
        // assert.include(map, 0);
        // assert.include(map, NaN);

        // var val = [{a: 1}];
        // var set = new Set();
        // set.add(val);
        // set.add(2);
        // set.add(-0);
        // set.add(NaN);

        // assert.include(set, val);
        // assert.include(set, 2);
        // assert.include(set, 0);
        // assert.include(set, NaN);

        // var ws = new WeakSet();
        // var val = [{a: 1}];
        // ws.add(val);

        // assert.include(ws, val);

        var sym1 = Symbol()
            , sym2 = Symbol();
        assert.include([sym1, sym2], sym1);

        err(function () {
            assert.include("foobar", "baz", "blah");
        }, "blah: expected \"foobar\" to include \"baz\"");

        err(function () {
            assert.include([{a: 1}, {b: 2}], {a: 1});
        }, "expected [{a:1},{b:2}] to include {a:1}");

        err(function () {
            assert.include({foo: {a: 1}, bar: {b: 2}}, {foo: {a: 1}}, "blah");
        }, "blah: expected {foo:{a:1},bar:{b:2}} to have a {foo:{a:1}} property");

        // err(function(){
        //     assert.include(true, true, "blah");
        // },
        // "blah: the given combination of arguments (boolean and boolean) is invalid for this assertion. " +
        // "You can use an array, a map, an object, a set, a string, or a weakset instead of a boolean"
        // );

        // err(function () {
        //     assert.include(42, "bar" as any);
        // },
        // "the given combination of arguments (number and string) is invalid for this assertion. " +
        // "You can use an array, a map, an object, a set, a string, or a weakset instead of a string"
        // );

        // err(function(){
        //     assert.include(null, 42 as any);
        // },
        // "the given combination of arguments (null and number) is invalid for this assertion. " +
        // "You can use an array, a map, an object, a set, a string, or a weakset instead of a number"
        // );

        // err(function () {
        //     assert.include(undefined, "bar" as any);
        // },
        // "the given combination of arguments (undefined and string) is invalid for this assertion. " +
        // "You can use an array, a map, an object, a set, a string, or a weakset instead of a string"
        // );
    });

    it("notInclude", function () {
        assert.notInclude("foobar", "baz");
        assert.notInclude([ 1, 2, 3 ], 4);

        var obj1 = {a: 1}
            , obj2 = {b: 2};
        assert.notInclude([obj1, obj2], {a: 1});
        assert.notInclude({foo: obj1, bar: obj2}, {foo: {a: 1}});
        assert.notInclude({foo: obj1, bar: obj2}, {foo: obj1, bar: {b: 2}});

        var map = new Map();
        var val = [{a: 1}];
        map.set("a", val);
        map.set("b", 2);

        assert.notInclude(map, [{a: 1}]);
        assert.notInclude(map, 3);

        var set = new Set();
        var val = [{a: 1}];
        set.add(val);
        set.add(2);

        assert.include(set, val);
        assert.include(set, 2);

        assert.notInclude(set, [{a: 1}]);
        assert.notInclude(set, 3);

        var ws = new WeakSet();
        var val = [{a: 1}];
        ws.add(val);

        assert.notInclude(ws, [{a: 1}]);
        assert.notInclude(ws, {});

        var sym1 = Symbol()
            , sym2 = Symbol()
            , sym3 = Symbol();
        assert.notInclude([sym1, sym2], sym3);

        // err(function () {
        //     var obj1 = {a: 1}
        //         , obj2 = {b: 2};
        //     assert.notInclude([obj1, obj2], obj1, "blah");
        // }, "blah: expected [ { a: 1 }, { b: 2 } ] to not include { a: 1 }");

        // err(function () {
        //     var obj1 = {a: 1}
        //         , obj2 = {b: 2};
        //     assert.notInclude({foo: obj1, bar: obj2}, {foo: obj1, bar: obj2}, "blah");
        // }, "blah: expected { foo: { a: 1 }, bar: { b: 2 } } to not have property \"foo\" of { a: 1 }");

        // err(function(){
        //     assert.notInclude(true, true, "blah");
        // },
        // "blah: the given combination of arguments (boolean and boolean) is invalid for this assertion. " +
        // "You can use an array, a map, an object, a set, a string, or a weakset instead of a boolean"
        // );

        // err(function () {
        //     assert.notInclude(42, "bar" as any);
        // },
        // "the given combination of arguments (number and string) is invalid for this assertion. " +
        // "You can use an array, a map, an object, a set, a string, or a weakset instead of a string"
        // );

        // err(function(){
        //     assert.notInclude(null, 42 as any);
        // },
        // "the given combination of arguments (null and number) is invalid for this assertion. " +
        // "You can use an array, a map, an object, a set, a string, or a weakset instead of a number"
        // );

        // err(function () {
        //     assert.notInclude(undefined, "bar" as any);
        // },
        // "the given combination of arguments (undefined and string) is invalid for this assertion. " +
        // "You can use an array, a map, an object, a set, a string, or a weakset instead of a string"
        // );

        err(function () {
            assert.notInclude("foobar", "bar");
        }, "not expected \"foobar\" to include \"bar\"");
    });

    // it("deepInclude and notDeepInclude", function () {
    //     var obj1 = {a: 1}
    //         , obj2 = {b: 2};
    //     assert.deepInclude([obj1, obj2], {a: 1});
    //     assert.notDeepInclude([obj1, obj2], {a: 9});
    //     assert.notDeepInclude([obj1, obj2], {z: 1} as any);
    //     assert.deepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}});
    //     assert.deepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 2}});
    //     assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {a: 9}});
    //     assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {z: 1}} as any);
    //     assert.notDeepInclude({foo: obj1, bar: obj2}, {baz: {a: 1}} as any);
    //     assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 9}});

    //     var map = new Map();
    //     map.set(1, [{a: 1}]);

    //     assert.deepInclude(map, [{a: 1}]);

    //     var set = new Set();
    //     set.add([{a: 1}]);

    //     assert.deepInclude(set, [{a: 1}]);

    //     err(function() {
    //         assert.deepInclude(new WeakSet() as any, {}, "foo");
    //     }, "foo: unable to use .deep.include with WeakSet");

    //     err(function () {
    //         assert.deepInclude([obj1, obj2], {a: 9}, "blah");
    //     }, "blah: expected [ { a: 1 }, { b: 2 } ] to deep include { a: 9 }");

    //     err(function () {
    //         assert.notDeepInclude([obj1, obj2], {a: 1});
    //     }, "expected [ { a: 1 }, { b: 2 } ] to not deep include { a: 1 }");

    //     err(function () {
    //         assert.deepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 9}}, "blah");
    //     }, "blah: expected { foo: { a: 1 }, bar: { b: 2 } } to have deep property \"bar\" of { b: 9 }, but got { b: 2 }");

    //     err(function () {
    //         assert.notDeepInclude({foo: obj1, bar: obj2}, {foo: {a: 1}, bar: {b: 2}}, "blah");
    //     }, "blah: expected { foo: { a: 1 }, bar: { b: 2 } } to not have deep property \"foo\" of { a: 1 }");
    // });

    // it("nestedInclude and notNestedInclude", function() {
    //     assert.nestedInclude({a: {b: ["x", "y"]}}, {"a.b[1]": "y"});
    //     assert.notNestedInclude({a: {b: ["x", "y"]}}, {"a.b[1]": "x"});
    //     assert.notNestedInclude({a: {b: ["x", "y"]}}, {"a.c": "y"});

    //     assert.notNestedInclude({a: {b: [{x: 1}]}}, {"a.b[0]": {x: 1}});

    //     assert.nestedInclude({".a": {"[b]": "x"}}, {"\\.a.\\[b\\]": "x"});
    //     assert.notNestedInclude({".a": {"[b]": "x"}}, {"\\.a.\\[b\\]": "y"});

    //     err(function () {
    //         assert.nestedInclude({a: {b: ["x", "y"]}}, {"a.b[1]": "x"}, "blah");
    //     }, "blah: expected {a:{b:[\"x\",\"y\"]}} to have nested property 'a.b[1]' of \"x\", but got \"y\"");

    //     err(function () {
    //         assert.nestedInclude({a: {b: ["x", "y"]}}, {"a.b[1]": "x"}, "blah");
    //     }, "blah: expected {a:{b:[\"x\",\"y\"]}} to have nested property 'a.b[1]' of \"x\", but got \"y\"");

    //     err(function () {
    //         assert.nestedInclude({a: {b: ["x", "y"]}}, {"a.c": "y"});
    //     }, "expected {a:{b:[\"x\",\"y\"]}} to have nested property 'a.c'");

    //     err(function () {
    //         assert.notNestedInclude({a: {b: ["x", "y"]}}, {"a.b[1]": "y"}, "blah");
    //     }, "blah: expected {a:{b:[\"x\",\"y\"]}} to not have nested property 'a.b[1]' of \"y\"");
    // });

    // it("deepNestedInclude and notDeepNestedInclude", function() {
    //     assert.deepNestedInclude({a: {b: [{x: 1}]}}, {"a.b[0]": {x: 1}});
    //     assert.notDeepNestedInclude({a: {b: [{x: 1}]}}, {"a.b[0]": {y: 2}});
    //     assert.notDeepNestedInclude({a: {b: [{x: 1}]}}, {"a.c": {x: 1}});

    //     assert.deepNestedInclude({".a": {"[b]": {x: 1}}}, {"\\.a.\\[b\\]": {x: 1}});
    //     assert.notDeepNestedInclude({".a": {"[b]": {x: 1}}}, {"\\.a.\\[b\\]": {y: 2}});

    //     err(function () {
    //         assert.deepNestedInclude({a: {b: [{x: 1}]}}, {"a.b[0]": {y: 2}}, "blah");
    //     }, "blah: expected {a:{b:[{x:1}]}} to have deep nested property 'a.b[0]' of { y: 2 }, but got { x: 1 }");

    //     err(function () {
    //         assert.deepNestedInclude({a: {b: [{x: 1}]}}, {"a.b[0]": {y: 2}}, "blah");
    //     }, "blah: expected {a:{b:[{x:1}]}} to have deep nested property 'a.b[0]' of { y: 2 }, but got { x: 1 }");

    //     err(function () {
    //         assert.deepNestedInclude({a: {b: [{x: 1}]}}, {"a.c": {x: 1}});
    //     }, "expected {a:{b:[{x:1}]}} to have deep nested property 'a.c'");

    //     err(function () {
    //         assert.notDeepNestedInclude({a: {b: [{x: 1}]}}, {"a.b[0]": {x: 1}}, "blah");
    //     }, "blah: expected {a:{b:[{x:1}]}} to not have deep nested property 'a.b[0]' of { x: 1 }");
    // });

    // it("ownInclude and notOwnInclude", function() {
    //     assert.ownInclude({a: 1}, {a: 1});
    //     assert.notOwnInclude({a: 1}, {a: 3});
    //     assert.notOwnInclude({a: 1}, {"toString": Object.prototype.toString});

    //     assert.notOwnInclude({a: {b: 2}}, {a: {b: 2}});

    //     err(function () {
    //         assert.ownInclude({a: 1}, {a: 3}, "blah");
    //     }, "blah: expected {a:1} to have own property \"a\" of 3, but got 1");

    //     err(function () {
    //         assert.ownInclude({a: 1}, {a: 3}, "blah");
    //     }, "blah: expected {a:1} to have own property \"a\" of 3, but got 1");

    //     err(function () {
    //         assert.ownInclude({a: 1}, {"toString": Object.prototype.toString});
    //     }, "expected {a:1} to have own property \"toString\"");

    //     err(function () {
    //         assert.notOwnInclude({a: 1}, {a: 1}, "blah");
    //     }, "blah: expected {a:1} to not have own property \"a\" of 1");
    // });

    // it("deepOwnInclude and notDeepOwnInclude", function() {
    //     assert.deepOwnInclude({a: {b: 2}}, {a: {b: 2}});
    //     assert.notDeepOwnInclude({a: {b: 2}}, {a: {c: 3}});
    //     assert.notDeepOwnInclude({a: {b: 2}}, {"toString": Object.prototype.toString});

    //     err(function () {
    //         assert.deepOwnInclude({a: {b: 2}}, {a: {c: 3}}, "blah");
    //     }, "blah: expected {a:{b:2}} to have deep own property \"a\" of {c:3}, but got {b:2}");

    //     err(function () {
    //         assert.deepOwnInclude({a: {b: 2}}, {a: {c: 3}}, "blah");
    //     }, "blah: expected {a:{b:2}} to have deep own property \"a\" of {c:3}, but got {b:2}");

    //     err(function () {
    //         assert.deepOwnInclude({a: {b: 2}}, {"toString": Object.prototype.toString});
    //     }, "expected {a:{b:2}} to have deep own property \"toString\"");

    //     err(function () {
    //         assert.notDeepOwnInclude({a: {b: 2}}, {a: {b: 2}}, "blah");
    //     }, "blah: expected {a:{b:2}} to not have deep own property \"a\" of {b:2}");
    // });

    it("keys(array|Object|arguments)", function(){
        assert.hasAllKeys({ foo: 1 }, [ "foo" ]);
        assert.hasAllKeys({ foo: 1, bar: 2 }, [ "foo", "bar" ]);
        assert.hasAllKeys({ foo: 1 }, { foo: 30 });
        assert.hasAllKeys({ foo: 1, bar: 2 }, { "foo": 6, "bar": 7 });

        assert.containsAllKeys({ foo: 1, bar: 2, baz: 3 }, [ "foo", "bar" ]);
        assert.containsAllKeys({ foo: 1, bar: 2, baz: 3 }, [ "bar", "foo" ]);
        assert.containsAllKeys({ foo: 1, bar: 2, baz: 3 }, [ "baz" ]);
        assert.containsAllKeys({ foo: 1, bar: 2 }, [ "foo" ]);
        assert.containsAllKeys({ foo: 1, bar: 2 }, ["bar"]);
        assert.containsAllKeys({ foo: 1, bar: 2 }, { "foo": 6 });
        assert.containsAllKeys({ foo: 1, bar: 2 }, { "bar": 7 });
        assert.containsAllKeys({ foo: 1, bar: 2 }, { "foo": 6 });
        assert.containsAllKeys({ foo: 1, bar: 2 }, { "bar": 7, "foo": 6 });

        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, [ "baz" ]);
        // assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, [ "foo" ]);
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, [ "foo", "baz" ]);
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2, baz: 3 }, [ "foo", "bar", "baz", "fake" ]);
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, [ "baz", "foo" ]);
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { "baz": 8 });
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { "baz": 8, "foo": 7 });
        assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { "baz": 8, "fake": 7 });

        assert.hasAnyKeys({ foo: 1, bar: 2 }, [ "foo", "baz" ]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, [ "foo" ]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, [ "bar", "baz" ]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, [ "bar", "foo" ]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, [ "foo", "bar" ]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, [ "baz", "fake", "foo" ]);
        assert.hasAnyKeys({ foo: 1, bar: 2 }, { "foo": 6 });
        assert.hasAnyKeys({ foo: 1, bar: 2 }, { "baz": 6, "foo": 12 });

        assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, [ "baz", "abc", "def" ]);
        assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, [ "baz" ]);
        assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, { baz: 1, biz: 2, fake: 3 });
        assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, { baz: 1 });

        var enumProp1 = "enumProp1"
            , enumProp2 = "enumProp2"
            , nonEnumProp = "nonEnumProp"
            , obj: any = {};

        obj[enumProp1] = "enumProp1";
        obj[enumProp2] = "enumProp2";

        Object.defineProperty(obj, nonEnumProp, {
            enumerable: false,
            value: "nonEnumProp"
        });

        assert.hasAllKeys(obj, [enumProp1, enumProp2]);
        assert.doesNotHaveAllKeys(obj, [enumProp1, enumProp2, nonEnumProp]);

        var sym1 = Symbol("sym1")
            , sym2 = Symbol("sym2")
            , sym3 = Symbol("sym3")
            , str = "str"
            , obj: any = {};

        obj[sym1] = "sym1";
        obj[sym2] = "sym2";
        obj[str] = "str";

        Object.defineProperty(obj, sym3, {
            enumerable: false,
            value: "sym3"
        });

        assert.hasAllKeys(obj, [sym1, sym2, str]);
        assert.doesNotHaveAllKeys(obj, [sym1, sym2, sym3, str]);

        // var aKey = {thisIs: "anExampleObject"}
        //     , anotherKey = {doingThisBecauseOf: "referential equality"}
        //     , testMap = new Map();

        // testMap.set(aKey, "aValue");
        // testMap.set(anotherKey, "anotherValue");

        // assert.hasAnyKeys(testMap, [ aKey ]);
        // assert.hasAnyKeys(testMap, [ "thisDoesNotExist", "thisToo", aKey ]);
        // assert.hasAllKeys(testMap, [ aKey, anotherKey ]);

        // assert.containsAllKeys(testMap, [ aKey ]);
        // assert.doesNotHaveAllKeys(testMap, [ aKey, {iDoNot: "exist"} ]);

        // assert.doesNotHaveAnyKeys(testMap, [ {iDoNot: "exist"} ]);
        // assert.doesNotHaveAnyKeys(testMap, [ "thisDoesNotExist", "thisToo", {iDoNot: "exist"} ]);
        // assert.doesNotHaveAllKeys(testMap, [ "thisDoesNotExist", "thisToo", anotherKey ]);

        // assert.doesNotHaveAnyKeys(testMap, [ {iDoNot: "exist"}, "thisDoesNotExist" ]);
        // assert.doesNotHaveAnyKeys(testMap, [ "thisDoesNotExist", "thisToo", {iDoNot: "exist"} ]);
        // assert.doesNotHaveAllKeys(testMap, [ aKey, {iDoNot: "exist"} ]);

        // // Ensure the assertions above use strict equality
        // assert.doesNotHaveAnyKeys(testMap, {thisIs: "anExampleObject"});
        // assert.doesNotHaveAllKeys(testMap, [ {thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"} ]);

        // err(function(){
        //     assert.hasAnyKeys(testMap, [ {thisIs: "anExampleObject"} ]);
        // });

        // err(function(){
        //     assert.hasAllKeys(testMap, [ {thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"} ]);
        // });

        // err(function(){
        //     assert.containsAllKeys(testMap, [ {thisIs: "anExampleObject"} ]);
        // });

        // // Tests for the deep variations of the keys assertion
        // assert.hasAnyDeepKeys(testMap, {thisIs: "anExampleObject"});
        // assert.hasAnyDeepKeys(testMap, [{thisIs: "anExampleObject"}, {three: "three"}]);
        // assert.hasAnyDeepKeys(testMap, [{thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"}]);

        // assert.hasAllDeepKeys(testMap, [{thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"}]);

        // assert.containsAllDeepKeys(testMap, {thisIs: "anExampleObject"});
        // assert.containsAllDeepKeys(testMap, [{thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"}]);

        // assert.doesNotHaveAnyDeepKeys(testMap, {thisDoesNot: "exist"});
        // assert.doesNotHaveAnyDeepKeys(testMap, [{twenty: "twenty"}, {fifty: "fifty"}]);

        // assert.doesNotHaveAllDeepKeys(testMap, {thisDoesNot: "exist"});
        // assert.doesNotHaveAllDeepKeys(testMap, [{twenty: "twenty"}, {thisIs: "anExampleObject"}]);

        // var weirdMapKey1 = Object.create(null)
        //     , weirdMapKey2 = {toString: NaN}
        //     , weirdMapKey3: any[] = []
        //     , weirdMap = new Map();

        // weirdMap.set(weirdMapKey1, "val1");
        // weirdMap.set(weirdMapKey2, "val2");

        // assert.hasAllKeys(weirdMap, [weirdMapKey1, weirdMapKey2]);
        // assert.doesNotHaveAllKeys(weirdMap, [weirdMapKey1, weirdMapKey3]);

        // var symMapKey1 = Symbol()
        //     , symMapKey2 = Symbol()
        //     , symMapKey3 = Symbol()
        //     , symMap = new Map();

        // symMap.set(symMapKey1, "val1");
        // symMap.set(symMapKey2, "val2");

        // assert.hasAllKeys(symMap, [symMapKey1, symMapKey2]);
        // assert.hasAnyKeys(symMap, [symMapKey1, symMapKey3]);
        // assert.containsAllKeys(symMap, [symMapKey2, symMapKey1]);

        // assert.doesNotHaveAllKeys(symMap, [symMapKey1, symMapKey3]);
        // assert.doesNotHaveAnyKeys(symMap, [symMapKey3]);

        // var errMap = new Map();

        // errMap.set({1: 20}, "number");

        // err(function(){
        //     assert.hasAllKeys(errMap, [], "blah");
        // }, "blah: keys required");

        // err(function(){
        //     assert.containsAllKeys(errMap, [], "blah");
        // }, "blah: keys required");

        // err(function(){
        //     assert.doesNotHaveAllKeys(errMap, [], "blah");
        // }, "blah: keys required");

        // err(function(){
        //     assert.hasAnyKeys(errMap, [], "blah");
        // }, "blah: keys required");

        // err(function(){
        //     assert.doesNotHaveAnyKeys(errMap, [], "blah");
        // }, "blah: keys required");

        // Uncomment this after solving https://github.com/chaijs/chai/issues/662
        // This should fail because of referential equality (this is a strict comparison)
        // err(function(){
        //   assert.containsAllKeys(new Map([[{foo: 1}, \"bar\"]]), { foo: 1 });
        // }, 'expected [ [ { foo: 1 }, \"bar\" ] ] to contain key { foo: 1 }');

        // err(function(){
        //   assert.containsAllDeepKeys(new Map([[{foo: 1}, \"bar\"]]), { iDoNotExist: 0 })
        // }, 'expected [ { foo: 1 } ] to deeply contain key { iDoNotExist: 0 }');

        // var aKey = {thisIs: "anExampleObject"}
        //     , anotherKey = {doingThisBecauseOf: "referential equality"}
        //     , testSet = new Set();

        // testSet.add(aKey);
        // testSet.add(anotherKey);

        // assert.hasAnyKeys(testSet, [ aKey ]);
        // assert.hasAnyKeys(testSet, [ 20, 1, aKey ]);
        // assert.hasAllKeys(testSet, [ aKey, anotherKey ]);

        // assert.containsAllKeys(testSet, [ aKey ]);
        // assert.doesNotHaveAllKeys(testSet, [ aKey, {iDoNot: "exist"} ]);

        // assert.doesNotHaveAnyKeys(testSet, [ {iDoNot: "exist"} ]);
        // assert.doesNotHaveAnyKeys(testSet, [ "thisDoesNotExist", "thisToo", {iDoNot: "exist"} ]);
        // assert.doesNotHaveAllKeys(testSet, [ "thisDoesNotExist", "thisToo", anotherKey ]);

        // assert.doesNotHaveAnyKeys(testSet, [ {iDoNot: "exist"}, "thisDoesNotExist" ]);
        // assert.doesNotHaveAnyKeys(testSet, [ 20, 1, {iDoNot: "exist"} ]);
        // assert.doesNotHaveAllKeys(testSet, [ "thisDoesNotExist", "thisToo", {iDoNot: "exist"} ]);

        // // Ensure the assertions above use strict equality
        // assert.doesNotHaveAnyKeys(testSet, {thisIs: "anExampleObject"});
        // assert.doesNotHaveAllKeys(testSet, [ {thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"} ]);

        // err(function(){
        //     assert.hasAnyKeys(testSet, [ {thisIs: "anExampleObject"} ]);
        // });

        // err(function(){
        //     assert.hasAllKeys(testSet, [ {thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"} ]);
        // });

        // err(function(){
        //     assert.containsAllKeys(testSet, [ {thisIs: "anExampleObject"} ]);
        // });

        // // Tests for the deep variations of the keys assertion
        // assert.hasAnyDeepKeys(testSet, {thisIs: "anExampleObject"});
        // assert.hasAnyDeepKeys(testSet, [{thisIs: "anExampleObject"}, {three: "three"}]);
        // assert.hasAnyDeepKeys(testSet, [{thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"}]);

        // assert.hasAllDeepKeys(testSet, [{thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"}]);

        // assert.containsAllDeepKeys(testSet, {thisIs: "anExampleObject"});
        // assert.containsAllDeepKeys(testSet, [{thisIs: "anExampleObject"}, {doingThisBecauseOf: "referential equality"}]);

        // assert.doesNotHaveAnyDeepKeys(testSet, {twenty: "twenty"});
        // assert.doesNotHaveAnyDeepKeys(testSet, [{twenty: "twenty"}, {fifty: "fifty"}]);

        // assert.doesNotHaveAllDeepKeys(testSet, {twenty: "twenty"});
        // assert.doesNotHaveAllDeepKeys(testSet, [{thisIs: "anExampleObject"}, {fifty: "fifty"}]);

        // var weirdSetKey1 = Object.create(null)
        //     , weirdSetKey2 = {toString: NaN}
        //     , weirdSetKey3: any[] = []
        //     , weirdSet = new Set();

        // weirdSet.add(weirdSetKey1);
        // weirdSet.add(weirdSetKey2);

        // assert.hasAllKeys(weirdSet, [weirdSetKey1, weirdSetKey2]);
        // assert.doesNotHaveAllKeys(weirdSet, [weirdSetKey1, weirdSetKey3]);

        // var symSetKey1 = Symbol()
        //     , symSetKey2 = Symbol()
        //     , symSetKey3 = Symbol()
        //     , symSet = new Set();

        // symSet.add(symSetKey1);
        // symSet.add(symSetKey2);

        // assert.hasAllKeys(symSet, [symSetKey1, symSetKey2]);
        // assert.hasAnyKeys(symSet, [symSetKey1, symSetKey3]);
        // assert.containsAllKeys(symSet, [symSetKey2, symSetKey1]);

        // assert.doesNotHaveAllKeys(symSet, [symSetKey1, symSetKey3]);
        // assert.doesNotHaveAnyKeys(symSet, [symSetKey3]);

        // var errSet = new Set();

        // errSet.add({1: 20});
        // errSet.add("number");

        // err(function(){
        //     assert.hasAllKeys(errSet, [], "blah");
        // }, "blah: keys required");

        // err(function(){
        //     assert.containsAllKeys(errSet, [], "blah");
        // }, "blah: keys required");

        // err(function(){
        //     assert.doesNotHaveAllKeys(errSet, [], "blah");
        // }, "blah: keys required");

        // err(function(){
        //     assert.hasAnyKeys(errSet, [], "blah");
        // }, "blah: keys required");

        // err(function(){
        //     assert.doesNotHaveAnyKeys(errSet, [], "blah");
        // }, "blah: keys required");

        // Uncomment this after solving https://github.com/chaijs/chai/issues/662
        // This should fail because of referential equality (this is a strict comparison)
        // err(function(){
        //   assert.containsAllKeys(new Set([{foo: 1}]), { foo: 1 });
        // }, 'expected [ [ { foo: 1 }, \"bar\" ] ] to contain key { foo: 1 }');

        // err(function(){
        //   assert.containsAllDeepKeys(new Set([{foo: 1}]), { iDoNotExist: 0 })
        // }, 'expected [ { foo: 1 } ] to deeply contain key { iDoNotExist: 0 }');

        err(function(){
            assert.hasAllKeys({ foo: 1 }, [], "blah");
        }, "blah: expected at least one key to be provided []", true);

        err(function(){
            assert.containsAllKeys({ foo: 1 }, [], "blah");
        }, "blah: expected at least one key to be provided []", true);

        err(function(){
            assert.doesNotHaveAllKeys({ foo: 1 }, [], "blah");
        }, "blah: expected at least one key to be provided []", true);

        err(function(){
            assert.hasAnyKeys({ foo: 1 }, [], "blah");
        }, "blah: expected at least one key to be provided []", true);

        err(function(){
            assert.doesNotHaveAnyKeys({ foo: 1 }, [], "blah");
        }, "blah: expected at least one key to be provided []", true);

        err(function(){
            assert.hasAllKeys({ foo: 1 }, ["bar"], "blah");
        }, "blah: expected all keys: [bar], missing: [bar], found: [foo]");

        err(function(){
            assert.hasAllKeys({ foo: 1 }, ["bar", "baz"]);
        }, "expected all keys: [bar,baz], missing: [bar,baz], found: [foo]");

        err(function(){
            assert.hasAllKeys({ foo: 1 }, ["foo", "bar", "baz"]);
        }, "expected all keys: [foo,bar,baz], missing: [bar,baz], found: [foo]");

        err(function(){
            assert.doesNotHaveAllKeys({ foo: 1 }, ["foo"], "blah");
        }, "blah: not expected all keys: [foo], missing: [], found: [foo]");

        err(function(){
            assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, ["foo", "bar"]);
        }, "not expected all keys: [foo,bar], missing: [], found: [foo,bar]");

        // err(function(){
        assert.hasAllKeys({ foo: 1, bar: 2 }, ["foo"]);
        // }, "expected { foo: 1, bar: 2 } to have key \"foo\"");

        err(function(){
            assert.containsAllKeys({ foo: 1 }, ["foo", "bar"], "blah");
        }, "blah: expected all keys: [foo,bar], missing: [bar], found: [foo]", true);

        err(function() {
            assert.hasAnyKeys({ foo: 1 }, ["baz"], "blah");
        }, "blah: expected any key: [baz], found: [foo]");

        err(function(){
            assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, ["foo", "bar"]);
        }, "not expected all keys: [foo,bar], missing: [], found: [foo,bar]");

        err(function(){
            assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, ["foo", "baz"], "blah");
        }, "blah: not expected any key: [foo,baz], found: [foo,bar] (2 keys)");

        // repeat previous tests with Object as arg.
        err(function(){
            assert.hasAllKeys({ foo: 1 }, { "bar": 1 }, "blah");
        }, "blah: expected all keys: [bar], missing: [bar], found: [foo]");

        err(function(){
            assert.hasAllKeys({ foo: 1 }, { "bar": 1, "baz": 1});
        }, "expected all keys: [bar,baz], missing: [bar,baz], found: [foo]");

        err(function(){
            assert.hasAllKeys({ foo: 1 }, { "foo": 1, "bar": 1, "baz": 1});
        }, "expected all keys: [foo,bar,baz], missing: [bar,baz], found: [foo]");

        err(function(){
            assert.doesNotHaveAllKeys({ foo: 1 }, { "foo": 1 }, "blah");
        }, "blah: not expected all keys: [foo], missing: [], found: [foo]");

        err(function(){
            assert.doesNotHaveAllKeys({ foo: 1 }, { "foo": 1 });
        }, "not expected all keys: [foo], missing: [], found: [foo]");

        err(function(){
            assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { "foo": 1, "bar": 1});
        }, "not expected all keys: [foo,bar], missing: [], found: [foo,bar]");

        err(function() {
            assert.hasAnyKeys({ foo: 1 }, "baz" as any, "blah");
        }, "blah: expected any key: [baz], found: [foo] (1 keys)");

        err(function(){
            assert.doesNotHaveAllKeys({ foo: 1, bar: 2 }, { "foo": 1, "bar": 1});
        }, "not expected all keys: [foo,bar], missing: [], found: [foo,bar]");

        err(function(){
            assert.doesNotHaveAnyKeys({ foo: 1, bar: 2 }, { "foo": 1, "baz": 1}, "blah");
        }, "blah: not expected any key: [foo,baz], found: [foo,bar] (2 keys)");
    });

    // it("lengthOf", function() {
    //     assert.lengthOf([1,2,3], 3);
    //     assert.lengthOf("foobar", 6);

    //     err(function () {
    //         assert.lengthOf("foobar", 5, "blah");
    //     }, "blah: expected \"foobar\" to have a length of 5 but got 6");

    //     err(function () {
    //         assert.lengthOf(1 as any, 5);
    //     }, "expected 1 to have property \"length\"");

    //     assert.lengthOf(new Map(), 0);

    //     var map = new Map();
    //     map.set("a", 1);
    //     map.set("b", 2);

    //     assert.lengthOf(map, 2);

    //     err(function(){
    //         assert.lengthOf(map, 3, "blah");
    //     }, "blah: expected Map{ \"a\" => 1, \"b\" => 2 } to have a size of 3 but got 2");

    //     assert.lengthOf(new Set(), 0);

    //     var set = new Set();
    //     set.add(1);
    //     set.add(2);

    //     assert.lengthOf(set, 2);

    //     err(function(){
    //         assert.lengthOf(set, 3, "blah");
    //     }, "blah: expected Set{ 1, 2 } to have a size of 3 but got 2");
    // });

    it("match", function () {
        assert.match("foobar", /^foo/);
        assert.notMatch("foobar", /^bar/);

        err(function () {
            assert.match("foobar", /^bar/i, "blah");
        }, "blah: expected \"foobar\" to match /^bar/i");

        err(function () {
            assert.notMatch("foobar", /^foo/i, "blah");
        }, "blah: not expected \"foobar\" to match /^foo/i");
    });

    it("property", function () {
        var obj = { foo: { bar: "baz" } };
        // var simpleObj = { foo: "bar" };
        var undefinedKeyObj = { foo: undefined as any };
        // var dummyObj = { a: "1" };
        assert.property(obj, "foo");
        assert.property(obj, "toString");
        // assert.propertyVal(obj, "toString", Object.prototype.toString);
        assert.property(undefinedKeyObj, "foo");
        // assert.propertyVal(undefinedKeyObj, "foo", undefined);
        // assert.nestedProperty(obj, "foo.bar");
        assert.notProperty(obj, "baz");
        assert.notProperty(obj, "foo.bar");
        // assert.notPropertyVal(simpleObj, "foo", "flow");
        // assert.notPropertyVal(simpleObj, "flow", "bar");
        // assert.notPropertyVal(obj, "foo", {bar: "baz"});
        // assert.notNestedProperty(obj, "foo.baz");
        // assert.nestedPropertyVal(obj, "foo.bar", "baz");
        // assert.notNestedPropertyVal(obj, "foo.bar", "flow");
        // assert.notNestedPropertyVal(obj, "foo.flow", "baz");

        err(function () {
            assert.property(obj, "baz", "blah");
        }, "blah: expected {foo:{bar:\"baz\"}} to have a \"baz\" property");

        // err(function () {
        //     assert.nestedProperty(obj, "foo.baz", "blah");
        // }, "blah: expected { foo: { bar: \"baz\" } } to have nested property 'foo.baz'");

        err(function () {
            assert.notProperty(obj, "foo", "blah");
        }, "blah: not expected {foo:{bar:\"baz\"}} to have a \"foo\" property");

        // err(function () {
        //     assert.notNestedProperty(obj, "foo.bar", "blah");
        // }, "blah: expected { foo: { bar: \"baz\" } } to not have nested property 'foo.bar'");

        // err(function () {
        //     assert.propertyVal(simpleObj, "foo", "ball", "blah");
        // }, "blah: expected { foo: \"bar\" } to have property \"foo\" of \"ball\", but got \"bar\"");

        // err(function () {
        //     assert.propertyVal(simpleObj, "foo", undefined);
        // }, "expected { foo: \"bar\" } to have property \"foo\" of undefined, but got \"bar\"");

        // err(function () {
        //     assert.nestedPropertyVal(obj, "foo.bar", "ball", "blah");
        // }, "blah: expected { foo: { bar: \"baz\" } } to have nested property 'foo.bar' of \"ball\", but got \"baz\"");

        // err(function () {
        //     assert.notPropertyVal(simpleObj, "foo", "bar", "blah");
        // }, "blah: expected { foo: \"bar\" } to not have property \"foo\" of \"bar\"");

        // err(function () {
        //     assert.notNestedPropertyVal(obj, "foo.bar", "baz", "blah");
        // }, "blah: expected { foo: { bar: \"baz\" } } to not have nested property 'foo.bar' of \"baz\"");

        err(function () {
            assert.property(null, "a", "blah");
        }, "blah: expected null to have a \"a\" property");

        err(function () {
            assert.property(undefined, "a", "blah");
        }, "blah: expected undefined to have a \"a\" property");

        err(function () {
            assert.property({a:1}, {"a":"1"} as any, "blah");
        }, "blah: expected {a:\"1\"} to be a string, symbol, or number");

        // err(function () {
        //     assert.propertyVal(dummyObj, "a", "2", "blah");
        // }, "blah: expected { a: \"1\" } to have property \"a\" of \"2\", but got \"1\"");

        // err(function () {
        //     assert.nestedProperty({a:1}, {"a":"1"} as any, "blah");
        // }, "blah: the argument to property must be a string when using nested syntax");
    });

    // it("deepPropertyVal", function () {
    //     var obj = {a: {b: 1}};
    //     assert.deepPropertyVal(obj, "a", {b: 1});
    //     assert.notDeepPropertyVal(obj, "a", {b: 7});
    //     assert.notDeepPropertyVal(obj, "a", {z: 1});
    //     assert.notDeepPropertyVal(obj, "z", {b: 1});

    //     err(function () {
    //         assert.deepPropertyVal(obj, "a", {b: 7}, "blah");
    //     }, "blah: expected { a: { b: 1 } } to have deep property \"a\" of { b: 7 }, but got { b: 1 }");

    //     err(function () {
    //         assert.deepPropertyVal(obj, "z", {b: 1}, "blah");
    //     }, "blah: expected { a: { b: 1 } } to have deep property \"z\"");

    //     err(function () {
    //         assert.notDeepPropertyVal(obj, "a", {b: 1}, "blah");
    //     }, "blah: expected { a: { b: 1 } } to not have deep property \"a\" of { b: 1 }");
    // });

    // it("ownProperty", function() {
    //     var coffeeObj = { coffee: "is good" };

    //     // This has length = 17
    //     var teaObj = "but tea is better";

    //     assert.ownProperty(coffeeObj, "coffee");
    //     assert.ownProperty(teaObj, "length");

    //     assert.ownPropertyVal(coffeeObj, "coffee", "is good");
    //     assert.ownPropertyVal(teaObj, "length", 17);

    //     assert.notOwnProperty(coffeeObj, "length");
    //     assert.notOwnProperty(coffeeObj, "toString");
    //     assert.notOwnProperty(teaObj, "calories");

    //     assert.notOwnPropertyVal(coffeeObj, "coffee", "is bad");
    //     assert.notOwnPropertyVal(teaObj, "length", 1);
    //     assert.notOwnPropertyVal(coffeeObj, "toString", Object.prototype.toString);
    //     assert.notOwnPropertyVal({a: {b: 1}}, "a", {b: 1});

    //     err(function () {
    //         assert.ownProperty(coffeeObj, "calories", "blah");
    //     }, "blah: expected { coffee: 'is good' } to have own property \"calories\"");

    //     err(function () {
    //         assert.notOwnProperty(coffeeObj, "coffee", "blah");
    //     }, "blah: expected { coffee: 'is good' } to not have own property \"coffee\"");

    //     err(function () {
    //         assert.ownPropertyVal(teaObj, "length", 1, "blah");
    //     }, "blah: expected 'but tea is better' to have own property \"length\" of 1, but got 17");

    //     err(function () {
    //         assert.notOwnPropertyVal(teaObj, "length", 17, "blah");
    //     }, "blah: expected 'but tea is better' to not have own property \"length\" of 17");

    //     err(function () {
    //         assert.ownPropertyVal(teaObj, "calories", 17);
    //     }, "expected 'but tea is better' to have own property \"calories\"");

    //     err(function () {
    //         assert.ownPropertyVal(teaObj, "calories", 17);
    //     }, "expected 'but tea is better' to have own property \"calories\"");
    // });

    // it("deepOwnPropertyVal", function () {
    //     var obj = {a: {b: 1}};
    //     assert.deepOwnPropertyVal(obj, "a", {b: 1});
    //     assert.notDeepOwnPropertyVal(obj, "a", {z: 1});
    //     assert.notDeepOwnPropertyVal(obj, "a", {b: 7});
    //     assert.notDeepOwnPropertyVal(obj, "toString", Object.prototype.toString);

    //     err(function () {
    //         assert.deepOwnPropertyVal(obj, "a", {z: 7}, "blah");
    //     }, "blah: expected { a: { b: 1 } } to have deep own property \"a\" of { z: 7 }, but got { b: 1 }");

    //     err(function () {
    //         assert.deepOwnPropertyVal(obj, "z", {b: 1}, "blah");
    //     }, "blah: expected { a: { b: 1 } } to have deep own property \"z\"");

    //     err(function () {
    //         assert.notDeepOwnPropertyVal(obj, "a", {b: 1}, "blah");
    //     }, "blah: expected { a: { b: 1 } } to not have deep own property \"a\" of { b: 1 }");
    // });

    // it("deepNestedPropertyVal", function () {
    //     var obj = {a: {b: {c: 1}}};
    //     assert.deepNestedPropertyVal(obj, "a.b", {c: 1});
    //     assert.notDeepNestedPropertyVal(obj, "a.b", {c: 7});
    //     assert.notDeepNestedPropertyVal(obj, "a.b", {z: 1});
    //     assert.notDeepNestedPropertyVal(obj, "a.z", {c: 1});

    //     err(function () {
    //         assert.deepNestedPropertyVal(obj, "a.b", {c: 7}, "blah");
    //     }, "blah: expected { a: { b: { c: 1 } } } to have deep nested property 'a.b' of { c: 7 }, but got { c: 1 }");

    //     err(function () {
    //         assert.deepNestedPropertyVal(obj, "a.z", {c: 1}, "blah");
    //     }, "blah: expected { a: { b: { c: 1 } } } to have deep nested property 'a.z'");

    //     err(function () {
    //         assert.notDeepNestedPropertyVal(obj, "a.b", {c: 1}, "blah");
    //     }, "blah: expected {a:{b:{c:1}}} to not have deep nested property \"a.b\" of {c:1}");
    // });

    it("throws / throw / Throw", function() {
        class CustomError extends Error {}

        ["throws", "throw", "Throw"].forEach(function (throws) {
            (assert as any)[throws](function() {
                throw new Error("foo");
            });
            (assert as any)[throws](function() {
                throw new Error("");
            }, "");
            (assert as any)[throws](function() {
                throw new Error("bar");
            }, "bar");
            (assert as any)[throws](function() {
                throw new Error("bar");
            }, /bar/);
            (assert as any)[throws](function() {
                throw new Error("bar");
            }, Error);
            (assert as any)[throws](function() {
                throw new Error("bar");
            }, Error, "bar");
            (assert as any)[throws](function() {
                throw new Error("");
            }, Error, "");
            (assert as any)[throws](function() {
                throw new Error("foo")
            }, "");
            (assert as any)[throws](function() {
                throw "";
            }, "");
            (assert as any)[throws](function() {
                throw "";
            }, /^$/);
            (assert as any)[throws](function() {
                throw new Error("");
            }, /^$/);
            (assert as any)[throws](function() {
                throw undefined;
            });
            (assert as any)[throws](function() {
                throw new CustomError("foo");
            });
            (assert as any)[throws](function() {
                throw (() => {});
            });

            var thrownErr = (assert as any)[throws](function() {
                throw new Error("foo");
            });
            assert(thrownErr instanceof Error, "assert." + throws + " returns error");
            assert(thrownErr.message === "foo", "assert." + throws + " returns error message");

            err(function () {
                (assert as any)[throws](function() {
                    throw new Error("foo")
                }, TypeError);
            }, "expected [Function] to throw an error of type TypeError() but threw [Error:\"foo\"]")

            err(function () {
                (assert as any)[throws](function() {
                    throw new Error("foo")
                }, "bar");
            }, "expected [Function] to throw an error with a message containing \"bar\" but it was \"foo\"")

            err(function () {
                (assert as any)[throws](function() {
                    throw new Error("foo")
                }, Error, "bar", "blah");
            }, "blah: expected [Function] to throw an error of type Error() with a message containing \"bar\" but [Error:\"foo\"] was thrown")

            err(function () {
                (assert as any)[throws](function() {
                    throw new Error("foo")
                }, TypeError, "bar", "blah");
            }, "blah: expected [Function] to throw an error of type TypeError() with a message containing \"bar\" but [Error:\"foo\"] was thrown")

            err(function () {
                (assert as any)[throws](function() {});
            }, "expected [Function] to throw an error");

            err(function () {
                (assert as any)[throws](function() {
                    throw new Error("")
                }, "bar");
            }, " expected [Function] to throw an error with a message containing \"bar\" but it was \"\"");

            err(function () {
                (assert as any)[throws](function() {
                    throw new Error("")
                }, /bar/);
            }, "expected [Function] to throw an error with a message matching /bar/ but it was \"\"");

            err(function () {
                (assert as any)[throws]({});
            }, "expected {} to be a function");

            err(function () {
                (assert as any)[throws]({}, Error, "testing", "blah");
            }, "blah: expected {} to be a function");
        });
    });

    it("doesNotThrow", function() {
        class CustomError {
            name: string;
            message: string;
            
            constructor (message: string) {
                this.name = "CustomError";
                this.message = message;
            }
        }
        CustomError.prototype = Object.create(Error.prototype);

        assert.doesNotThrow(function a() { });
        assert.doesNotThrow(function b() { }, "foo");
        assert.doesNotThrow(function c() { }, "");

        assert.doesNotThrow(function() {
            throw new Error("This is a message");
        }, TypeError);

        assert.doesNotThrow(function() {
            throw new Error("This is a message");
        }, "Another message");

        assert.doesNotThrow(function() {
            throw new Error("This is a message");
        }, /Another message/);

        assert.doesNotThrow(function() {
            throw new Error("This is a message");
        }, Error, "Another message");

        assert.doesNotThrow(function() {
            throw new Error("This is a message");
        }, Error, /Another message/);

        assert.doesNotThrow(function() {
            throw new Error("This is a message");
        }, TypeError, "Another message");

        assert.doesNotThrow(function() {
            throw new Error("This is a message");
        }, TypeError, /Another message/);

        err(function () {
            assert.doesNotThrow(function() {
                throw new Error("foo");
            });
        }, "not expected [Function] to throw an error but [Error:\"foo\"] was thrown");

        err(function () {
            assert.doesNotThrow(function() {
                throw (new CustomError("foo")) as any;
            });
        }, "not expected [Function] to throw an error but [CustomError:\"foo\"] was thrown");

        err(function () {
            assert.doesNotThrow(function() {
                throw new Error("foo");
            }, Error);
        }, "not expected [Function] to throw an error of type Error() but threw [Error:\"foo\"]");

        err(function () {
            assert.doesNotThrow(function() {
                throw new CustomError("foo");
            }, CustomError as any);
        }, "not expected [Function] to throw an error of type CustomError() but threw [CustomError:\"foo\"]");

        err(function () {
            assert.doesNotThrow(function() {
                throw new Error("foo");
            }, "foo");
        }, "not expected [Function] to throw an error with a message containing \"foo\"");

        err(function () {
            assert.doesNotThrow(function() {
                throw new Error("foo");
            }, /foo/);
        }, "not expected [Function] to throw an error with a message matching /foo/");

        err(function () {
            assert.doesNotThrow(function() {
                throw new Error("foo");
            }, Error, "foo", "blah");
        }, "blah: not expected [Function] to throw an error of type Error() with a message containing \"foo\" but [Error:\"foo\"] was thrown");

        err(function () {
            assert.doesNotThrow(function() {
                throw new CustomError("foo");
            }, CustomError as any, "foo", "blah");
        }, "blah: not expected [Function] to throw an error of type CustomError() with a message containing \"foo\" but [CustomError:\"foo\"] was thrown");

        err(function () {
            assert.doesNotThrow(function() {
                throw new Error("");
            }, "");
        }, "not expected [Function] to throw an error with a message containing \"\"");

        err(function () {
            assert.doesNotThrow(function() {
                throw new Error("");
            }, Error, "");
        }, "not expected [Function] to throw an error of type Error() with a message containing \"\" but [Error:\"\"] was thrown");

        err(function () {
            assert.doesNotThrow({} as any);
        }, "expected {} to be a function");

        err(function () {
            assert.doesNotThrow({} as any, Error, "testing", "blah");
        }, "blah: expected {} to be a function");
    });

    // it("ifError", function() {
    //     assert.ifError(false);
    //     assert.ifError(null);
    //     assert.ifError(undefined);

    //     err(function () {
    //         var err = new Error("This is an error message");
    //         assert.ifError(err);
    //     }, "This is an error message");
    // });

    // it("operator", function() {
    // // For testing undefined and null with == and ===
    //     var w: any;

    //     assert.operator(1, "<", 2);
    //     assert.operator(2, ">", 1);
    //     assert.operator(1, "==", 1);
    //     assert.operator(1, "<=", 1);
    //     assert.operator(1, ">=", 1);
    //     assert.operator(1, "!=", 2);
    //     assert.operator(1, "!==", 2);
    //     assert.operator(1, "!==", "1");
    //     assert.operator(w, "==", undefined);
    //     assert.operator(w, "===", undefined);
    //     assert.operator(w, "==", null);

    //     err(function () {
    //         assert.operator(1, "=", 2, "blah");
    //     }, "blah: Invalid operator \"=\"");

    //     err(function () {
    //         assert.operator(2, "<", 1, "blah");
    //     }, "blah: expected 2 to be < 1");

    //     err(function () {
    //         assert.operator(1, ">", 2);
    //     }, "expected 1 to be > 2");

    //     err(function () {
    //         assert.operator(1, "==", 2);
    //     }, "expected 1 to be == 2");

    //     err(function () {
    //         assert.operator(1, "===", "1");
    //     }, "expected 1 to be === \"1\"");

    //     err(function () {
    //         assert.operator(2, "<=", 1);
    //     }, "expected 2 to be <= 1");

    //     err(function () {
    //         assert.operator(1, ">=", 2);
    //     }, "expected 1 to be >= 2");

    //     err(function () {
    //         assert.operator(1, "!=", 1);
    //     }, "expected 1 to be != 1");

    //     err(function () {
    //         assert.operator(1, "!==", 1);
    //     }, "expected 1 to be !== 1");

    //     err(function () {
    //         assert.operator(w, "===", null);
    //     }, "expected undefined to be === null");
    // });

    // it("closeTo", function(){
    //     assert.closeTo(1.5, 1.0, 0.5);
    //     assert.closeTo(10, 20, 20);
    //     assert.closeTo(-10, 20, 30);

    //     err(function(){
    //         assert.closeTo(2, 1.0, 0.5, "blah");
    //     }, "blah: expected 2 to be close to 1 +/- 0.5");

    //     err(function(){
    //         assert.closeTo(-10, 20, 29);
    //     }, "expected -10 to be close to 20 +/- 29");

    //     err(function() {
    //         assert.closeTo([1.5] as any, 1.0, 0.5, "blah");
    //     }, "blah: expected [ 1.5 ] to be a number");

    //     err(function() {
    //         assert.closeTo(1.5, "1.0" as any, 0.5, "blah");
    //     }, "blah: the arguments to closeTo or approximately must be numbers");

    //     err(function() {
    //         assert.closeTo(1.5, 1.0, true as any, "blah");
    //     }, "blah: the arguments to closeTo or approximately must be numbers");

    //     err(function() {
    //         assert.closeTo(1.5, 1.0, undefined as any, "blah");
    //     }, "blah: the arguments to closeTo or approximately must be numbers, and a delta is required");
    // });

    // it("approximately", function(){
    //     assert.approximately(1.5, 1.0, 0.5);
    //     assert.approximately(10, 20, 20);
    //     assert.approximately(-10, 20, 30);

    //     err(function(){
    //         assert.approximately(2, 1.0, 0.5, "blah");
    //     }, "blah: expected 2 to be close to 1 +/- 0.5");

    //     err(function(){
    //         assert.approximately(-10, 20, 29);
    //     }, "expected -10 to be close to 20 +/- 29");

    //     err(function() {
    //         assert.approximately([1.5] as any, 1.0, 0.5);
    //     }, "expected [ 1.5 ] to be a number");

    //     err(function() {
    //         assert.approximately(1.5, "1.0" as any, 0.5, "blah");
    //     }, "blah: the arguments to closeTo or approximately must be numbers");

    //     err(function() {
    //         assert.approximately(1.5, 1.0, true as any, "blah");
    //     }, "blah: the arguments to closeTo or approximately must be numbers");

    //     err(function() {
    //         assert.approximately(1.5, 1.0, undefined as any, "blah");
    //     }, "blah: the arguments to closeTo or approximately must be numbers, and a delta is required");
    // });

    // it("sameMembers", function() {
    //     assert.sameMembers([], []);
    //     assert.sameMembers([1, 2, 3], [3, 2, 1]);
    //     assert.sameMembers([4, 2], [4, 2]);
    //     assert.sameMembers([4, 2, 2], [4, 2, 2]);

    //     assert.sameMembers(new Set([1,2,3]) as any, new Set([3,2,1]) as any);

    //     err(function() {
    //         assert.sameMembers([], [1, 2], "blah");
    //     }, "blah: expected [] to have the same members as [ 1, 2 ]");

    //     err(function() {
    //         assert.sameMembers([1, 54], [6, 1, 54]);
    //     }, "expected [ 1, 54 ] to have the same members as [ 6, 1, 54 ]");

    //     err(function () {
    //         assert.sameMembers({} as any, [], "blah");
    //     }, "blah: expected {} to be an iterable");

    //     err(function () {
    //         assert.sameMembers([], {} as any, "blah");
    //     }, "blah: expected {} to be an iterable");
    // });

    // it("notSameMembers", function() {
    //     assert.notSameMembers([1, 2, 3], [2, 1, 5]);
    //     assert.notSameMembers([1, 2, 3], [1, 2, 3, 3]);
    //     assert.notSameMembers([1, 2], [1, 2, 2]);
    //     assert.notSameMembers([1, 2, 2], [1, 2]);
    //     assert.notSameMembers([1, 2, 2], [1, 2, 3]);
    //     assert.notSameMembers([1, 2, 3], [1, 2, 2]);
    //     assert.notSameMembers([{a: 1}], [{a: 1}]);

    //     err(function() {
    //         assert.notSameMembers([1, 2, 3], [2, 1, 3], "blah");
    //     }, "blah: expected [ 1, 2, 3 ] to not have the same members as [ 2, 1, 3 ]");
    // });

    // it("sameDeepMembers", function() {
    //     assert.sameDeepMembers([ {b: 3}, {a: 2}, {c: 5} ], [ {c: 5}, {b: 3}, {a: 2} ], "same deep members");
    //     assert.sameDeepMembers([ {b: 3}, {a: 2}, 5, "hello" ], [ "hello", 5, {b: 3}, {a: 2} ], "same deep members");
    //     assert.sameDeepMembers([{a: 1}, {b: 2}, {b: 2}], [{a: 1}, {b: 2}, {b: 2}]);

    //     err(function() {
    //         assert.sameDeepMembers([ {b: 3} ], [ {c: 3} ], "blah")
    //     }, "blah: expected [ { b: 3 } ] to have the same members as [ { c: 3 } ]");

    //     err(function() {
    //         assert.sameDeepMembers([ {b: 3} ], [ {b: 5} ])
    //     }, "expected [ { b: 3 } ] to have the same members as [ { b: 5 } ]");
    // });

    // it("notSameDeepMembers", function() {
    //     assert.notSameDeepMembers([{a: 1}, {b: 2}, {c: 3}], [{b: 2}, {a: 1}, {f: 5}] as any);
    //     assert.notSameDeepMembers([{a: 1}, {b: 2}], [{a: 1}, {b: 2}, {b: 2}]);
    //     assert.notSameDeepMembers([{a: 1}, {b: 2}, {b: 2}], [{a: 1}, {b: 2}]);
    //     assert.notSameDeepMembers([{a: 1}, {b: 2}, {b: 2}], [{a: 1}, {b: 2}, {c: 3}]);
    //     assert.notSameDeepMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}, {b: 2}]);

    //     err(function() {
    //         assert.notSameDeepMembers([{a: 1}, {b: 2}, {c: 3}], [{b: 2}, {a: 1}, {c: 3}], "blah");
    //     }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to not have the same members as [ { b: 2 }, { a: 1 }, { c: 3 } ]");
    // });

    // it("sameOrderedMembers", function() {
    //     assert.sameOrderedMembers([1, 2, 3], [1, 2, 3]);
    //     assert.sameOrderedMembers([1, 2, 2], [1, 2, 2]);

    //     err(function() {
    //         assert.sameOrderedMembers([1, 2, 3], [2, 1, 3], "blah");
    //     }, "blah: expected [ 1, 2, 3 ] to have the same ordered members as [ 2, 1, 3 ]");
    // });

    // it("notSameOrderedMembers", function() {
    //     assert.notSameOrderedMembers([1, 2, 3], [2, 1, 3]);
    //     assert.notSameOrderedMembers([1, 2, 3], [1, 2]);
    //     assert.notSameOrderedMembers([1, 2], [1, 2, 2]);
    //     assert.notSameOrderedMembers([1, 2, 2], [1, 2]);
    //     assert.notSameOrderedMembers([1, 2, 2], [1, 2, 3]);
    //     assert.notSameOrderedMembers([1, 2, 3], [1, 2, 2]);

    //     err(function() {
    //         assert.notSameOrderedMembers([1, 2, 3], [1, 2, 3], "blah");
    //     }, "blah: expected [ 1, 2, 3 ] to not have the same ordered members as [ 1, 2, 3 ]");
    // });

    // it("sameDeepOrderedMembers", function() {
    //     assert.sameDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}, {c: 3}]);
    //     assert.sameDeepOrderedMembers([{a: 1}, {b: 2}, {b: 2}], [{a: 1}, {b: 2}, {b: 2}]);

    //     err(function() {
    //         assert.sameDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{b: 2}, {a: 1}, {c: 3}], "blah");
    //     }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to have the same ordered members as [ { b: 2 }, { a: 1 }, { c: 3 } ]");
    // });

    // it("notSameDeepOrderedMembers", function() {
    //     assert.notSameDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{b: 2}, {a: 1}, {c: 3}]);
    //     assert.notSameDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}, {f: 5}] as any);
    //     assert.notSameDeepOrderedMembers([{a: 1}, {b: 2}], [{a: 1}, {b: 2}, {b: 2}]);
    //     assert.notSameDeepOrderedMembers([{a: 1}, {b: 2}, {b: 2}], [{a: 1}, {b: 2}]);
    //     assert.notSameDeepOrderedMembers([{a: 1}, {b: 2}, {b: 2}], [{a: 1}, {b: 2}, {c: 3}]);
    //     assert.notSameDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}, {b: 2}]);

    //     err(function() {
    //         assert.notSameDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}, {c: 3}], "blah");
    //     }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to not have the same ordered members as [ { a: 1 }, { b: 2 }, { c: 3 } ]");
    // });

    it("includeMembers", function() {
        assert.includeMembers([1, 2, 3], [2, 3, 2]);
        assert.includeMembers([1, 2, 3], []);
        assert.includeMembers([1, 2, 3], [3]);

        err(function() {
            assert.includeMembers([5, 6], [7, 8], "blah");
        }, "blah: expected all values: [7,8], missing: [7,8], found: [5,6]");

        err(function() {
            assert.includeMembers([5, 6], [5, 6, 0]);
        }, "expected all values: [5,6,0], missing: [0], found: [5,6]");
    });

    it("notIncludeMembers", function() {
        assert.notIncludeMembers([1, 2, 3], [5, 1]);
        assert.notIncludeMembers([{a: 1}], [{a: 1}]);

        err(function() {
            assert.notIncludeMembers([1, 2, 3], [2, 1], "blah");
        }, "blah: not expected all values: [2,1], missing: [], found: [1,2,3]");
    });

    // it("includeDeepMembers", function() {
    //     assert.includeDeepMembers([{a:1}, {b:2}, {c:3}], [{c:3}, {b:2}]);
    //     assert.includeDeepMembers([{a:1}, {b:2}, {c:3}], []);
    //     assert.includeDeepMembers([{a:1}, {b:2}, {c:3}], [{c:3}]);
    //     assert.includeDeepMembers([{a:1}, {b:2}, {c:3}, {c:3}], [{c:3}, {c:3}]);
    //     assert.includeDeepMembers([{a:1}, {b:2}, {c:3}], [{c:3}, {c:3}]);

    //     err(function() {
    //         assert.includeDeepMembers([{e:5}, {f:6}], [{g:7}, {h:8}] as any, "blah");
    //     }, "blah: expected [ { e: 5 }, { f: 6 } ] to be a superset of [ { g: 7 }, { h: 8 } ]");

    //     err(function() {
    //         assert.includeDeepMembers([{e:5}, {f:6}], [{e:5}, {f:6}, {z:0}]);
    //     }, "expected [ { e: 5 }, { f: 6 } ] to be a superset of [ { e: 5 }, { f: 6 }, { z: +0 } ]");
    // });

    // it("notIncludeDeepMembers", function() {
    //     assert.notIncludeDeepMembers([{a:1}, {b:2}, {c:3}], [{b:2}, {f:5}] as any);

    //     err(function() {
    //         assert.notIncludeDeepMembers([{a:1}, {b:2}, {c:3}], [{b:2}, {a:1}], "blah");
    //     }, "blah: not expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to be a superset of [ { b: 2 }, { a: 1 } ]");
    // });

    // it("includeOrderedMembers", function() {
    //     assert.includeOrderedMembers([1, 2, 3], [1, 2]);

    //     err(function() {
    //         assert.includeOrderedMembers([1, 2, 3], [2, 1], "blah");
    //     }, "blah: expected [ 1, 2, 3 ] to be an ordered superset of [ 2, 1 ]");
    // });

    // it("notIncludeOrderedMembers", function() {
    //     assert.notIncludeOrderedMembers([1, 2, 3], [2, 1]);
    //     assert.notIncludeOrderedMembers([1, 2, 3], [2, 3]);
    //     assert.notIncludeOrderedMembers([1, 2, 3], [1, 2, 2]);

    //     err(function() {
    //         assert.notIncludeOrderedMembers([1, 2, 3], [1, 2], "blah");
    //     }, "blah: not expected [ 1, 2, 3 ] to be an ordered superset of [ 1, 2 ]");
    // });

    // it("includeDeepOrderedMembers", function() {
    //     assert.includeDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}]);

    //     err(function() {
    //         assert.includeDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{b: 2}, {a: 1}], "blah");
    //     }, "blah: expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to be an ordered superset of [ { b: 2 }, { a: 1 } ]");
    // });

    // it("notIncludeDeepOrderedMembers", function() {
    //     assert.notIncludeDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{b: 2}, {a: 1}]);
    //     assert.notIncludeDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {f: 5}] as any);
    //     assert.notIncludeDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}, {b: 2}]);

    //     err(function() {
    //         assert.notIncludeDeepOrderedMembers([{a: 1}, {b: 2}, {c: 3}], [{a: 1}, {b: 2}], "blah");
    //     }, "blah: not expected [ { a: 1 }, { b: 2 }, { c: 3 } ] to be an ordered superset of [ { a: 1 }, { b: 2 } ]");
    // });

    // it("oneOf", function() {
    //     assert.oneOf(1, [1, 2, 3]);

    //     var three = [3];
    //     assert.oneOf(three, [1, 2, three]);

    //     var four = { four: 4 };
    //     assert.oneOf(four, [1, 2, four]);

    //     err(function() {
    //         assert.oneOf(1, 1 as any, "blah");
    //     }, "blah: expected 1 to be an array");

    //     err(function() {
    //         assert.oneOf(1, { a: 1 } as any);
    //     }, "expected { a: 1 } to be an array");

    //     err(function() {
    //         assert.oneOf(9, [1, 2, 3], "Message");
    //     }, "Message: expected 9 to be one of [ 1, 2, 3 ]");

    //     err(function() {
    //         assert.oneOf([3], [1, 2, [3]]);
    //     }, "expected [ 3 ] to be one of [ 1, 2, [ 3 ] ]");

    //     err(function() {
    //         assert.oneOf({ four: 4 }, [1, 2, { four: 4 }]);
    //     }, "expected { four: 4 } to be one of [ 1, 2, { four: 4 } ]");
    // });

    // it("above", function() {
    //     assert.isAbove(5, 2, "5 should be above 2");

    //     err(function() {
    //         assert.isAbove(1, 3, "blah");
    //     }, "blah: expected 1 to be above 3");

    //     err(function() {
    //         assert.isAbove(1, 1);
    //     }, "expected 1 to be above 1");

    //     err(function() {
    //         assert.isAbove(null as any, 1, "blah");
    //     }, "blah: expected null to be a number or a date");

    //     err(function() {
    //         assert.isAbove(1, null as any, "blah");
    //     }, "blah: the argument to above must be a number");
    // });

    // it("above (dates)", function() {
    //     var now = new Date();
    //     var oneSecondAgo = new Date(now.getTime() - 1000);
    //     assert.isAbove(now, oneSecondAgo, "Now should be above 1 second ago");

    //     err(function() {
    //         assert.isAbove(oneSecondAgo, now, "blah");
    //     }, "blah: expected " + oneSecondAgo.toISOString() + " to be above " + now.toISOString());

    //     err(function() {
    //         assert.isAbove(now, now, "blah");
    //     }, "blah: expected " + now.toISOString() + " to be above " + now.toISOString());

    //     err(function() {
    //         assert.isAbove(null as any, now);
    //     }, "expected null to be a number or a date");

    //     err(function() {
    //         assert.isAbove(now, null as any, "blah");
    //     }, "blah: the argument to above must be a date");

    //     err(function() {
    //         assert.isAbove(now, 1 as any, "blah");
    //     }, "blah: the argument to above must be a date");

    //     err(function() {
    //         assert.isAbove(1, now as any, "blah");
    //     }, "blah: the argument to above must be a number");
    // });

    // it("atLeast", function() {
    //     assert.isAtLeast(5, 2, "5 should be above 2");
    //     assert.isAtLeast(1, 1, "1 should be equal to 1");

    //     err(function() {
    //         assert.isAtLeast(1, 3, "blah");
    //     }, "blah: expected 1 to be at least 3");

    //     err(function() {
    //         assert.isAtLeast(null as any, 1, "blah");
    //     }, "blah: expected null to be a number or a date");

    //     err(function() {
    //         assert.isAtLeast(1, null as any, "blah");
    //     }, "blah: the argument to least must be a number");
    // });

    // it("atLeast (dates)", function() {
    //     var now = new Date();
    //     var oneSecondAgo = new Date(now.getTime() - 1000);
    //     var oneSecondAfter = new Date(now.getTime() + 1000);

    //     assert.isAtLeast(now, oneSecondAgo, "Now should be above one second ago");
    //     assert.isAtLeast(now, now, "Now should be equal to now");

    //     err(function() {
    //         assert.isAtLeast(now, oneSecondAfter, "blah");
    //     }, "blah: expected " + now.toISOString() + " to be at least " + oneSecondAfter.toISOString());

    //     err(function() {
    //         assert.isAtLeast(null as any, now, "blah");
    //     }, "blah: expected null to be a number or a date");

    //     err(function() {
    //         assert.isAtLeast(now, null as any, "blah");
    //     }, "blah: the argument to least must be a date");

    //     err(function() {
    //         assert.isAtLeast(1, now as any, "blah");
    //     }, "blah: the argument to least must be a number");

    //     err(function() {
    //         assert.isAtLeast(now, 1 as any, "blah");
    //     }, "blah: the argument to least must be a date");
    // });

    // it("below", function() {
    //     assert.isBelow(2, 5, "2 should be below 5");

    //     err(function() {
    //         assert.isBelow(3, 1, "blah");
    //     }, "blah: expected 3 to be below 1");

    //     err(function() {
    //         assert.isBelow(1, 1);
    //     }, "expected 1 to be below 1");

    //     err(function() {
    //         assert.isBelow(null as any, 1, "blah");
    //     }, "blah: expected null to be a number or a date");

    //     err(function() {
    //         assert.isBelow(1, null as any, "blah");
    //     }, "blah: the argument to below must be a number");
    // });

    // it("below (dates)", function() {
    //     var now = new Date();
    //     var oneSecondAgo = new Date(now.getTime() - 1000);
    //     assert.isBelow(oneSecondAgo, now, "One second ago should be below now");

    //     err(function() {
    //         assert.isBelow(now, oneSecondAgo, "blah");
    //     }, "blah: expected " + now.toISOString() + " to be below " + oneSecondAgo.toISOString());

    //     err(function() {
    //         assert.isBelow(now, now);
    //     }, "expected " + now.toISOString() + " to be below " + now.toISOString());

    //     err(function() {
    //         assert.isBelow(null as any, now, "blah");
    //     }, "blah: expected null to be a number or a date");

    //     err(function() {
    //         assert.isBelow(now, null as any, "blah");
    //     }, "blah: the argument to below must be a date");

    //     err(function() {
    //         assert.isBelow(now, 1 as any, "blah");
    //     }, "blah: the argument to below must be a date");

    //     err(function() {
    //         assert.isBelow(1, now as any, "blah");
    //     }, "blah: the argument to below must be a number");
    // });

    // it("atMost", function() {
    //     assert.isAtMost(2, 5, "2 should be below 5");
    //     assert.isAtMost(1, 1, "1 should be equal to 1");

    //     err(function() {
    //         assert.isAtMost(3, 1, "blah");
    //     }, "blah: expected 3 to be at most 1");

    //     err(function() {
    //         assert.isAtMost(null as any, 1, "blah");
    //     }, "blah: expected null to be a number or a date");

    //     err(function() {
    //         assert.isAtMost(1, null as any, "blah");
    //     }, "blah: the argument to most must be a number");
    // });

    // it("atMost (dates)", function() {
    //     var now = new Date();
    //     var oneSecondAgo = new Date(now.getTime() - 1000);
    //     var oneSecondAfter = new Date(now.getTime() + 1000);

    //     assert.isAtMost(oneSecondAgo, now, "Now should be below one second ago");
    //     assert.isAtMost(now, now, "Now should be equal to now");

    //     err(function() {
    //         assert.isAtMost(oneSecondAfter, now, "blah");
    //     }, "blah: expected " + oneSecondAfter.toISOString() + " to be at most " + now.toISOString());

    //     err(function() {
    //         assert.isAtMost(null as any, now, "blah");
    //     }, "blah: expected null to be a number or a date");

    //     err(function() {
    //         assert.isAtMost(now, null as any, "blah");
    //     }, "blah: the argument to most must be a date");

    //     err(function() {
    //         assert.isAtMost(now, 1 as any, "blah");
    //     }, "blah: the argument to most must be a date");

    //     err(function() {
    //         assert.isAtMost(1, now as any, "blah");
    //     }, "blah: the argument to most must be a number");
    // });

    it("iterable", function() {
        assert.isIterable([1, 2, 3]);
        assert.isIterable(new Map([[1, "one"], [2, "two"], [3, "three"]]));
        assert.isIterable(new Set([1, 2, 3]));
        assert.isIterable("hello");

        err(function() {
            assert.isIterable(42);
        }, "expected 42 to be an iterable");

        err(function() {
            assert.isIterable(undefined);
        }, "expected undefined to be an iterable");

        err(function() {
            assert.isIterable(null);
        }, "expected null to be an iterable");

        err(function() {
            assert.isIterable(true);
        }, "expected true to be an iterable");

        err(function() {
            assert.isIterable({ key: "value" });
        }, "expected {key:\"value\"} to be an iterable");
    });

    // it("change", function() {
    //     var obj = { value: 10, str: "foo" },
    //         heroes = ["spiderman", "superman"],
    //         fn     = function() {
    //             obj.value += 5
    //         },
    //         fnDec  = function() {
    //             obj.value -= 20
    //         },
    //         getterFn = function() {
    //             return obj.value
    //         },
    //         bangFn = function() {
    //             obj.str += "!"
    //         },
    //         smFn   = function() {
    //             "foo" + "bar"
    //         },
    //         batFn  = function() {
    //             heroes.push("batman")
    //         },
    //         lenFn  = function() {
    //             return heroes.length
    //         };

    //     assert.changes(fn, obj, "value");
    //     assert.changes(fn, getterFn, "changes via getter function");
    //     assert.changesBy(fn, obj, "value", 5);
    //     assert.changesBy(fn, obj, "value", -5);
    //     assert.changesBy(fn, getterFn, 5);
    //     assert.changesBy(fnDec, obj, "value", 20);

    //     assert.doesNotChange(smFn, obj, "value");
    //     assert.doesNotChange(smFn, getterFn, "value");
    //     assert.changesButNotBy(fnDec, obj, "value", 1);
    //     assert.changesButNotBy(fnDec, getterFn, 1);

    //     assert.changes(bangFn, obj, "str");

    //     assert.changesBy(batFn, lenFn, 1);
    //     assert.changesButNotBy(batFn, lenFn, 2);

    //     err(function () {
    //         assert.changes(smFn, obj, "value", "blah");
    //     }, "blah: expected .value to change");

    //     err(function () {
    //         assert.doesNotChange(fn, obj, "value", "blah");
    //     }, "blah: expected .value to not change");

    //     err(function () {
    //         assert.changes({} as any, obj, "value", "blah");
    //     }, "blah: expected {} to be a function");

    //     err(function () {
    //         assert.changes(fn, {}, "badprop", "blah");
    //     }, "blah: expected {} to have property \"badprop\"");

    //     err(function () {
    //         assert.changesBy(fn, obj, "value", 10, "blah");
    //     }, "blah: expected .value to change by 10");

    //     err(function () {
    //         assert.changesButNotBy(fn, obj, "value", 5, "blah");
    //     }, "blah: expected .value to not change by 5");
    // });

    // it("increase, decrease", function() {
    //     var obj = { value: 10, noop: null as any },
    //         arr = ["one", "two"],
    //         pFn   = function() {
    //             arr.push("three")
    //         },
    //         popFn = function() {
    //             arr.pop()
    //         },
    //         lenFn = function() {
    //             return arr.length
    //         },
    //         incFn = function() {
    //             obj.value += 2
    //         },
    //         decFn = function() {
    //             obj.value -= 3
    //         },
    //         getterFn = function() {
    //             return obj.value
    //         },
    //         smFn  = function() {
    //             obj.value += 0
    //         };

    //     assert.decreases(decFn, obj, "value");
    //     assert.decreases(decFn, getterFn, "decreases via getter function");
    //     assert.doesNotDecrease(smFn, obj, "value");
    //     assert.doesNotDecrease(smFn, getterFn, "value");
    //     assert.decreasesBy(decFn, obj, "value", 3);
    //     assert.decreasesBy(decFn, getterFn, 3);
    //     assert.decreasesButNotBy(decFn, obj, "value", 10);
    //     assert.decreasesButNotBy(decFn, getterFn, 10);

    //     assert.increases(incFn, obj, "value");
    //     assert.increases(incFn, getterFn, "increases via getter function");
    //     assert.doesNotIncrease(smFn, obj, "value");
    //     assert.doesNotIncrease(smFn, getterFn, "value");
    //     assert.increasesBy(incFn, obj, "value", 2);
    //     assert.increasesBy(incFn, getterFn, 2);
    //     assert.increasesButNotBy(incFn, obj, "value", 1);
    //     assert.increasesButNotBy(incFn, getterFn, 1);

    //     assert.decreases(popFn, lenFn);
    //     assert.doesNotDecrease(pFn, lenFn);
    //     assert.decreasesBy(popFn, lenFn, 1);
    //     assert.decreasesButNotBy(popFn, lenFn, 2);

    //     assert.increases(pFn, lenFn);
    //     assert.doesNotIncrease(popFn, lenFn);
    //     assert.increasesBy(pFn, lenFn, 1);
    //     assert.increasesButNotBy(pFn, lenFn, 2);

    //     err(function () {
    //         assert.increases(smFn, obj, "value", "blah");
    //     }, "blah: expected .value to increase");

    //     err(function () {
    //         assert.doesNotIncrease(incFn, obj, "value", "blah");
    //     }, "blah: expected .value to not increase");

    //     err(function () {
    //         assert.increases({} as any, obj, "value", "blah");
    //     }, "blah: expected {} to be a function");

    //     err(function () {
    //         assert.increases(incFn, {}, "badprop", "blah");
    //     }, "blah: expected {} to have property \"badprop\"");

    //     err(function() {
    //         assert.increases(incFn, obj, "noop", "blah");
    //     }, "blah: expected null to be a number");

    //     err(function () {
    //         assert.increasesBy(incFn, obj, "value", 10, "blah");
    //     }, "blah: expected .value to increase by 10");

    //     err(function () {
    //         assert.increasesButNotBy(incFn, obj, "value", 2, "blah");
    //     }, "blah: expected .value to not increase by 2");

    //     err(function () {
    //         assert.decreases(smFn, obj, "value", "blah");
    //     }, "blah: expected .value to decrease");

    //     err(function () {
    //         assert.doesNotDecrease(decFn, obj, "value", "blah");
    //     }, "blah: expected .value to not decrease");

    //     err(function () {
    //         assert.decreases({} as any, obj, "value", "blah");
    //     }, "blah: expected {} to be a function");

    //     err(function () {
    //         assert.decreases(decFn, {}, "badprop", "blah");
    //     }, "blah: expected {} to have property \"badprop\"");

    //     err(function() {
    //         assert.decreases(decFn, obj, "noop", "blah");
    //     }, "blah: expected null to be a number");

    //     err(function () {
    //         assert.decreasesBy(decFn, obj, "value", 10, "blah");
    //     }, "blah: expected .value to decrease by 10");

    //     err(function () {
    //         assert.decreasesButNotBy(decFn, obj, "value", 3, "blah");
    //     }, "blah: expected .value to not decrease by 3");
    // });

    it("isExtensible / extensible", function() {
        ["isExtensible", "extensible"].forEach(function (isExtensible) {
            var nonExtensibleObject = Object.preventExtensions({});

            (assert as any)[isExtensible]({});

            err(function() {
                (assert as any)[isExtensible](nonExtensibleObject, "blah");
            }, "blah: expected {} to be extensible");

            // Making sure ES6-like Object.isExtensible response is respected for all primitive types

            err(function() {
                (assert as any)[isExtensible](42);
            }, "expected 42 to be extensible");

            err(function() {
                (assert as any)[isExtensible](null);
            }, "expected null to be extensible");

            err(function() {
                (assert as any)[isExtensible]("foo");
            }, "expected \"foo\" to be extensible");

            err(function() {
                (assert as any)[isExtensible](false);
            }, "expected false to be extensible");

            err(function() {
                (assert as any)[isExtensible](undefined);
            }, "expected undefined to be extensible");

            var proxy = new Proxy({}, {
                isExtensible: function() {
                    throw new TypeError();
                }
            });

            err(function() {
                // isExtensible should not suppress errors, thrown in proxy traps
                (assert as any)[isExtensible](proxy);
            }, { name: "TypeError" }, true);
        });
    });

    it("isNotExtensible / notExtensible", function() {
        ["isNotExtensible", "notExtensible"].forEach(function (isNotExtensible) {
            var nonExtensibleObject = Object.preventExtensions({});

            (assert as any)[isNotExtensible](nonExtensibleObject);

            err(function() {
                (assert as any)[isNotExtensible]({}, "blah");
            }, "blah: not expected {} to be extensible");

            // Making sure ES6-like Object.isExtensible response is respected for all primitive types

            (assert as any)[isNotExtensible](42);
            (assert as any)[isNotExtensible](null);
            (assert as any)[isNotExtensible]("foo");
            (assert as any)[isNotExtensible](false);
            (assert as any)[isNotExtensible](undefined);
            (assert as any)[isNotExtensible](Symbol());

            var proxy = new Proxy({}, {
                isExtensible: function() {
                    throw new TypeError();
                }
            });

            err(function() {
                // isNotExtensible should not suppress errors, thrown in proxy traps
                (assert as any)[isNotExtensible](proxy);
            }, { name: "TypeError" }, true);
        });
    });

    it("isSealed / sealed", function() {
        ["isSealed", "sealed"].forEach(function (isSealed) {
            var sealedObject = Object.seal({});

            (assert as any)[isSealed](sealedObject);

            err(function() {
                (assert as any)[isSealed]({}, "blah");
            }, "blah: expected {} to be sealed");

            // Making sure ES6-like Object.isSealed response is respected for all primitive types

            (assert as any)[isSealed](42);
            (assert as any)[isSealed](null);
            (assert as any)[isSealed]("foo");
            (assert as any)[isSealed](false);
            (assert as any)[isSealed](undefined);
            (assert as any)[isSealed](Symbol());

            var proxy = new Proxy({}, {
                ownKeys: function() {
                    throw new TypeError();
                }
            });

            // Object.isSealed will call ownKeys trap only if object is not extensible
            Object.preventExtensions(proxy);

            err(function() {
                // isSealed should not suppress errors, thrown in proxy traps
                (assert as any)[isSealed](proxy);
            }, { name: "TypeError" }, true);
        });
    });

    it("isNotSealed / notSealed", function() {
        ["isNotSealed", "notSealed"].forEach(function (isNotSealed) {
            var sealedObject = Object.seal({});

            (assert as any)[isNotSealed]({});

            err(function() {
                (assert as any)[isNotSealed](sealedObject, "blah");
            }, "blah: not expected {} to be sealed");

            // Making sure ES6-like Object.isSealed response is respected for all primitive types

            err(function() {
                (assert as any)[isNotSealed](42);
            }, "not expected 42 to be sealed");

            err(function() {
                (assert as any)[isNotSealed](null);
            }, "not expected null to be sealed");

            err(function() {
                (assert as any)[isNotSealed]("foo");
            }, "not expected \"foo\" to be sealed");

            err(function() {
                (assert as any)[isNotSealed](false);
            }, "not expected false to be sealed");

            err(function() {
                (assert as any)[isNotSealed](undefined);
            }, "not expected undefined to be sealed");

            var proxy = new Proxy({}, {
                ownKeys: function() {
                    throw new TypeError();
                }
            });

            // Object.isSealed will call ownKeys trap only if object is not extensible
            Object.preventExtensions(proxy);

            err(function() {
                // isNotSealed should not suppress errors, thrown in proxy traps
                (assert as any)[isNotSealed](proxy);
            }, { name: "TypeError" }, true);
        });
    });

    it("isFrozen / frozen", function() {
        ["isFrozen", "frozen"].forEach(function (isFrozen) {
            var frozenObject = Object.freeze({});

            (assert as any)[isFrozen](frozenObject);

            err(function() {
                (assert as any)[isFrozen]({}, "blah");
            }, "blah: expected {} to be frozen");

            // Making sure ES6-like Object.isFrozen response is respected for all primitive types

            (assert as any)[isFrozen](42);
            (assert as any)[isFrozen](null);
            (assert as any)[isFrozen]("foo");
            (assert as any)[isFrozen](false);
            (assert as any)[isFrozen](undefined);
            (assert as any)[isFrozen](Symbol());

            var proxy = new Proxy({}, {
                ownKeys: function() {
                    throw new TypeError();
                }
            });

            // Object.isFrozen will call ownKeys trap only if object is not extensible
            Object.preventExtensions(proxy);

            err(function() {
                // isFrozen should not suppress errors, thrown in proxy traps
                (assert as any)[isFrozen](proxy);
            }, { name: "TypeError" }, true);
        });
    });

    it("isNotFrozen / notFrozen", function() {
        ["isNotFrozen", "notFrozen"].forEach(function (isNotFrozen) {
            var frozenObject = Object.freeze({});

            (assert as any)[isNotFrozen]({});

            err(function() {
                (assert as any)[isNotFrozen](frozenObject, "blah");
            }, "blah: not expected {} to be frozen", true);

            // Making sure ES6-like Object.isFrozen response is respected for all primitive types

            err(function() {
                (assert as any)[isNotFrozen](42);
            }, "not expected 42 to be frozen");

            err(function() {
                (assert as any)[isNotFrozen](null);
            }, "not expected null to be frozen");

            err(function() {
                (assert as any)[isNotFrozen]("foo");
            }, "not expected \"foo\" to be frozen");

            err(function() {
                (assert as any)[isNotFrozen](false);
            }, "not expected false to be frozen");

            err(function() {
                (assert as any)[isNotFrozen](undefined);
            }, "not expected undefined to be frozen");

            var proxy = new Proxy({}, {
                ownKeys: function() {
                    throw new TypeError();
                }
            });

            // Object.isFrozen will call ownKeys trap only if object is not extensible
            Object.preventExtensions(proxy);

            err(function() {
                // isNotFrozen should not suppress errors, thrown in proxy traps
                (assert as any)[isNotFrozen](proxy);
            }, { name: "TypeError" }, true);
        });
    });

    it("isEmpty / empty", function() {
        ["isEmpty", "empty"].forEach(function (isEmpty) {
            const FakeArgs: any = function (this: any) {}
            FakeArgs.prototype.length = 0;

            (assert as any)[isEmpty]("");
            (assert as any)[isEmpty]([]);
            (assert as any)[isEmpty](new FakeArgs());
            (assert as any)[isEmpty]({});

            // err(function(){
            //     (assert as any)[isEmpty](new WeakMap(), "blah");
            // }, "blah: .empty was passed a weak collection");

            // err(function(){
            //     (assert as any)[isEmpty](new WeakSet(), "blah");
            // }, "blah: .empty was passed a weak collection");

            (assert as any)[isEmpty](new Map());

            var map = new Map() as any;
            map.key = "val";
            (assert as any)[isEmpty](map);
            (assert as any)[isEmpty](new Set());

            var set = new Set() as any;
            set.key = "val";
            (assert as any)[isEmpty](set);

            err(function(){
                (assert as any)[isEmpty]("foo", "blah");
            }, "blah: expected \"foo\" to be empty");

            err(function(){
                (assert as any)[isEmpty](["foo"]);
            }, "expected [\"foo\"] to be empty");

            err(function(){
                (assert as any)[isEmpty]({arguments: 0});
            }, "expected {arguments:0} to be empty");

            err(function(){
                (assert as any)[isEmpty]({foo: "bar"});
            }, "expected {foo:\"bar\"} to be empty");

            err(function(){
                (assert as any)[isEmpty](null, "blah");
            }, "blah: unsupported primitive null");

            err(function(){
                (assert as any)[isEmpty](undefined);
            }, "unsupported primitive undefined");

            err(function(){
                (assert as any)[isEmpty]();
            }, "unsupported primitive undefined");

            err(function(){
                (assert as any)[isEmpty](0);
            }, "unsupported primitive 0");

            err(function(){
                (assert as any)[isEmpty](1);
            }, "unsupported primitive 1");

            err(function(){
                (assert as any)[isEmpty](true);
            }, "unsupported primitive true");

            err(function(){
                (assert as any)[isEmpty](false);
            }, "unsupported primitive false");

            err(function(){
                (assert as any)[isEmpty](Symbol());
            }, "unsupported primitive [Symbol()]");

            err(function(){
                (assert as any)[isEmpty](Symbol.iterator);
            }, "unsupported primitive [Symbol(Symbol.iterator)]");

            err(function(){
                (assert as any)[isEmpty](function() {}, "blah");
            }, "blah: unsupported [Function]");

            if (FakeArgs.name === "FakeArgs") {
                err(function(){
                    (assert as any)[isEmpty](FakeArgs);
                }, "unsupported [Function:FakeArgs]");
            }
        });
    });

    it("isNotEmpty / notEmpty", function() {
        ["isNotEmpty", "notEmpty"].forEach(function (isNotEmpty) {
            class FakeArgs {
                length: number;
                constructor() {}
            }
            FakeArgs.prototype.length = 0;

            (assert as any)[isNotEmpty]("foo");
            (assert as any)[isNotEmpty](["foo"]);
            (assert as any)[isNotEmpty]({arguments: 0});
            (assert as any)[isNotEmpty]({foo: "bar"});

            // err(function(){
            //     (assert as any)[isNotEmpty](new WeakMap(), "blah");
            // }, "blah: .empty was passed a weak collection");

            // err(function(){
            //     (assert as any)[isNotEmpty](new WeakSet(), "blah");
            // }, "blah: .empty was passed a weak collection");

            var map = new Map();
            map.set("a", 1);
            (assert as any)[isNotEmpty](map);

            err(function(){
                (assert as any)[isNotEmpty](new Map());
            }, "not expected [Map:{}] to be empty");

            var set = new Set();
            set.add(1);
            (assert as any)[isNotEmpty](set);

            err(function(){
                (assert as any)[isNotEmpty](new Set());
            }, "not expected [Set:{}] to be empty");

            err(function(){
                (assert as any)[isNotEmpty]("", "blah");
            }, "blah: not expected \"\" to be empty");

            err(function(){
                (assert as any)[isNotEmpty]([]);
            }, "not expected [] to be empty");

            err(function(){
                (assert as any)[isNotEmpty]((new FakeArgs()) as any);
            }, "not expected [FakeArgs:{}] to be empty");

            err(function(){
                (assert as any)[isNotEmpty]({});
            }, "not expected {} to be empty");

            err(function(){
                (assert as any)[isNotEmpty](null, "blah");
            }, "blah: unsupported primitive null");

            err(function(){
                (assert as any)[isNotEmpty](undefined);
            }, "unsupported primitive undefined");

            err(function(){
                (assert as any)[isNotEmpty]();
            }, "unsupported primitive undefined");

            err(function(){
                (assert as any)[isNotEmpty](0);
            }, "unsupported primitive 0");

            err(function(){
                (assert as any)[isNotEmpty](1);
            }, "unsupported primitive 1");

            err(function(){
                (assert as any)[isNotEmpty](true);
            }, "unsupported primitive true");

            err(function(){
                (assert as any)[isNotEmpty](false);
            }, "unsupported primitive false");

            err(function(){
                (assert as any)[isNotEmpty](Symbol());
            }, "unsupported primitive [Symbol()]");

            err(function(){
                (assert as any)[isNotEmpty](Symbol.iterator);
            }, "unsupported primitive [Symbol(Symbol.iterator)]");

            err(function(){
                (assert as any)[isNotEmpty](function() {}, "blah");
            }, "blah: unsupported [Function]");

            if (FakeArgs.name === "FakeArgs") {
                err(function(){
                    (assert as any)[isNotEmpty](FakeArgs);
                }, "unsupported [Function:FakeArgs]");
            }
        });
    });

    // it("showDiff true with actual and expected args", function() {
    //     try {
    //         new chai.Assertion().assert(
    //             "one" === "two"
    //             , "expected #{this} to equal #{exp}"
    //             , "expected #{this} to not equal #{act}"
    //             , "one"
    //             , "two"
    //         );
    //     } catch(e) {
    //         assert.isTrue(e.showDiff);
    //     }
    // });

    // it("showDiff false without expected and actual", function() {
    //     try {
    //         new chai.Assertion().assert(
    //             "one" === "two"
    //             , "expected #{this} to equal #{exp}"
    //             , "expected #{this} to not equal #{act}"
    //             , "one"
    //             , "two"
    //             , false
    //         );
    //     } catch(e) {
    //         assert.isFalse(e.showDiff);
    //     }
    // });
});
