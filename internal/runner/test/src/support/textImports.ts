/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import { createRequire } from "module";

/**
 * Lets the runner's browser UX load from source under node, the way its bundle does. The UX imports its
 * html and css templates and its icon as modules, which the rollup build inlines as strings (the
 * inlineText and inlineBinary plugins in rollup.config.js). Importing this module before anything that
 * reaches the UX gives node the same loaders, so a test can import the browser runner, and everything
 * that imports it, straight from src.
 */
const _extensions: any = (createRequire(__filename) as any).extensions;

function _register(ext: string, read: (filename: string) => string): void {
    if (!_extensions[ext]) {
        _extensions[ext] = (module: any, filename: string) => {
            module.exports = read(filename);
        };
    }
}

_register(".html", (filename) => fs.readFileSync(filename, "utf8"));
_register(".css", (filename) => fs.readFileSync(filename, "utf8"));
_register(".ico", (filename) => fs.readFileSync(filename).toString("base64"));
