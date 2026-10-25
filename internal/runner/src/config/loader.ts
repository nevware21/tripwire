/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ITripwireConfig } from "../interfaces/ITripwireConfig";
import { ILoadedConfig } from "../interfaces/ILoadedConfig";
import { IConfigLoader } from "../interfaces/IConfigLoader";
import { _userError } from "../internal/userError";

/*
 * ---------------------------------------------------------------------------
 * Config file names searched in each directory (in priority order; later
 * entries in this array win when multiple are present in the same directory).
 * ---------------------------------------------------------------------------
 */
const CONFIG_FILE_NAMES = [
    ".tripwirerc",
    ".tripwirerc.json",
    ".tripwirerc.js",
    ".tripwirerc.cjs",
    "tripwire.config.json",
    "tripwire.config.js",
    "tripwire.config.cjs"
];

/*
 * ---------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------
 */

/**
 * Strips JSONC-style `// ...` and `/* ... *\/` comments from a JSON string
 * so that config files can include explanatory comments.
 *
 * NOTE: This is intentionally simple — it does not handle every edge case
 * (e.g. `//` inside a string value).  For full JSONC support users should
 * use a `.js` config file instead.
 */
function _stripJsonComments(text: string): string {
    // Remove block comments  /* ... */
    let result = text.replace(/\/\*[\s\S]*?\*\//g, (match) => {
        // Preserve newlines so line numbers stay accurate for error messages
        return match.replace(/[^\n]/g, " ");
    });

    // Remove line comments // ...  (but not inside strings — basic heuristic)
    result = result.replace(/\/\/[^\n]*/g, "");

    return result;
}

function _tryReadJson(filePath: string): ITripwireConfig | null {
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const text = fs.readFileSync(filePath, "utf8");
        return JSON.parse(_stripJsonComments(text)) as ITripwireConfig;
    } catch (e: any) {
        throw _userError(
            "Failed to parse tripwire config file '" + filePath + "': " +
            (e && e.message ? e.message : String(e))
        );
    }
}

function _tryRequireJs(filePath: string): ITripwireConfig | null {
    try {
        // eslint-disable-next-line security/detect-non-literal-require, @typescript-eslint/no-var-requires
        const loaded = require(filePath);
        return (loaded && loaded.default ? loaded.default : loaded) as ITripwireConfig;
    } catch (e: any) {
        throw _userError(
            "Failed to load tripwire config file '" + filePath + "': " +
            (e && e.message ? e.message : String(e))
        );
    }
}

function _loadFile(filePath: string): ITripwireConfig | null {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!fs.existsSync(filePath)) {
        return null;
    }

    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".json" || ext === "" /* .tripwirerc */) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const text = fs.readFileSync(filePath, "utf8").trimStart();
        // If the file starts with `{` treat it as JSON; otherwise try require().
        if (text.charAt(0) === "{" || text.charAt(0) === "[") {
            return _tryReadJson(filePath);
        }
        // Fall through to require() for RC files written as JS
    }

    return _tryRequireJs(filePath);
}

/**
 * Walk from `dir` to filesystem root and collect config files.
 * Returns an array of `{ dir, filePath, priority }` sorted so that files
 * further from cwd come first (lowest priority).
 */
function _collectFromTree(dir: string): ILoadedConfig[] {
    const collected: ILoadedConfig[] = [];
    let current = path.resolve(dir);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        /*
         * Search all candidate file names; if multiple exist in the same dir,
         * the last one in CONFIG_FILE_NAMES (highest-priority name) wins.
         */
        let best: { filePath: string; config: ITripwireConfig } | null = null;
        for (let ni = 0; ni < CONFIG_FILE_NAMES.length; ni++) {
            const candidate = path.join(current, CONFIG_FILE_NAMES[ni]);
            const loaded = _loadFile(candidate);
            if (loaded !== null) {
                best = { filePath: candidate, config: loaded };
                // Don't break — keep scanning so later (higher-priority) names win
            }
        }

        if (best) {
            collected.unshift({ filePath: best.filePath, config: best.config });
        }

        const parent = path.dirname(current);
        if (parent === current) {
            // Reached filesystem root
            break;
        }
        current = parent;
    }

    return collected;
}

function _collectFromHome(): ILoadedConfig[] {
    const home = os.homedir();
    if (!home) {
        return [];
    }

    const candidates = [
        path.join(home, ".tripwirerc"),
        path.join(home, ".tripwirerc.json"),
        path.join(home, ".tripwirerc.js"),
        path.join(home, ".config", "tripwire", ".tripwirerc"),
        path.join(home, ".config", "tripwire", "tripwire.config.json"),
        path.join(home, ".config", "tripwire", "tripwire.config.js")
    ];

    for (let lp = 0; lp < candidates.length; lp++) {
        const loaded = _loadFile(candidates[lp]);
        if (loaded !== null) {
            return [{ filePath: candidates[lp], config: loaded }];
        }
    }

    return [];
}

/*
 * ---------------------------------------------------------------------------
 * Default IConfigLoader implementation
 * ---------------------------------------------------------------------------
 */

/**
 * Default {@link IConfigLoader}.
 *
 * Search strategy (from lowest to highest priority):
 *  1. User home directory (`~/.tripwirerc`, `~/.config/tripwire/...`)
 *  2. Repository root / filesystem ancestors of `startDir`
 *  3. `startDir` itself (and immediate parents as we walk toward root)
 *
 * The caller receives the list sorted lowest→highest priority so it can
 * merge with `Object.assign` / spread and later entries win.
 */
export class DefaultConfigLoader implements IConfigLoader {
    load(startDir: string): ILoadedConfig[] {
        const fromHome = _collectFromHome();
        const fromTree = _collectFromTree(startDir);

        /*
         * Home config has lowest priority; tree configs increase in priority
         * as they approach startDir (fromTree[0] = root, last = cwd).
         */
        return [...fromHome, ...fromTree];
    }
}

/*
 * ---------------------------------------------------------------------------
 * Merging helpers
 * ---------------------------------------------------------------------------
 */

/**
 * Merges an ordered list of loaded configs (index 0 = lowest priority) into a
 * single {@link ITripwireConfig}.  Array-valued keys (grep, ignore, spec, require)
 * are concatenated rather than replaced so that each level can add to the list.
 */
export function mergeConfigs(configs: ILoadedConfig[]): ITripwireConfig {
    const ARRAY_KEYS = new Set(["grep", "ignore", "spec", "require"]);
    const result: any = {};

    for (let lp = 0; lp < configs.length; lp++) {
        const c: any = configs[lp].config || {};
        const keys = Object.keys(c);
        for (let kp = 0; kp < keys.length; kp++) {
            const k = keys[kp];
            if (ARRAY_KEYS.has(k) && Array.isArray(c[k])) {
                result[k] = (result[k] || []).concat(c[k]);
            } else {
                result[k] = c[k];
            }
        }
    }

    return result as ITripwireConfig;
}

/*
 * ---------------------------------------------------------------------------
 * Convenience
 * ---------------------------------------------------------------------------
 */

/**
 * Load and merge all tripwire config files visible from `cwd` using the
 * default search strategy.  Returns an empty object when no config is found.
 */
export function loadConfig(cwd: string, loader?: IConfigLoader): ITripwireConfig {
    const active = loader || new DefaultConfigLoader();
    const loaded = active.load(cwd);
    return mergeConfigs(loaded);
}
