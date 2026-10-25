/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IPromise } from "@nevware21/ts-async";
import { SuiteFn } from "../../types/SuiteFn";

/**
 * Suite definition function (describe/suite)
 * @since 0.2.0
 */
export interface ISuiteDefinitionFn {
    (description: string, specDefinitions: SuiteFn): void | IPromise<void>;
    only(description: string, specDefinitions: SuiteFn): void | IPromise<void>;
    skip(description: string, specDefinitions: SuiteFn): void | IPromise<void>;
}
