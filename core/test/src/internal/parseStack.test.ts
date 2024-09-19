/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { dumpObj } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { parseStack } from "../../../src/internal/parseStack";
import { expect } from "../../../src/assert/expect";

describe("stackParser", function () {
    it("should parse stack", function () {
        const stack = new Error().stack;
        const parsed = parseStack(stack);

        assert.strictEqual(parsed.stack, stack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);
    });

    it("should parse stack from string", function () {
        const sampleStack = "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
        "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
        "    at processImmediate (node:internal/timers:478:21)\n";
        const parsed = parseStack(sampleStack);

        assert.strictEqual(parsed.stack, sampleStack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        assert.equal(parsed.lines.length, 14, dumpObj(parsed.lines));
        assert.equal(parsed.message, "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`");
        assert.equal(parsed.lines[0], "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)");
        assert.equal(parsed.lines[1], "    at assert (./core/src/assert/assertClass.ts:120:19)");
    });

    it("should parse stack from string with an at contained in the messate", function () {
        const sampleStack = "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend` at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
        "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
        "    at processImmediate (node:internal/timers:478:21)\n";
        const parsed = parseStack(sampleStack);

        assert.strictEqual(parsed.stack, sampleStack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        assert.equal(parsed.lines.length, 13, dumpObj(parsed.lines));
        assert.equal(parsed.message, "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend` at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)");
        assert.equal(parsed.lines[0], "    at assert (./core/src/assert/assertClass.ts:120:19)");
    });

    it("should parse stack with limited lines", function () {
        const sampleStack = "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
        "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
        "    at processImmediate (node:internal/timers:478:21)\n";
        const parsed = parseStack(sampleStack);

        assert.strictEqual(parsed.stack, sampleStack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        assert.equal(parsed.lines.length, 14, dumpObj(parsed.lines));
        assert.equal(parsed.message, "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`");
        assert.equal(parsed.lines[0], "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)");
        assert.equal(parsed.lines[1], "    at assert (./core/src/assert/assertClass.ts:120:19)");
        expect(parsed.formatStack(5)).equals("expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
            "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
            "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
            "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
            "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
            "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)");
    });

    it("should parse stack with a multiple lines in the message", function () {
        const sampleStack = "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    actual: darkness\n" +
        "    expected: friend\n" +
        "\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
        "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
        "    at processImmediate (node:internal/timers:478:21)\n";
        const parsed = parseStack(sampleStack);

        assert.strictEqual(parsed.stack, sampleStack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        assert.equal(parsed.lines.length, 14, dumpObj(parsed.lines));
        assert.equal(parsed.message, "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
            "    actual: darkness\n" +
            "    expected: friend\n");
        assert.equal(parsed.lines[0], "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)");
        assert.equal(parsed.lines[1], "    at assert (./core/src/assert/assertClass.ts:120:19)");
    });

    it("formatting a parsed stack should result in the original stack", function () {
        const stack = new Error().stack;
        const parsed = parseStack(stack);

        assert.strictEqual(parsed.stack, stack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        const formatted = parsed.formatStack();
        assert.equal(formatted, stack);
    });

    it("formatting a parsed stack with a limit should result in the original stack with the limit", function () {
        const stack = new Error().stack;
        const parsed = parseStack(stack);

        assert.strictEqual(parsed.stack, stack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        const formatted = parsed.formatStack(5);
        const lines = stack.split("\n");
        assert.equal(formatted, lines.slice(0, 6).join("\n"));
    });

    it("formatting a parsed stack with multiple lines in the message should result in the original stack", function () {
        const sampleStack = "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    actual: darkness\n" +
        "    expected: friend\n" +
        "\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
        "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
        "    at processImmediate (node:internal/timers:478:21)\n";
        const parsed = parseStack(sampleStack);

        assert.strictEqual(parsed.stack, sampleStack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        assert(parsed.formatStack(), sampleStack);
    });

    it("formatting a parsed stack with multiple lines in the message should result in the original stack with the limit", function () {
        const sampleStack = "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    actual: darkness\n" +
        "    expected: friend\n" +
        "\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
        "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
        "    at processImmediate (node:internal/timers:478:21)\n";
        const parsed = parseStack(sampleStack);

        assert.strictEqual(parsed.stack, sampleStack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        const formatted = parsed.formatStack(5);
        const lines = sampleStack.split("\n");
        assert.equal(formatted, lines.slice(0, 9).join("\n"));
    });

    it("parsing a stack with no stack should return undefined", function () {
        const parsed = parseStack(undefined);

        assert.strictEqual(parsed.stack, undefined);
        assert.isNotNull(parsed);
        assert.isEmpty(parsed.message);
        assert.isEmpty(parsed.trailMessage);
        assert.isArray(parsed.lines);
        assert.equal(parsed.lines.length, 0);
        assert.equal(parsed.formatStack(), "");
    });

    it("parsing a stack with no stack should return null", function () {
        const parsed = parseStack(null as any);

        assert.strictEqual(parsed.stack, null);
        assert.isNotNull(parsed);
        assert.isEmpty(parsed.message);
        assert.isEmpty(parsed.trailMessage);
        assert.isArray(parsed.lines);
        assert.equal(parsed.lines.length, 0);
        assert.equal(parsed.formatStack(), "");
    });

    it("parsing a stack with no stack should return an empty string", function () {
        const parsed = parseStack("");

        assert.strictEqual(parsed.stack, "");
        assert.isNotNull(parsed);
        assert.isEmpty(parsed.message);
        assert.isEmpty(parsed.trailMessage);
        assert.isArray(parsed.lines);
        assert.equal(parsed.lines.length, 0);
        assert.equal(parsed.formatStack(), "");
    });

    it("parsing a stack with no stack should return an whitespace string", function () {
        const parsed = parseStack("    ");

        assert.strictEqual(parsed.stack, "    ");
        assert.isNotNull(parsed);
        assert.equal(parsed.message, "    ");
        assert.isEmpty(parsed.trailMessage);
        assert.isArray(parsed.lines);
        assert.equal(parsed.lines.length, 0);
        assert.equal(parsed.formatStack(), "    ");
    });

    it("parsing a stack with trailing message should return the message", function () {
        const sampleStack = "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    actual: darkness\n" +
        "    expected: friend\n" +
        "\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
        "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
        "    at processImmediate (node:internal/timers:478:21)\n" +
        "\n" +
        "This is a trailing message";

        const parsed = parseStack(sampleStack);
        assert.strictEqual(parsed.stack, sampleStack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        assert.equal(parsed.lines.length, 14, dumpObj(parsed.lines));
        assert.equal(parsed.message, "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    actual: darkness\n" +
        "    expected: friend\n");
        assert.equal(parsed.lines[0], "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)");
        assert.equal(parsed.lines[1], "    at assert (./core/src/assert/assertClass.ts:120:19)");
        assert.equal(parsed.trailMessage, "\nThis is a trailing message");
        expect(parsed.formatStack(5)).equals("expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
            "    actual: darkness\n" +
            "    expected: friend\n" +
            "\n" +
            "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
            "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
            "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
            "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
            "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
            "\n" +
            "This is a trailing message");

        // Check the full stack with all parsed lines
        expect(parsed.formatStack(99)).equals(sampleStack);
    });

    it("validate trimming of stack", function () {
        const sampleStack = "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    actual: darkness\n" +
        "    expected: friend\n" +
        "\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
        "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
        "    at processImmediate (node:internal/timers:478:21)\n" +
        "\n" +
        "This is a trailing message";

        const parsed = parseStack(sampleStack);
        assert.strictEqual(parsed.stack, sampleStack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        assert.equal(parsed.lines.length, 14, dumpObj(parsed.lines));
        assert.equal(parsed.message, "expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    actual: darkness\n" +
        "    expected: friend\n");
        assert.equal(parsed.lines[0], "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)");
        assert.equal(parsed.lines[1], "    at assert (./core/src/assert/assertClass.ts:120:19)");
        assert.equal(parsed.trailMessage, "\nThis is a trailing message");

        parsed.trimStack("assert");

        expect(parsed.formatStack(5)).equals("expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
            "    actual: darkness\n" +
            "    expected: friend\n" +
            "\n" +
            "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
            "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
            "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
            "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
            "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
            "\n" +
            "This is a trailing message");

        parsed.trimStack("checkError");

        expect(parsed.formatStack(5)).equals("expected error stack to not contain internal frames - \"AssertionFailure: expected hello to equal `friend`\n" +
            "    actual: darkness\n" +
            "    expected: friend\n" +
            "\n" +
            "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
            "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
            "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
            "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
            "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
                "\n" +
            "This is a trailing message");
    });

    it("validate removing inner stack", function () {
        const sampleStack = "sample with Inner Exception - \"AssertionFailure: expected hello to equal `friend`\n" +
        "    actual: darkness\n" +
        "    expected: friend\n" +
        "\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
        "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
        "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
        "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
        "    at processImmediate (node:internal/timers:478:21)\n" +
        "\n" +
        "Inner Exception\n" +
        "    at InnerContext.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at InnerAssert (./core/src/assert/assertClass.ts:120:19)\n" +
        "    at InnerEx./core/test/src/assert/assert.test.ts:52:23\n" +
        "    at InnerCheckError (./core/test/src/support/checkError.ts:57:9)\n" +
        "    at InnerContext.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
        "    at InnerCallFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
        "    at InnerTest.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
        "\n";

        const parsed = parseStack(sampleStack);
        assert.strictEqual(parsed.stack, sampleStack);
        assert.isNotNull(parsed);
        assert.isNotNull(parsed.message);
        assert.isNotNull(parsed.trailMessage);
        assert.isArray(parsed.lines);

        assert.equal(parsed.lines.length, 14, dumpObj(parsed.lines));
        assert.equal(parsed.formatStack(99), sampleStack);
        assert.equal(parsed.removeInnerStack().formatStack(99),
            "sample with Inner Exception - \"AssertionFailure: expected hello to equal `friend`\n" +
            "    actual: darkness\n" +
            "    expected: friend\n" +
            "\n" +
            "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
            "    at assert (./core/src/assert/assertClass.ts:120:19)\n" +
            "    at ./core/test/src/assert/assert.test.ts:52:23\n" +
            "    at checkError (./core/test/src/support/checkError.ts:57:9)\n" +
            "    at Context.<anonymous> (./core/test/src/assert/assert.test.ts:51:23)\n" +
            "    at callFn (./common/temp/node_modules/mocha/lib/runnable.js:364:21)\n" +
            "    at Test.Runnable.run (./common/temp/node_modules/mocha/lib/runnable.js:352:5)\n" +
            "    at Runner.runTest (./common/temp/node_modules/mocha/lib/runner.js:677:10)\n" +
            "    at ./common/temp/node_modules/mocha/lib/runner.js:800:12\n" +
            "    at next (./common/temp/node_modules/mocha/lib/runner.js:592:14)\n" +
            "    at ./common/temp/node_modules/mocha/lib/runner.js:602:7\n" +
            "    at next (./common/temp/node_modules/mocha/lib/runner.js:485:14)\n" +
            "    at Immediate._onImmediate (./common/temp/node_modules/mocha/lib/runner.js:570:5)\n" +
            "    at processImmediate (node:internal/timers:478:21)");
    });
});