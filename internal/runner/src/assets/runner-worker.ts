/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

// Rollup entry point for the worker asset bundle (dist/bin/assets/runner-worker.js) -- it starts
// the runner and exports nothing; consumers import the types it uses from their own modules.
import { startWorkerRunner } from "../client/workerRunner";

startWorkerRunner();
