/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { ITestContext } from "../interfaces/suite/ITestContext";
import { IDoneFn } from "../interfaces/suite/IDoneFn";

/**
 * Hook function for setup/teardown with execution context as "this"
 * @since 0.2.0
 */
export type HookFn = ((this: ITestContext) => void | IPromise<void>) | ((this: ITestContext, done: IDoneFn) => void);
