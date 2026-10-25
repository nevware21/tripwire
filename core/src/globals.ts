/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ISuiteDefinitionFn } from "./interfaces/suite/ISuiteDefinitionFn";
import { ITestDefinitionFn } from "./interfaces/suite/ITestDefinitionFn";
import { IHookDefinitionFn } from "./interfaces/suite/IHookDefinitionFn";
import { IAssertClass } from "./assert/interface/IAssertClass";
import { IAssertInst } from "./assert/interface/IAssertInst";
import { IConfig } from "./interfaces/IConfig";
import { MsgSource } from "./types/MsgSource";

/**
 * Shape of the globals a tripwire test runner (see `_installGlobalApi` in
 * `@nevware21/tripwire-runner`) installs onto `global` before running a suite. Declared once
 * here so index.ts's global augmentation and any other code needing the same shape (eg.
 * `_installGlobalApi` itself) can reference a single, always-in-sync source of truth instead
 * of repeating the field list.
 * @since 0.2.0
 */
export interface TripwireGlobals {
    describe: ISuiteDefinitionFn;
    suite: ISuiteDefinitionFn;
    xdescribe: ISuiteDefinitionFn;
    fdescribe: ISuiteDefinitionFn;

    it: ITestDefinitionFn;
    spec: ITestDefinitionFn;
    test: ITestDefinitionFn;
    xit: ITestDefinitionFn;
    fit: ITestDefinitionFn;

    before: IHookDefinitionFn;
    beforeAll: IHookDefinitionFn;
    beforeEach: IHookDefinitionFn;
    after: IHookDefinitionFn;
    afterAll: IHookDefinitionFn;
    afterEach: IHookDefinitionFn;

    assert: IAssertClass;
    expect: <T>(value: T, initMsg?: MsgSource, config?: IConfig) => IAssertInst;
}
