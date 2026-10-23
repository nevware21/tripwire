/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { eListenerAction } from "@nevware21/tripwire";

/**
 * The `--bail` listener, registered identically by all three targets: the node CLI
 * (`execute/execute.ts`), the worker (`client/workerRunner.ts`) and the browser frame
 * (`ux/browser/ui/frame-mode.ts`).
 *
 * It previously existed as three separate copies, and bail was consequently missing from the
 * browser target entirely until it was noticed -- one implementation is what stops that
 * happening again.
 *
 * `eListenerAction` is a `const enum`, so this import is erased at compile time: the emitted
 * code carries the literal `2` with no runtime dependency on the tripwire package, which
 * matters because the browser/worker bundles resolve tripwire from the module registry at
 * run time rather than bundling it.
 */
export function createBailListener(): any {
    return {
        onDone: (_event: any, context: any) => {
            const ctx = context && context.v;

            if (ctx && ctx.test && ctx.end && (ctx.end.status === "failed" || ctx.end.status === "aborted")) {
                return {
                    action: eListenerAction.Abort,
                    reason: "Bail: first test failure"
                };
            }

            /*
             * Deliberately only tests. A failing lifecycle hook does not bail the run: a failed
             * `beforeAll`/`afterAll` stops the suite whose setup/teardown broke, is recorded on
             * the run summary, and the run carries on with the sibling suites -- one suite's
             * fixtures say nothing about the next one's. Promoting hook failures to a run failure
             * is `--fail-on-hook`'s job, and it is a separate switch precisely so that "stop at
             * the first failing test" and "treat a broken hook as a build failure" stay
             * independent of each other.
             */
            return;
        }
    };
}
