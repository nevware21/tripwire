/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { useSuite, createSuite, createTestRunner, IListener, ITestSuite } from "@nevware21/tripwire";
import { createPromise, IPromise } from "@nevware21/ts-async";
import { replaceAnsi } from "@nevware21/chromacon";

/**
 * A console-like sink matching every reporter's `options.console`, capturing what would
 * otherwise go to stdout so a test can assert on it. `write` is supplied because the
 * progress/landing/nyan reporters use it for in-place redraws and take a different code path
 * when it is absent.
 */
export interface ICaptureSink {
    logs: string[];
    errors: string[];
    writes: string[];
    log(msg: string): void;
    error(msg: string): void;
    write(msg: string): void;

    /** Everything logged, newline-joined, with ANSI colour codes removed. */
    text(): string;
    /** Everything written to `error`, newline-joined, with ANSI colour codes removed. */
    errorText(): string;
    /** Every logged line, split on embedded newlines, with ANSI colour codes removed. */
    lines(): string[];
}

export function makeSink(): ICaptureSink {
    const sink: ICaptureSink = {
        logs: [],
        errors: [],
        writes: [],
        log(msg: string) {
            sink.logs.push(msg);
        },
        error(msg: string) {
            sink.errors.push(msg);
        },
        write(msg: string) {
            sink.writes.push(msg);
        },
        text() {
            return replaceAnsi(sink.logs.join("\n"), "");
        },
        errorText() {
            return replaceAnsi(sink.errors.join("\n"), "");
        },
        lines() {
            return sink.text().split("\n");
        }
    };

    return sink;
}

/**
 * Builds an isolated suite from `define`, runs it with `listener` attached and resolves with
 * everything the listener printed.
 *
 * Reporters are pure listeners, so driving them from a real run (rather than hand-rolled
 * event objects) is what makes these tests able to catch the class of defect this suite exists
 * for: a reporter's totals disagreeing with the events the runner actually emits.
 */
export function runWithReporter(define: () => void, listener: IListener): IPromise<ICaptureSink>;
export function runWithReporter(define: () => void, listener: IListener, sink: ICaptureSink): IPromise<ICaptureSink>;
export function runWithReporter(define: () => void, listener: IListener, sink?: ICaptureSink): IPromise<ICaptureSink> {
    const captured = sink || makeSink();
    const suite = createSuite();

    useSuite(suite, define);

    return createPromise<ICaptureSink>((resolve, reject) => {
        const runner = createTestRunner(suite);
        runner.addListener(listener);

        runner.run().then(() => {
            resolve(captured);
        }, reject);
    });
}

/**
 * As {@link runWithReporter}, but also returns the runner's own summary so a test can assert
 * that what the reporter printed and what the runner counted agree.
 */
export function runWithReporterAndSummary(define: () => void, listener: IListener, sink: ICaptureSink): IPromise<{ sink: ICaptureSink; summary: any; suite: ITestSuite }> {
    const suite = createSuite();

    useSuite(suite, define);

    return createPromise((resolve, reject) => {
        const runner = createTestRunner(suite);
        runner.addListener(listener);

        runner.run().then(() => {
            resolve({ sink, summary: runner.getResults(), suite });
        }, reject);
    });
}
