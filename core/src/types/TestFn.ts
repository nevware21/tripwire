/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { IDoneFn } from "../interfaces/suite/IDoneFn";
import { ITestContext } from "../interfaces/suite/ITestContext";

/**
 * Test function that can be either:
 * - Synchronous or promise-based: (this: ITestContext) => void | IPromise<void>
 * - Callback-based with done: (this: ITestContext, done: IDoneFn) => void
 * @since 0.2.0
 */
export type TestFn = ((this: ITestContext) => void | IPromise<void>) | ((this: ITestContext, done: IDoneFn) => void);