/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import { arrForEach } from "@nevware21/ts-utils";
import { _userError } from "../internal/userError";

export function _preloadModules(modules: string[], cwd: string) {
    arrForEach(modules, (mod) => {
        try {
            // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
            require(require.resolve(mod, {
                paths: [cwd]
            }));
        } catch (e: any) {
            const fallbackPath = path.resolve(cwd, mod);
            try {
                // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
                require(fallbackPath);
            } catch (fallbackError: any) {
                const msg = (fallbackError === null || fallbackError === void 0 ? void 0 : fallbackError.stack) || (e === null || e === void 0 ? void 0 : e.stack) || String(fallbackError || e);
                // `msg` is already the preloaded module's own stack; the CLI frames that
                // required it add nothing the user can act on.
                throw _userError("Failed to preload '" + mod + "'\n" + msg, [
                    "--require/--file values are resolved as a module first, then as a path relative to " + cwd.replace(/\\/g, "/") + "."
                ]);
            }
        }
    });
}
