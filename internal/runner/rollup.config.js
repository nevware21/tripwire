/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */
"use strict";

import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import cleanup from "rollup-plugin-cleanup";

const fs = require("fs");
const path = require("path");
// Resolved by name, the way core/rollup.config.js and shim/chai/rollup.config.js already do it:
// `uglify-js` is a declared devDependency of this package and rush links it into node_modules.
// This used to reach directly into `../common/temp/node_modules/`, which worked only while this
// package sat exactly one level below the repo root -- moving it under internal/ broke the build
// on a dependency that was available by name the whole time.
const UglifyJs = require("uglify-js");
const version = require("./package.json").version;

const banner = "/*! @nevware21/tripwire-runner v" + version + " */";
/*
 * The CLI bundle ships as the `bin` of `@nevware21/tripwire`. On Linux/macOS npm links a `bin`
 * as an executable symlink that the *shell* runs, so without a shebang `npx tripwire` (or
 * `tripwire` in a package.json `scripts` entry) fails with a shell syntax error on the first
 * line of JavaScript. Windows' `.cmd` shim runs `node` explicitly, and every in-repo script calls
 * `node ./bin/tripwire.js`, which is why neither path ever noticed it was missing.
 *
 * It travels with the banner as uglify's `preamble` (see `_doMinify`) rather than being
 * prepended afterwards, so the source map is generated with the extra line already in place.
 */
const shebang = "#!/usr/bin/env node";
const clientBanner = "/*! @nevware21/tripwire-client v" + version + " */";
const workerBanner = "/*! @nevware21/tripwire-worker v" + version + " */";
const mainFields = ["module", "main"];

/*
 * The `bin` bundles must be self-contained: every dependency they statically import is inlined,
 * so the only bare specifiers left in the emitted output are node builtins.
 *
 * `runner` is private and never published. The CLI bundle it produces ships as the `bin` of
 * `@nevware21/tripwire`, so anything left external has to be resolvable from *that* package at
 * runtime -- `runner`'s own dependency list buys the CLI nothing. Externalising a package core
 * does not declare produces a CLI that cannot start at all (it dies on "Cannot find module"
 * before it can print its own help); externalising one core *does* declare merely moves the
 * failure to a version skew nobody can debug. Neither is worth the handful of kilobytes.
 *
 * This deliberately does not exempt the @nevware21/* packages. Core declares them for its own
 * `dist`, but that makes them a dependency of the *library*, not a guarantee for the CLI -- and
 * pinning the CLI to its own build-time copy is what keeps it working regardless of what the
 * consuming project resolves for the library.
 *
 * Note what this rule does *not* touch: everything the CLI resolves from the target project at
 * runtime rather than importing statically -- `@nevware21/tripwire` itself (via `_loadTripwire`,
 * which must share one module instance with the test files being run), `typescript`,
 * `puppeteer`/`puppeteer-core`, the coverage instrumenter, and a `--ux-provider` module. Those
 * are dynamic `require()` calls that rollup never sees, so they stay late-bound by construction.
 */
const _builtinModules = new Set(require("module").builtinModules);

function _isNodeBuiltin(id) {
    return id.indexOf("node:") === 0 || _builtinModules.has(id) || _builtinModules.has(id.split("/")[0]);
}

function _isSourceMapEnabled(outputOptions) {
    return !!(outputOptions && outputOptions.sourcemap);
}

