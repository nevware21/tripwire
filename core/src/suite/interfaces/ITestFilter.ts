/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ITestCase } from "../../interfaces/suite/ITestCase";
import { ITestSuite } from "./ITestSuite";

/**
 * Interface for defining test filters to determine which suites and/or tests should be run
 * @since 0.2.0
 */
export interface ITestFilter {
    canRunSuite?: (suite: ITestSuite) => boolean;

    canRunTest?: (test: ITestCase, parent?: ITestSuite) => boolean;
}

