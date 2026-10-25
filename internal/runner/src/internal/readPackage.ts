/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import * as fs from "fs";

export function _readPackageName(cwd: string): string {
    try {
        const pkgPath = path.resolve(cwd, "package.json");

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (!fs.existsSync(pkgPath)) {
            return "";
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        return pkg && pkg.name ? String(pkg.name) : "";
    } catch (e) {
        return "";
    }
}

