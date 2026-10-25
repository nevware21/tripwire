/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { IDoneFn } from "./IDoneFn";
import { ITestContext } from "./ITestContext";

/**
 * Hook function for setup/teardown with execution context as "this"
 */
export type HookFunction = ((this: ITestContext, done?: IDoneFn) => void | IPromise<void>);
