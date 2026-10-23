/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createDefaultCoverageProvider } from "../codecov/provider";

export function _instrumentPayloadForCoverage(payload: any, cwd: string, parsed: any) {
    return createDefaultCoverageProvider(cwd, parsed).instrumentPayload(payload, cwd, parsed);
}

