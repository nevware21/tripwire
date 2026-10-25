/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { ISuiteContext } from "../interfaces/suite/ISuiteContext";

/**
 * Suite callback function with execution context as "this"
 * @since 0.2.0
 */
export type SuiteFn = ((this: ISuiteContext) => void | IPromise<void>);
