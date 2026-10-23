/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "../../../src/assert/assertClass";
import { _childOccurrence, _generateId, _resetIdGenerator } from "../../../src/suite/idGenerator";
import { ITestSuite } from "../../../src/suite/interfaces/ITestSuite";

describe("idGenerator", function () {

    describe("_generateId", function () {

        beforeEach(function () {
            _resetIdGenerator();
        });

        it("should generate a deterministic ID from a description on the first occurrence, and reproduce it after a reset", function () {
            const id1 = _generateId("test description");

            _resetIdGenerator();
            const id2 = _generateId("test description");

            assert.equal(id1, id2, "Same description should produce same ID for the first occurrence of each build pass");
        });

        it("should be a pure function of its inputs: repeating the same call without a reset returns the same ID", function () {
            const id1 = _generateId("test description");
            const id2 = _generateId("test description");
            const id3 = _generateId("test description", undefined, 0);

            assert.equal(id1, id2, "Nothing the generator remembers may change the ID of the same input");
            assert.equal(id1, id3, "An omitted occurrence is occurrence 0");
        });

        it("should produce a different ID for each occurrence index of the same full path", function () {
            const id0 = _generateId("test description", undefined, 0);
            const id1 = _generateId("test description", undefined, 1);
            const id2 = _generateId("test description", undefined, 2);

            assert.notEqual(id0, id1, "Occurrence 1 must not collide with occurrence 0");
            assert.notEqual(id1, id2, "Occurrence 2 must not collide with occurrence 1");
            assert.notEqual(id0, id2, "Occurrence 2 must not collide with occurrence 0");
        });

        it("should not let unrelated calls in between shift the ID of an input", function () {
            const before = _generateId("Utils", "root", 1);

            for (let i = 0; i < 50; i++) {
                _generateId("noise " + i, "root");
                _generateId("Utils", "root", i);
                _generateId("Utils", "other root");
            }

            assert.equal(_generateId("Utils", "root", 1), before, "The ID must depend only on (parent, description, occurrence)");
        });

        it("should assign distinct IDs to same-named suites/tests declared under the same shared parent, eg. across two files", function () {
            // Simulates two unrelated test files both declaring describe("Utils") -> it("should work")
            // under the same process-wide root suite: the second "Utils" is occurrence 1 under the
            // root, and each "should work" is occurrence 0 under its own (distinct) parent.
            const rootId = _generateId("root");
            const fileAUtilsId = _generateId("Utils", rootId, 0);
            const fileATestId = _generateId("should work", fileAUtilsId, 0);

            const fileBUtilsId = _generateId("Utils", rootId, 1);
            const fileBTestId = _generateId("should work", fileBUtilsId, 0);

            assert.notEqual(fileAUtilsId, fileBUtilsId, "Same-named suites under the same parent should get distinct IDs");
            assert.notEqual(fileATestId, fileBTestId, "Same-named tests under distinct (but same-named) suites should get distinct IDs");
        });

        it("should generate different IDs for different descriptions", function () {
            const id1 = _generateId("description 1");
            const id2 = _generateId("description 2");

            assert.notEqual(id1, id2, "Different descriptions should produce different IDs");
        });

        it("should generate different IDs when parent ID is provided", function () {
            const id1 = _generateId("child", "parent1");
            const id2 = _generateId("child", "parent2");

            assert.notEqual(id1, id2, "Same child with different parents should have different IDs");
        });

        it("should generate different IDs for same description with and without parent", function () {
            const id1 = _generateId("test");
            const id2 = _generateId("test", "parent");

            assert.notEqual(id1, id2, "Description with parent should have different ID than without");
        });

        it("should return a hex string", function () {
            const id = _generateId("test");

            assert.match(id, /^[0-9a-f]+$/, "ID should be a hexadecimal string");
        });

        it("should handle empty string description", function () {
            const id = _generateId("");

            assert.ok(id, "Should generate ID for empty string");
            assert.match(id, /^[0-9a-f]+$/, "ID should be a hexadecimal string");
        });

        it("should handle special characters in description", function () {
            const descriptions = [
                "test-with-dashes",
                "test_with_underscores",
                "test.with.dots",
                "test/with/slashes",
                "test with spaces",
                "test@#$%^&*()",
                "test\nwith\nnewlines",
                "test\twith\ttabs"
            ];

            descriptions.forEach(function (desc) {
                const id = _generateId(desc);
                assert.ok(id, `Should generate ID for: ${desc}`);
                assert.match(id, /^[0-9a-f]+$/, `ID should be hex for: ${desc}`);
            });
        });

        it("should handle unicode characters", function () {
            const descriptions = [
                "测试",
                "тест",
                "🎉🎊",
                "café",
                "naïve"
            ];

            descriptions.forEach(function (desc) {
                const id = _generateId(desc);
                assert.ok(id, `Should generate ID for unicode: ${desc}`);
                assert.match(id, /^[0-9a-f]+$/, `ID should be hex for unicode: ${desc}`);
            });
        });

        it("should handle very long descriptions", function () {
            const longDesc = "a".repeat(10000);
            const id = _generateId(longDesc);

            assert.ok(id, "Should generate ID for very long description");
            assert.match(id, /^[0-9a-f]+$/, "ID should be hex for long description");
        });

        it("should produce a consistent result for the same input when regenerated after a reset each time", function () {
            const ids = [];
            for (let i = 0; i < 100; i++) {
                _resetIdGenerator();
                ids.push(_generateId("consistent test"));
            }

            const firstId = ids[0];
            ids.forEach(function (id, index) {
                assert.equal(id, firstId, `ID at index ${index} should match first ID`);
            });
        });

        it("should produce 100 unique IDs for 100 occurrence indices of the same input", function () {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(_generateId("consistent test", undefined, i));
            }

            assert.equal(ids.size, 100, "All 100 occurrences should be unique");
        });

        it("should handle parent IDs that are hex strings", function () {
            const parentId = "abc123def456";
            const id = _generateId("child", parentId);

            assert.ok(id, "Should generate ID with hex parent ID");
            assert.notEqual(id, parentId, "Child ID should differ from parent ID");
        });

        it("should produce different IDs for case-sensitive descriptions", function () {
            const id1 = _generateId("Test");
            const id2 = _generateId("test");
            const id3 = _generateId("TEST");

            assert.notEqual(id1, id2, "Different case should produce different IDs");
            assert.notEqual(id2, id3, "Different case should produce different IDs");
            assert.notEqual(id1, id3, "Different case should produce different IDs");
        });

        it("should handle hierarchical paths correctly", function () {
            // Simulate nested suite structure
            const rootId = _generateId("Root Suite");
            const level1Id = _generateId("Level 1", rootId);
            const level2Id = _generateId("Level 2", level1Id);
            const level3Id = _generateId("Level 3", level2Id);

            // All should be different
            assert.notEqual(rootId, level1Id);
            assert.notEqual(level1Id, level2Id);
            assert.notEqual(level2Id, level3Id);
            assert.notEqual(rootId, level2Id);
            assert.notEqual(rootId, level3Id);
            assert.notEqual(level1Id, level3Id);
        });

        it("should handle same description at different hierarchy levels", function () {
            const root1 = _generateId("Suite");
            const child1 = _generateId("Suite", root1);
            const grandchild1 = _generateId("Suite", child1);

            // All should be unique despite same description
            assert.notEqual(root1, child1);
            assert.notEqual(child1, grandchild1);
            assert.notEqual(root1, grandchild1);
        });

        it("should handle description with only whitespace", function () {
            const id1 = _generateId("   ");
            const id2 = _generateId("\t\t");
            const id3 = _generateId("\n\n");

            // All should produce valid IDs
            assert.ok(id1);
            assert.ok(id2);
            assert.ok(id3);

            // Different whitespace should produce different IDs
            assert.notEqual(id1, id2);
            assert.notEqual(id2, id3);
            assert.notEqual(id1, id3);
        });

        it("should handle numeric descriptions", function () {
            const id1 = _generateId("123");
            const id2 = _generateId("456");
            const id3 = _generateId("123.456");

            assert.ok(id1);
            assert.ok(id2);
            assert.ok(id3);
            assert.notEqual(id1, id2);
            assert.notEqual(id2, id3);
        });

        it("should produce IDs of reasonable length", function () {
            const id = _generateId("test");

            // Hex representation of 32-bit unsigned int should be max 8 characters
            assert.ok(id.length > 0 && id.length <= 8, "ID length should be between 1 and 8 characters");
        });

        it("should handle rapid successive calls", function () {
            const ids = new Set();

            for (let i = 0; i < 1000; i++) {
                const id = _generateId(`test ${i}`);
                ids.add(id);
            }

            // All IDs should be unique
            assert.equal(ids.size, 1000, "All 1000 IDs should be unique");
        });

        it("should produce collision-resistant IDs for similar descriptions", function () {
            const ids = new Set();
            const descriptions = [
                "test",
                "test ",
                " test",
                "test1",
                "test2",
                "test-",
                "test_",
                "testa",
                "testb"
            ];

            descriptions.forEach(function (desc) {
                ids.add(_generateId(desc));
            });

            assert.equal(ids.size, descriptions.length, "All similar descriptions should produce unique IDs");
        });

        it("should reproduce the same IDs for the same tree whether or not a reset happens in between", function () {
            const rootId = _generateId("root");
            const first = [
                _generateId("Utils", rootId, 0),
                _generateId("Utils", rootId, 1),
                _generateId("should work", _generateId("Utils", rootId, 1), 0)
            ];

            const noReset = [
                _generateId("Utils", rootId, 0),
                _generateId("Utils", rootId, 1),
                _generateId("should work", _generateId("Utils", rootId, 1), 0)
            ];

            _resetIdGenerator();

            const afterReset = [
                _generateId("Utils", rootId, 0),
                _generateId("Utils", rootId, 1),
                _generateId("should work", _generateId("Utils", rootId, 1), 0)
            ];

            assert.deepEqual(noReset, first, "Re-deriving the same tree without a reset must give the same IDs");
            assert.deepEqual(afterReset, first, "Re-deriving the same tree after a reset must give the same IDs");
        });

        it("should maintain determinism across multiple build passes when reset between each", function () {
            // This test verifies the hash algorithm produces consistent results for the first
            // occurrence of a given full path in each fresh build pass (ie. after a reset).
            const testCases = [
                { desc: "Calculator", parent: undefined as string | undefined },
                { desc: "Addition", parent: "a1b2c3" },
                { desc: "should add two numbers", parent: "d4e5f6" }
            ];

            const expected = testCases.map(function (testCase) {
                return testCase.parent ? _generateId(testCase.desc, testCase.parent) : _generateId(testCase.desc);
            });

            _resetIdGenerator();

            testCases.forEach(function (testCase, index) {
                const actualId = testCase.parent
                    ? _generateId(testCase.desc, testCase.parent)
                    : _generateId(testCase.desc);

                assert.equal(actualId, expected[index], `ID for "${testCase.desc}" should be deterministic across build passes`);
            });
        });
    });

    describe("_childOccurrence", function () {

        function _suite(description: string, suites: ITestSuite[], tests: Array<{ description: string }>): ITestSuite {
            return {
                id: "x",
                description: description,
                suites: suites,
                tests: tests as any,
                beforeAllHooks: [],
                afterAllHooks: [],
                beforeEachHooks: [],
                afterEachHooks: [],
                only: false,
                skip: false
            } as ITestSuite;
        }

        it("should be 0 for a root", function () {
            assert.equal(_childOccurrence(undefined, "root"), 0);
        });

        it("should be 0 when the parent has no same-named child", function () {
            const parent = _suite("root", [ _suite("A", [], []) ], [ { description: "t" } ]);

            assert.equal(_childOccurrence(parent, "B"), 0);
        });

        it("should count same-named child suites", function () {
            const parent = _suite("root", [ _suite("A", [], []), _suite("B", [], []), _suite("A", [], []) ], []);

            assert.equal(_childOccurrence(parent, "A"), 2);
            assert.equal(_childOccurrence(parent, "B"), 1);
        });

        it("should count suites and tests together, since they share one ID namespace", function () {
            const parent = _suite("root", [ _suite("A", [], []) ], [ { description: "A" }, { description: "A" } ]);

            assert.equal(_childOccurrence(parent, "A"), 3);
        });

        it("should only look at direct children, not descendants", function () {
            const inner = _suite("A", [], [ { description: "A" } ]);
            const parent = _suite("root", [ _suite("outer", [ inner ], []) ], []);

            assert.equal(_childOccurrence(parent, "A"), 0);
        });

        it("should tolerate a parent with no child arrays", function () {
            const parent = { id: "x", description: "root" } as ITestSuite;

            assert.equal(_childOccurrence(parent, "A"), 0);
        });
    });
});
