/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

export function _getRunnerUiUrl(baseUrl: string, target: "browser" | "worker", autoFinish?: boolean): string {
    const normalizedBase = (baseUrl || "").replace(/\/+$/, "");
    const suffix = autoFinish ? "?autofinish=1" : "";
    return normalizedBase + "/__tripwire__/" + target + suffix;
}

