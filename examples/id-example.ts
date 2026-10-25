/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Example demonstrating deterministic test and suite IDs
 * This example shows how tripwire generates unique, deterministic IDs
 * for test suites and test cases similar to QUnit
 */

import { it, describe, getRootSuite, resetSuite } from "@nevware21/tripwire";

// Reset suite state before defining tests
resetSuite();

// Example test suite with nested structure
describe("Calculator", () => {
    describe("Addition", () => {
        it("should add two positive numbers", () => {
            // Test implementation
        });

        it("should add negative numbers", () => {
            // Test implementation
        });
    });

    describe("Subtraction", () => {
        it("should subtract two numbers", () => {
            // Test implementation
        });
    });
});

// Print the IDs for demonstration
const rootSuite = getRootSuite();

function printSuiteStructure(suite: any, indent = "") {
    console.log(`${indent}Suite: "${suite.description}" (ID: ${suite.id})`);

    suite.tests.forEach((test: any) => {
        console.log(`${indent}  Test: "${test.description}" (ID: ${test.id})`);
    });

    suite.suites.forEach((childSuite: any) => {
        printSuiteStructure(childSuite, indent + "  ");
    });
}

console.log("\nTest Suite Structure with Deterministic IDs:");
console.log("=" .repeat(50));
printSuiteStructure(rootSuite);
console.log("=" .repeat(50));
console.log("\nKey Features:");
console.log("- IDs are deterministic: same test structure = same IDs");
console.log("- IDs are unique: different tests/suites have different IDs");
console.log("- IDs are hierarchical: based on full path from root");
console.log("- IDs are in hex format for readability");
