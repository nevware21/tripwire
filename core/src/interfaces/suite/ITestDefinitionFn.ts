/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2025 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { TestFn } from "../../types/TestFn";

/**
 * Test definition function (it/test)
 * @since 0.2.0
 */
export interface ITestDefinitionFn {
    (description: string, testFunction?: TestFn): void;
    only(description: string, testFunction?: TestFn): void;
    skip(description: string, testFunction?: TestFn): void;
}
