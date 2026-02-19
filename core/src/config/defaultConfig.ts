/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { objFreeze } from "@nevware21/ts-utils";
import { IConfig } from "../interface/IConfig";
import { cyan } from "@nevware21/chromacon";

/**
 * @internal
 * @ignore
 * The default configuration values.
 * Note: formatters are now managed by the format manager - default formatters are automatically
 * used as fallback internally by the formatting logic.
 *
 * Default finalize is false - when set to true without finalizeFn, uses
 * [escapeAnsi](https://nevware21.github.io/chromacon/typedoc/core/functions/escapeAnsi.html)
 * from [@nevware21/chromacon](https://nevware21.github.io/chromacon/).
 */
export const DEFAULT_CONFIG: Readonly<IConfig> = (/* $__PURE__ */objFreeze({
    isVerbose: false,
    fullStack: false,
    defAssertMsg: "assertion failure",
    defFatalMsg: "fatal assertion failure",
    format: {
        finalize: false,
        finalizeFn: undefined,
        maxProps: 8,
        maxFormatDepth: 50,
        maxProtoDepth: 4
    },
    circularMsg: () => cyan("[<Circular>]"),
    showDiff: true,
    maxCompareDepth: 100,
    maxCompareCheckDepth: 50
}));