function _stripSourceMapPathPrefix(sourcePath) {
    if (!sourcePath) {
        return sourcePath;
    }

    return sourcePath.replace(/^\.\.\/\.\.\/\.\.\/src\/assets\//g, "../assets/");
}

function _normalizeSourceMapPaths(mapValue) {
    if (!mapValue) {
        return mapValue;
    }

    var mapObject = typeof mapValue === "string" ? JSON.parse(mapValue) : mapValue;
    if (mapObject && mapObject.sources && mapObject.sources.map) {
        mapObject.sources = mapObject.sources.map(_stripSourceMapPathPrefix);
    }

    return typeof mapValue === "string" ? JSON.stringify(mapObject) : mapObject;
}

function _stripSourceMapRef(code) {
    return code.replace(/^[ \t]*\/\/# sourceMappingURL=[^\r\n]*\s*$/gm, "");
}

function _doMinify(code, filename, outputOptions, inputMap, preamble) {
    var theCode = {};
    theCode[filename] = _stripSourceMapRef(code);
    var normalizedInputMap = _normalizeSourceMapPaths(inputMap);

    var minifyOptions = {
        ie8: false,
        toplevel: true,
        compress: {
            passes: 3,
            unsafe: true
        },
        output: {
            // Must go through uglify rather than being concatenated onto the result: uglify
            // accounts for the preamble when it emits the source map, so every mapping shifts
            // down by however many lines the preamble occupies (the banner, plus the shebang
            // on the CLI bundle). Prepending it afterwards left every map in the package off
            // by exactly one line -- which is the difference between a mapped stack frame and
            // no mapping at all, since the minified code is a single line and "line 2" simply
            // did not exist in the map.
            preamble: preamble || null
        }
    };

    if (_isSourceMapEnabled(outputOptions)) {
        minifyOptions.sourceMap = {
            filename: filename,
            url: filename + ".map"
        };

        if (normalizedInputMap) {
            minifyOptions.sourceMap.content = typeof normalizedInputMap === "string" ? normalizedInputMap : JSON.stringify(normalizedInputMap);
            minifyOptions.sourceMap.includeSources = true;
        }
    }

    var result = UglifyJs.minify(theCode, minifyOptions);

    if (result.error) {
        throw new Error(JSON.stringify(result.error));
    }

    var transform = {
        code: _stripSourceMapRef(result.code || "")
    };

    if (_isSourceMapEnabled(outputOptions) && result.map) {
        transform.map = _normalizeSourceMapPaths(result.map);
    }

    return transform;
}

function uglify3(chkOpt) {
    return {
        name: "internal-rollup-uglify-js",
        renderChunk(code, chunk, outputOptions) {
            const inputMap = chunk && chunk.map ? chunk.map : null;

            return _doMinify(code, chunk.fileName, outputOptions, inputMap, chkOpt && chkOpt.preamble);
        }
    };
}

// Maps a `.html`/`.css`/`.ico` import as seen from the tsc *output* tree (`build/esnext/**`,
// where only the compiled `.js` siblings of these resource files actually exist) back to the
// original file under the *source* tree (`src/**`, which mirrors the same relative layout) --
// needed because `inlineText`/`inlineBinary` below run against rollup's already-compiled input.
function _resolveFromBuildToSrc(directPath) {
    var buildRoot = path.resolve(__dirname, "build", "esnext");
    var relPath = path.relative(buildRoot, directPath);

    if (!relPath || relPath.indexOf("..") === 0) {
        return "";
    }

    return path.resolve(__dirname, "src", relPath);
}

/**
 * Inline plugin: transforms imports of .html and .css files into string exports.
 * No external dependency required — resources are embedded directly into the bundle
 * at build time, eliminating runtime fs.readFileSync and path-resolution logic.
 */
function inlineText(extensions) {
    return {
        name: "inline-text",
        resolveId(source, importer) {
            if (extensions.some(function(ext) { return source.endsWith(ext); })) {
                if (importer) {
                    // First try resolving relative to the importer (build output path).
                    var direct = path.resolve(path.dirname(importer), source);
                    if (fs.existsSync(direct)) {
                        return direct;
                    }

                    // Remap build output paths back to src/ for non-TS resource files.
                    var srcPath = _resolveFromBuildToSrc(direct);
                    if (fs.existsSync(srcPath)) {
                        return srcPath;
                    }
                }
            }
            return null;
        },
        load(id) {
            if (extensions.some(function(ext) { return id.endsWith(ext); })) {
                var content = fs.readFileSync(id, "utf8");
                return "export default " + JSON.stringify(content) + ";";
            }
        }
    };
}

function inlineBinary(extensions) {
    return {
        name: "inline-binary",
        resolveId(source, importer) {
            if (extensions.some(function(ext) { return source.endsWith(ext); })) {
                if (importer) {
                    var direct = path.resolve(path.dirname(importer), source);
                    if (fs.existsSync(direct)) {
                        return direct;
                    }

                    var srcPath = _resolveFromBuildToSrc(direct);
                    if (fs.existsSync(srcPath)) {
                        return srcPath;
                    }
                }
            }
            return null;
        },
        load(id) {
            if (extensions.some(function(ext) { return id.endsWith(ext); })) {
                var content = fs.readFileSync(id);
                return "export default " + JSON.stringify(content.toString("base64")) + ";";
            }
        }
    };
}

/*
 * Rollup does not read a loaded file's `//# sourceMappingURL` comment on its own, so without
 * this every bundle's map stopped at the *tsc output* (`build/esnext/**.js`) -- which is what
 * a mapped stack frame or a DevTools "sources" panel then showed, rather than the real
 * `src/**.ts` the author wrote. Feeding tsc's own per-file maps back in lets rollup chain them,
 * so the emitted map goes all the way through to TypeScript.
 */
function loadBuildOutputMaps() {
    const buildRoot = path.resolve(__dirname, "build", "esnext");

    return {
        name: "load-build-output-maps",
        load(id) {
            const normalizedId = path.resolve(id);
            if (normalizedId.indexOf(buildRoot) !== 0 || !normalizedId.endsWith(".js")) {
                return null;
            }

            const mapPath = normalizedId + ".map";
            if (!fs.existsSync(normalizedId) || !fs.existsSync(mapPath)) {
                return null;
            }

            try {
                return {
                    code: fs.readFileSync(normalizedId, "utf8"),
                    map: JSON.parse(fs.readFileSync(mapPath, "utf8"))
                };
            } catch (e) {
                // A missing or malformed intermediate map only costs resolution detail; it must
                // never fail the build.
                return null;
            }
        }
    };
}

function loadRunnerEntryWithMap(name) {
    const srcEntryPath = path.resolve(__dirname, "build/esnext/assets/" + name + ".js");
    const srcEntryMapPath = srcEntryPath + ".map";

    return {
        name: "load-runner-entry-with-map",
        load(id) {
            const normalizedId = path.resolve(id);
            if (normalizedId === srcEntryPath && fs.existsSync(srcEntryPath)) {
                const code = fs.readFileSync(srcEntryPath, "utf8");
                if (fs.existsSync(srcEntryMapPath)) {
                    const mapText = fs.readFileSync(srcEntryMapPath, "utf8");
                    try {
                        return {
                            code: code,
                            map: JSON.parse(mapText)
                        };
                    } catch (e) {
                        return {
                            code: code,
                            map: mapText
                        };
                    }
                }

                return code;
            }

            return null;
        }
    };
}

const clientBundle = {
    input: path.resolve(__dirname, "build/esnext/ux/browser/ui/client.js"),
    output: {
        file: "./dist/bin/assets/runner-client.js",
        format: "iife",
        sourcemap: true,
        sourcemapPathTransform: function(relativeSourcePath) {
            return _stripSourceMapPathPrefix(relativeSourcePath);
        }
    },
    external: [],
    plugins: [
        loadBuildOutputMaps(),
        nodeResolve({
            module: true,
            browser: false,
            preferBuiltins: true,
            mainFields: mainFields
        }),
        commonjs(),
        cleanup({
            comments: [
                /[#@]__/, /^!/
            ]
        }),
        uglify3({
            preamble: clientBanner
        })
    ]
};

const workerBundle = {
    input: "./build/esnext/assets/runner-worker.js",
    output: {
        file: "./dist/bin/assets/runner-worker.js",
        format: "iife",
        sourcemap: true,
        sourcemapPathTransform: function(relativeSourcePath) {
            return _stripSourceMapPathPrefix(relativeSourcePath);
        }
    },
    external: [],
    plugins: [
        loadRunnerEntryWithMap("runner-worker"),
        loadBuildOutputMaps(),
        nodeResolve({
            module: true,
            browser: false,
            preferBuiltins: true,
            mainFields: mainFields
        }),
        commonjs(),
        cleanup({
            comments: [
                /[#@]__/, /^!/
            ]
        }),
        uglify3({
            preamble: workerBanner
        })
    ]
};

const mainBundle = {
    input: "./build/esnext/tripwire.js",
    output: {
        file: "./dist/bin/tripwire.js",
        format: "cjs",
        name: "nevware21.tripwire",
        sourcemap: true
    },
    // Node builtins only -- see `_isNodeBuiltin` above for why everything else is inlined.
    external: (id) => _isNodeBuiltin(id),
    plugins: [
        loadBuildOutputMaps(),
        inlineText([".html", ".css"]),
        inlineBinary([".ico"]),
        nodeResolve({
            module: true,
            browser: false,
            preferBuiltins: true,
            mainFields: mainFields
        }),
        commonjs(),
        cleanup({
            comments: [
                /[#@]__/, /^!/, /^# sourceMappingURL=/
            ]
        }),
        uglify3({
            preamble: shebang + "\n" + banner
        })
    ]
};

module.exports = [clientBundle, workerBundle, mainBundle];
