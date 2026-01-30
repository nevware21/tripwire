/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024-2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IConfigInst } from "../interface/IConfigInst";
import { _createConfig } from "./config";
import { DEFAULT_CONFIG } from "./defaultConfig";

export const assertConfig: IConfigInst = (/* #__PURE__*/function() {
    return _createConfig(() => DEFAULT_CONFIG);
})();
