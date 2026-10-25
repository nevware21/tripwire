/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/*
 * Allows TypeScript to resolve static .html and .css imports.
 * These are transformed to inlined string constants by the Rollup inlineText plugin at build time.
 */
declare module "*.html" {
    const content: string;
    export default content;
}

declare module "*.css" {
    const content: string;
    export default content;
}

declare module "*.ico" {
    const content: string;
    export default content;
}
