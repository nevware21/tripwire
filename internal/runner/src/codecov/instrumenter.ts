/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import { isFunction, isString } from "@nevware21/ts-utils";
import { ICoverageInstrumenter } from "./interfaces";
import { _userError } from "../internal/userError";

/**
 * Extracts an inline base64 source-map or resolves an external `.map` reference
 * from a transpiled JS string.  Returns `null` when no usable map is found.
 */
export function extractSourceMap(source: string, moduleId: string): any | null {
    const text = String(source || "");

    // Inline base64 data-URI source map
    const inlineMatch = text.match(
        // eslint-disable-next-line security/detect-unsafe-regex
        /\/\/\# sourceMappingURL=data:application\/json(?:;charset=[^;]+)?;base64,([A-Za-z0-9+/=]+)\s*$/m
    );
    if (inlineMatch && inlineMatch[1]) {
        try {
            return JSON.parse(Buffer.from(inlineMatch[1], "base64").toString("utf8"));
        } catch (e) {
            return null;
        }
    }

    // External `.map` file reference
    const externalMatch = text.match(/\/\/\# sourceMappingURL=([^\r\n]+)\s*$/m);
    if (externalMatch && externalMatch[1]) {
        const mapRef = String(externalMatch[1]).trim();
        if (mapRef && mapRef.indexOf("data:") !== 0) {
            try {
                const normalizedRef = decodeURIComponent(mapRef);
                const mapFile = path.resolve(path.dirname(moduleId), normalizedRef);

                // eslint-disable-next-line security/detect-non-literal-fs-filename
                if (fs.existsSync(mapFile)) {
                    // eslint-disable-next-line security/detect-non-literal-fs-filename
                    return JSON.parse(fs.readFileSync(mapFile, "utf8"));
                }
            } catch (e) {
                // ignore
            }
        }
    }

    return null;
}

/**
 * Istanbul-lib-instrument backed {@link ICoverageInstrumenter}.
 * Loaded lazily from the project's own `node_modules` at runtime so that the
 * runner itself does not need to bundle istanbul.
 */
export class IstanbulCoverageInstrumenter implements ICoverageInstrumenter {
    private _instrumenter: any = null;
    private _cwd: string;
    private _instrumenterModule: string;

    constructor(cwd: string, instrumenterModule = "istanbul-lib-instrument") {
        this._cwd = cwd;
        this._instrumenterModule = instrumenterModule;
    }

    private _load(): any {
        if (this._instrumenter) {
            return this._instrumenter;
        }

        let loadedModule: any;
        try {
            const resolved = require.resolve(this._instrumenterModule, {
                paths: [this._cwd, process.cwd(), __dirname]
            });

            // eslint-disable-next-line security/detect-non-literal-require
            loadedModule = require(resolved);
        } catch (e) {
            throw _userError(
                "Coverage instrumentation unavailable: unable to resolve '" +
                this._instrumenterModule + "'.",
                [
                    "npm install --save-dev " + this._instrumenterModule,
                    "Or run without --coverage, or pass --coverage-instrumenter none."
                ]
            );
        }

        const moduleApi = loadedModule.default || loadedModule;
        const options = {
            coverageVariable: "__coverage__",
            autoWrap: true,
            compact: false,
            esModules: false,
            produceSourceMap: true,
            preserveComments: true
        };

        if (moduleApi && isFunction(moduleApi.createInstrumenter)) {
            this._instrumenter = moduleApi.createInstrumenter(options);
        } else if (moduleApi && isFunction(moduleApi.instrumentSync)) {
            this._instrumenter = moduleApi;
        } else {
            throw _userError(
                "Coverage instrumentation unavailable: module '" +
                this._instrumenterModule +
                "' does not expose createInstrumenter or instrumentSync."
            );
        }

        return this._instrumenter;
    }

    instrument(source: string, moduleId: string, inputSourceMap?: any): string {
        const inst = this._load();
        if (inputSourceMap) {
            return inst.instrumentSync(source, moduleId, inputSourceMap);
        }
        return inst.instrumentSync(source, moduleId);
    }

    getLastFileCoverage(): any {
        const inst = this._load();
        return inst && isFunction(inst.lastFileCoverage) ? inst.lastFileCoverage() || null : null;
    }
}

/**
 * Creates a pluggable {@link ICoverageInstrumenter} by loading the named module.
 * Supports the istanbul-lib-instrument API (`createInstrumenter` / `instrumentSync`)
 * as well as a plain function transform API `(source, id, options) => string`.
 */
export function createInstrumenter(
    cwd: string,
    instrumenterModule = "istanbul-lib-instrument"
): ICoverageInstrumenter {
    if (!instrumenterModule || instrumenterModule.toLowerCase() === "none") {
        return {
            instrument(source: string): string {
                return source;
            }
        };
    }

    // Try to detect whether the named module needs a different adapter.
    let loadedModule: any;
    try {
        const resolved = require.resolve(instrumenterModule, {
            paths: [cwd, process.cwd(), __dirname]
        });

        // eslint-disable-next-line security/detect-non-literal-require
        loadedModule = require(resolved);
    } catch (e) {
        console.warn(
            "Coverage instrumentation unavailable: unable to resolve '" + instrumenterModule + "'."
        );
        return { instrument: (s) => s };
    }

    const moduleApi = loadedModule.default || loadedModule;

    if (moduleApi && (isFunction(moduleApi.createInstrumenter) || isFunction(moduleApi.instrumentSync))) {
        return new IstanbulCoverageInstrumenter(cwd, instrumenterModule);
    }

    if (isFunction(moduleApi)) {
        // Custom transform factory: (options, context) => transformFn | { instrumentSync }
        const options = {
            coverageVariable: "__coverage__",
            autoWrap: true,
            compact: false,
            esModules: false,
            produceSourceMap: true,
            preserveComments: true
        };
        const created = moduleApi(options, { cwd });

        if (created && isFunction(created.instrumentSync)) {
            return {
                instrument(source: string, moduleId: string, inputSourceMap?: any): string {
                    return inputSourceMap
                        ? created.instrumentSync(source, moduleId, inputSourceMap)
                        : created.instrumentSync(source, moduleId);
                }
            };
        }

        if (isFunction(created)) {
            return {
                instrument(source: string, moduleId: string): string {
                    const result = created(source, moduleId, options);
                    return isString(result) ? result : source;
                }
            };
        }
    }

    console.warn(
        "Coverage instrumentation unavailable: module '" + instrumenterModule +
        "' does not expose a supported API."
    );
    return { instrument: (s) => s };
}
