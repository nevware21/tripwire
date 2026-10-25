/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { _getAssetFile } from "./assets";

export function _loadRunnerWorkerScript(_cwd: string, _includeSourceMap: boolean): string {
    const workerAsset = _getAssetFile("runner-worker.js", false);
    if (!workerAsset) {
        throw new Error("Missing runner worker asset: runner-worker.js");
    }

    const sourceWithoutMapRef = workerAsset.content.toString("utf8").replace(/\n?\/\/# sourceMappingURL=[^\r\n]+/g, "");
    if (!_includeSourceMap) {
        return sourceWithoutMapRef;
    }

    return sourceWithoutMapRef + "\n//# sourceMappingURL=/__tripwire__/runner-worker.js.map";
}

