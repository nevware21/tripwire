/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

// export {
//     ITestServer,

//     IDoneFn,
//     IGetSetChainableFn,
//     IHookDefinitionFn,
//     ISuiteContext,
//     ISuiteDefinitionFn,
//     ITestCase,
//     ITestContext,
//     ITestDefinitionFn,

//     ICompileProvider,
//     IModuleGraph,
//     IRunPayload,
//     IRunSettings,
//     ISerializedRegExp,
//     ITestSummary,

//     BrowserLaunchMode,
//     BrowserUiStyle,
//     eListenerEvent,
//     HookFn,
//     ListenerEvent,
//     SuiteFn,
//     TestFn,
//     TestTarget
// } from "@nevware21/tripwire";

export { IFsEntry } from "./ux/interfaces/IFsEntry";
export { BrowserUiStyle } from "./ux/types/BrowserUiStyle";
export { IRunnerUxProvider } from "./interfaces/IRunnerUxProvider";
export { ITripwireModule } from "./interfaces/ITripwireModule";
export { IParsedArgs } from "./interfaces/IParsedArgs";
export {
    CoverageModuleMap,
    CoverageEntry,
    CoverageData,
    ICoverageInstrumenter,
    ICoverageFilter,
    ICoverageReporter,
    ICoverageProvider
} from "./codecov/interfaces";
