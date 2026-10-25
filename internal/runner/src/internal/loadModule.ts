/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { _userError } from "./userError";

let _modules: Record<string, any> = {};

/**
 * Requires (and caches) a user-supplied module -- the single seam behind every pluggable
 * concern the CLI can point at a module: `--ux-provider`, `--compile-provider` and
 * `--reporter <module>`.
 *
 * @param providerName - The module specifier, resolved from `cwd` (so a relative path in a
 * config file means what the person who wrote it meant) then from the runner's own directory.
 * @param useCache - Whether a previously loaded module may be returned as-is.
 * @param what - What the module is, in the failure message ("UX provider", "reporter", ...).
 * Defaults to the original caller so the message stays exactly as it was for `--ux-provider`.
 * @param flag - The CLI flag being reported on, named in the resolution hint.
 * @since 0.2.0 (`what`/`flag`)
 */
export function _loadModule<T>(providerName: string, useCache: boolean = true, what: string = "UX provider", flag: string = "--ux-provider"): T {
    if (providerName && (!_modules[providerName] || !useCache)) {
        let resolved = "";
        let loaded: any = null;

        try {
            resolved = require.resolve(providerName, {

                paths: [process.cwd(), __dirname]
            });

            // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
            loaded = require(resolved);
        } catch (e: any) {
            throw _userError("Unable to load " + what + " module '" + providerName + "'. " + (e && e.message ? e.message : String(e)), [
                flag + " takes a module name or path resolvable from " + process.cwd().replace(/\\/g, "/") + "."
            ]);
        }

        const provider = loaded && loaded.default ? loaded.default : loaded;
        if (provider) {
            _modules[providerName] = provider as T;
        }
    }

    return _modules[providerName] as T;
}

