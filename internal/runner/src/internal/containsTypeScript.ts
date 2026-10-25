/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach } from "@nevware21/ts-utils";

export function _containsTypeScript(files: string[]): boolean {
    let found = false;

    arrForEach(files, (file) => {
        if (/\.tsx?$/i.test(file)) {
            found = true;
            return -1; // break
        }
    });

    return found;
}
