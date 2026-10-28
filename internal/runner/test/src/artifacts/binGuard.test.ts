/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import * as nodeModule from "module";
import * as ts from "typescript";
import { assert } from "@nevware21/tripwire";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";

/*
 * BIN-GUARD. Five properties of the shipped `bin` artifacts that were each broken once and
 * that nothing else asserts:
 *
 *  1. BIN-DEPS -- the bundles must be self-contained. Everything statically imported is
 *     inlined, so the only bare specifiers left are node builtins. When two @jridgewell
 *     packages escaped that rule, `npx tripwire --help` on a clean install died before
 *     printing a character, because both were declared only on the private `runner`.
 *
 *  2. MAP-OFFSET -- the source maps must actually resolve. All three shipped maps were
 *     unusable for the entire life of the branch, in three separate ways: a banner
 *     concatenated after minification shifted every mapping off the only line that exists,
 *     the chain stopped at the intermediate tsc output instead of reaching the TypeScript,
 *     and copying the artifacts into core/bin repointed every `sources` entry at a path
 *     that does not exist. None of it was noticed because nothing looked.
 *
 *  3. BIN-SHEBANG -- the CLI bundle must start with `#!/usr/bin/env node`. On Linux/macOS npm
 *     links a `bin` as an executable symlink that the shell runs directly, so without it
 *     `npx tripwire` fails with a shell syntax error. Windows' `.cmd` shim and every in-repo
 *     script run `node` explicitly, which is how the first release to declare `bin` nearly
 *     shipped without one.
 *
 *  4. BIN-SCOPE -- the browser and worker bundles must declare nothing in the global scope they
 *     share with the tests. Minified with uglify's `toplevel`, each iife became a bare block
 *     whose `var`s were globals under two-letter names; ts-utils' "call" landed on `it`, the
 *     test frame's own global `it` replaced it, and every run in the page stopped at its first
 *     hasOwnProperty check.
 *
 *  5. BIN-STRING -- the minifier must leave `String(x)` alone. Its `unsafe` option rewrote every
 *     one as `""+x`, which throws for a Symbol, so each assertion about a symbol failed with
 *     "Cannot convert a Symbol value to a string" once the interactive page described its values.
 *
 * These run against the built artifacts in `core/bin`, which are necessarily present -- the
 * runner suite is itself executed by `core/bin/tripwire.js`.
 */

// This file is at internal/runner/test/src/artifacts/, so the repo root is five levels up.
const _repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");
const _binDir = path.join(_repoRoot, "core", "bin");

interface IBundle {
    name: string;
    code: string;
    map: string;
}

const BUNDLES: IBundle[] = [
    { name: "tripwire.js", code: path.join(_binDir, "tripwire.js"), map: path.join(_binDir, "tripwire.js.map") },
    { name: "runner-client.js", code: path.join(_binDir, "assets", "runner-client.js"), map: path.join(_binDir, "assets", "runner-client.js.map") },
    { name: "runner-worker.js", code: path.join(_binDir, "assets", "runner-worker.js"), map: path.join(_binDir, "assets", "runner-worker.js.map") }
];

/**
 * True when the specifier names a node builtin. Handles the `node:` scheme and builtin
 * subpaths such as `path/win32`. `module.isBuiltin` only exists from node 18.6, and this
 * repo's CI matrix starts at 18, so it is used when available with a `builtinModules`
 * fallback behind it.
 */
function _isNodeBuiltin(specifier: string): boolean {
    const isBuiltin = (nodeModule as any).isBuiltin;

    if (typeof isBuiltin === "function") {
        return !!isBuiltin(specifier);
    }

    const bare = specifier.replace(/^node:/, "");
    const builtins: string[] = (nodeModule as any).builtinModules || [];

    return builtins.indexOf(bare) !== -1 || builtins.indexOf(bare.split("/")[0]) !== -1;
}

/**
 * Every distinct literal `require("...")` specifier in the given source.
 *
 * Only string-literal requires are collected; the CLI resolves things from the *target*
 * project through dynamic `require(variable)` calls that rollup never sees, and those are
 * deliberately outside this rule.
 *
 * The bundle also emits source code as data -- template strings that build a `require(...)`
 * call for the browser/worker payload -- so a captured specifier that could not be a real
 * module name (it carries concatenation operators, quotes or whitespace) is discarded rather
 * than reported as a dependency.
 */
function _literalRequires(code: string): string[] {
    const found: { [key: string]: boolean } = {};
    const re = /require\(\s*(["'])([^"']+)\1\s*\)/g;
    let match: RegExpExecArray | null;

    while ((match = re.exec(code)) !== null) {
        const specifier = match[2];

        if (!/[+()\s"'`${}]/.test(specifier)) {
            found[specifier] = true;
        }
    }

    return Object.keys(found).sort();
}

/**
 * A bare specifier is one resolved from `node_modules` rather than from disk -- anything
 * that is not relative, absolute or drive-qualified.
 */
function _isBare(specifier: string): boolean {
    return !/^\.{1,2}\//.test(specifier) && !/^\//.test(specifier) && !/^[a-zA-Z]:/.test(specifier);
}

// Layout of the CLI bundle: the shebang, the banner, then the minified chunk as one line.
const CLI_SHEBANG_LINE = 1;
const CLI_BANNER_LINE = 2;
const CLI_CODE_LINE = 3;

describe("bin guard", () => {
    describe("BIN-SHEBANG -- the CLI bundle is directly executable", () => {
        it("should start with a node shebang as its very first bytes", () => {
            // The shell only honours a shebang at byte 0: no BOM, no blank line, no banner
            // ahead of it. Read raw bytes rather than text so a BOM cannot hide behind
            // decoding, and insist on a bare LF -- `env` would otherwise look for "node\r".
            const bytes = fs.readFileSync(BUNDLES[0].code);
            const expected = "#!/usr/bin/env node\n";
            const head = bytes.slice(0, expected.length).toString("latin1");

            assert.equal(head, expected, "core/bin/tripwire.js must begin with \"#!/usr/bin/env node\" followed by a bare LF");
        });

        it("should keep the shebang on its own line ahead of the banner", () => {
            const lines = fs.readFileSync(BUNDLES[0].code, "utf8").split("\n");

            assert.equal(lines[CLI_SHEBANG_LINE - 1], "#!/usr/bin/env node");
            assert.isTrue(lines[CLI_BANNER_LINE - 1].indexOf("@nevware21/tripwire-runner") !== -1, "line 2 is expected to be the banner");
        });

        it("should not put a shebang on the browser or worker bundles", () => {
            // Those are loaded by a browser / worker thread, never executed by a shell.
            for (let lp = 1; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const code = fs.readFileSync(bundle.code, "utf8");

                assert.isFalse(code.indexOf("#!") === 0, bundle.name + " must not start with a shebang");
            }
        });
    });

    describe("BIN-SCOPE -- the browser and worker bundles keep their names to themselves", () => {
        it("should hold nothing at the top level but expressions, so every name is inside a function", () => {
            for (let lp = 1; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const source = ts.createSourceFile(bundle.name, fs.readFileSync(bundle.code, "utf8"), ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
                const declaring = source.statements
                    .filter((statement) => !ts.isExpressionStatement(statement))
                    .map((statement) => ts.SyntaxKind[statement.kind]);

                assert.isTrue(source.statements.length > 0, bundle.name + " has code");
                assert.deepEqual(declaring, [], bundle.name + "'s top level: a block, `var` or function there is a global the tests can replace");
            }
        });
    });

    describe("BIN-STRING -- the bundles convert values to text as their source does", () => {
        it("should keep String(x) rather than rewrite it as \"\"+x, which throws for a Symbol", () => {
            for (let lp = 0; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const code = fs.readFileSync(bundle.code, "utf8");
                const calls = (code.match(/\bString\(/g) || []).length;
                const concats = (code.match(/""\+/g) || []).length;

                assert.isTrue(calls > concats, bundle.name + " has " + calls + " String( calls and " + concats + " \"\"+ conversions: is uglify's `unsafe` back on?");
            }
        });
    });

    describe("the artifacts exist", () => {
        it("should have all three bundles and their maps built", () => {
            for (let lp = 0; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];

                assert.isTrue(fs.existsSync(bundle.code), "missing bundle: " + bundle.code);
                assert.isTrue(fs.existsSync(bundle.map), "missing map: " + bundle.map);
            }
        });
    });

    describe("BIN-DEPS -- the bundles stay self-contained", () => {
        it("should only require node builtins from the CLI bundle", () => {
            // The rule BIN-DEPS established, and the check that would have caught the
            // @jridgewell gap on the first build.
            const code = fs.readFileSync(BUNDLES[0].code, "utf8");
            const bare = _literalRequires(code).filter(_isBare);
            const external = bare.filter((specifier) => !_isNodeBuiltin(specifier));

            assert.deepEqual(external, [], "non-builtin bare require(s) in core/bin/tripwire.js: " + external.join(", "));
        });

        it("should only require node builtins from every bundle", () => {
            for (let lp = 0; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const code = fs.readFileSync(bundle.code, "utf8");
                const bare = _literalRequires(code).filter(_isBare);
                const external = bare.filter((specifier) => !_isNodeBuiltin(specifier));

                assert.deepEqual(external, [], "non-builtin bare require(s) in " + bundle.name + ": " + external.join(", "));
            }
        });

        it("should never statically require a @nevware21 or @jridgewell package", () => {
            // Named explicitly because these are the packages that actually escaped: they
            // are `runner` dependencies, and `runner` is private and unpublished.
            for (let lp = 0; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const code = fs.readFileSync(bundle.code, "utf8");
                const scoped = _literalRequires(code).filter((specifier) => /^@(nevware21|jridgewell)\//.test(specifier));

                assert.deepEqual(scoped, [], "scoped package require(s) in " + bundle.name + ": " + scoped.join(", "));
            }
        });

        it("should not reach outside its own directory with a relative require", () => {
            // A relative require escaping the bundle's directory would not survive
            // publishing, since only `bin/` ships.
            for (let lp = 0; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const code = fs.readFileSync(bundle.code, "utf8");
                const escaping = _literalRequires(code).filter((specifier) => /^\.\.\//.test(specifier));

                assert.deepEqual(escaping, [], "upward relative require(s) in " + bundle.name + ": " + escaping.join(", "));
            }
        });
    });

    describe("MAP-OFFSET -- the shipped source maps resolve", () => {
        it("should parse every map and declare sources", () => {
            for (let lp = 0; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const map = JSON.parse(fs.readFileSync(bundle.map, "utf8"));

                assert.isDefined(map, bundle.name);
                assert.isArray(map.sources, bundle.name + " has no sources array");
                assert.isTrue(map.sources.length > 0, bundle.name + " declares no sources");
            }
        });

        it("should chain through to the TypeScript sources, not the intermediate build output", () => {
            // Fault 2. Rollup does not follow a loaded file's sourceMappingURL on its own,
            // so without the loadBuildOutputMaps plugin the chain stops at build/esnext and
            // every frame names a compiled .js file the author never wrote.
            for (let lp = 0; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const map = JSON.parse(fs.readFileSync(bundle.map, "utf8"));
                const sources: string[] = map.sources || [];
                const intermediate = sources.filter((source) => /(^|\/)build\/(esnext|es5|es6)\//.test(source));
                const typescript = sources.filter((source) => /runner\/src\/.*\.ts$/.test(source));

                assert.deepEqual(intermediate, [], bundle.name + " still maps to build output: " + intermediate.join(", "));
                assert.isTrue(typescript.length > 0, bundle.name + " maps to no runner/src TypeScript at all");
            }
        });

        it("should point every source at a file that exists on disk", () => {
            /*
             * Fault 3, and the single strongest assertion here. A map's `sources` are
             * relative to the map's own location, so copying the artifacts from
             * runner/dist/bin into core/bin turned `../../src/...` (meaning runner/src)
             * into a reference to core/src, which does not exist. Resolving each entry
             * against the map's directory and stat-ing it catches that directly.
             */
            for (let lp = 0; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const map = JSON.parse(fs.readFileSync(bundle.map, "utf8"));
                const mapDir = path.dirname(bundle.map);
                const sources: string[] = map.sources || [];
                const missing: string[] = [];

                for (let src = 0; src < sources.length; src++) {
                    const source = sources[src];

                    // Only the repo's own TypeScript is asserted to exist; a dependency's
                    // bundled .js may legitimately have been pruned from node_modules.
                    if (!/runner\/src\/.*\.ts$/.test(source)) {
                        continue;
                    }

                    if (!fs.existsSync(path.resolve(mapDir, source))) {
                        missing.push(source);
                    }
                }

                assert.deepEqual(missing, [], bundle.name + " maps to " + missing.length + " non-existent source(s), eg. " + missing.slice(0, 3).join(", "));
            }
        });

        it("should not map the shebang or banner lines, which carry no code", () => {
            /*
             * Fault 1. The banner used to be concatenated on after minification, so the map
             * was generated for the code without it and every mapping sat one line above
             * where the code actually is. Because minified output is a single line, that
             * made the only line with code unmapped entirely. The shebang now sits above the
             * banner and goes through the same preamble path, so both lines are checked.
             */
            const bundle = BUNDLES[0];
            const lines = fs.readFileSync(bundle.code, "utf8").split("\n");
            const tracer = new TraceMap(JSON.parse(fs.readFileSync(bundle.map, "utf8")));

            assert.isTrue(lines[CLI_BANNER_LINE - 1].indexOf("@nevware21/tripwire-runner") !== -1, "line 2 is expected to be the banner");

            const shebang = originalPositionFor(tracer, { line: CLI_SHEBANG_LINE, column: 5 });
            const banner = originalPositionFor(tracer, { line: CLI_BANNER_LINE, column: 10 });

            assert.isNull(shebang.source, "the shebang line must not be mapped");
            assert.isNull(banner.source, "the banner line must not be mapped");
        });

        it("should resolve real positions on the CLI bundle's code line", () => {
            const bundle = BUNDLES[0];
            const lines = fs.readFileSync(bundle.code, "utf8").split("\n");
            const tracer = new TraceMap(JSON.parse(fs.readFileSync(bundle.map, "utf8")));

            // The minified chunk is one long line directly after the shebang and banner.
            const codeLine = CLI_CODE_LINE;
            const width = lines[codeLine - 1].length;

            assert.isTrue(width > 1000, "expected a minified single-line chunk, got width " + width);

            let resolved = 0;
            let probes = 0;
            const seen: { [source: string]: boolean } = {};

            for (let column = 0; column < width; column += 2000) {
                const position = originalPositionFor(tracer, { line: codeLine, column: column });

                probes++;

                if (position.source) {
                    resolved++;
                    seen[position.source] = true;
                }
            }

            // Not every column lands on a mapping boundary, so this is a proportion rather
            // than a total. Before the fix it was zero.
            assert.isTrue(probes > 10, "expected a meaningful number of probes, got " + probes);
            assert.isTrue(resolved > probes * 0.8, "only " + resolved + " of " + probes + " probes resolved");

            const distinct = Object.keys(seen);
            const typescript = distinct.filter((source) => /runner\/src\/.*\.ts$/.test(source));

            assert.isTrue(typescript.length > 5, "probes reached only " + typescript.length + " runner/src TypeScript source(s)");
        });

        it("should resolve a mapped position to a source with a real line number", () => {
            // `--debug-stack` prints `at fn (runner/src/execute/execute.ts:324:23)`, so a
            // mapping that resolves a source but no line is still useless.
            const bundle = BUNDLES[0];
            const lines = fs.readFileSync(bundle.code, "utf8").split("\n");
            const tracer = new TraceMap(JSON.parse(fs.readFileSync(bundle.map, "utf8")));
            const width = lines[CLI_CODE_LINE - 1].length;
            let checked = 0;

            for (let column = 0; column < width && checked < 5; column += 3000) {
                const position = originalPositionFor(tracer, { line: CLI_CODE_LINE, column: column });

                if (position.source) {
                    assert.isNumber(position.line, "mapped " + position.source + " with no line");
                    assert.isTrue(position.line > 0, "mapped " + position.source + " to line " + position.line);
                    checked++;
                }
            }

            assert.isTrue(checked > 0, "no position resolved at all");
        });

        it("should resolve positions on the browser and worker bundles too", () => {
            // These two feed the DevTools "sources" panel rather than --debug-stack, and
            // were broken by the same three faults.
            for (let lp = 1; lp < BUNDLES.length; lp++) {
                const bundle = BUNDLES[lp];
                const lines = fs.readFileSync(bundle.code, "utf8").split("\n");
                const tracer = new TraceMap(JSON.parse(fs.readFileSync(bundle.map, "utf8")));

                // Find the widest line, which is the minified chunk.
                let codeLine = 1;

                for (let ln = 0; ln < lines.length; ln++) {
                    if (lines[ln].length > lines[codeLine - 1].length) {
                        codeLine = ln + 1;
                    }
                }

                const width = lines[codeLine - 1].length;
                let resolved = 0;

                for (let column = 0; column < width; column += 2000) {
                    if (originalPositionFor(tracer, { line: codeLine, column: column }).source) {
                        resolved++;
                    }
                }

                assert.isTrue(resolved > 0, bundle.name + " resolved no positions at all");
            }
        });
    });
});
