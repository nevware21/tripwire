/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { assert } from "@nevware21/tripwire";
import {
    buildInfoPath, checkProgramManifest, createProgramManifest, emitCacheKey, getCacheDir, hashFile, hashText,
    lockSignatures, optionsFingerprint, pruneEmitCache, readEmitCache, readProgramManifest, resetCacheDirs, writeEmitCache,
    writeProgramManifest
} from "../../../src/compile/cacheStore";

function _tempDir(name: string): string {
    const dir = path.join(os.tmpdir(), "tripwire-cachestore-test", name + "-" + process.pid + "-" + Math.random().toString(36).substring(2));
    fs.mkdirSync(dir, { recursive: true });

    return dir;
}

function _rm(dir: string): void {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
        // Best effort -- a leftover temp directory is not worth failing a test over.
    }
}

describe("compile cacheStore", () => {

    describe("hashText", () => {
        it("should be stable for the same input", () => {
            assert.equal(hashText("some text"), hashText("some text"));
        });

        it("should differ for different input", () => {
            assert.notEqual(hashText("some text"), hashText("some text "));
        });
    });

    describe("optionsFingerprint", () => {
        it("should not depend on the order the options were written in", () => {
            const a = optionsFingerprint("5.2.2", { target: 1, module: 1, strict: true });
            const b = optionsFingerprint("5.2.2", { strict: true, module: 1, target: 1 });

            assert.equal(a, b);
        });

        it("should change when an option value changes", () => {
            const a = optionsFingerprint("5.2.2", { target: 1 });
            const b = optionsFingerprint("5.2.2", { target: 2 });

            assert.notEqual(a, b, "a different target must not reuse the same cache entries");
        });

        it("should change when an option is added", () => {
            const a = optionsFingerprint("5.2.2", { target: 1 });
            const b = optionsFingerprint("5.2.2", { target: 1, preserveConstEnums: true });

            assert.notEqual(a, b);
        });

        it("should change when the compiler version changes", () => {
            const a = optionsFingerprint("5.2.2", { target: 1 });
            const b = optionsFingerprint("5.3.0", { target: 1 });

            assert.notEqual(a, b, "the same options under a different compiler can emit different code");
        });

        it("should tolerate an unserialisable option value", () => {
            const circular: any = {};
            circular.self = circular;

            // The value cannot be described, so it must not be *mistaken* for a value that can be --
            // a miss is fine, a false hit is not.
            assert.isString(optionsFingerprint("5.2.2", { weird: circular }));
        });
    });

    describe("emitCacheKey", () => {
        it("should change with the source text", () => {
            const fingerprint = optionsFingerprint("5.2.2", { target: 1 });

            assert.notEqual(emitCacheKey("/p/a.ts", "let a = 1;", fingerprint), emitCacheKey("/p/a.ts", "let a = 2;", fingerprint));
        });

        it("should change with the options fingerprint", () => {
            const source = "let a = 1;";

            assert.notEqual(
                emitCacheKey("/p/a.ts", source, optionsFingerprint("5.2.2", { target: 1 })),
                emitCacheKey("/p/a.ts", source, optionsFingerprint("5.2.2", { target: 2 })));
        });

        it("should change with the file name, because the output names the file", () => {
            // The hook forces inlineSourceMap/inlineSources, so identical text at two paths emits
            // two genuinely different files -- each inline map names its own source. Sharing one
            // entry sent the second file's stack frames and coverage to the first file's name.
            const fingerprint = optionsFingerprint("5.2.2", { target: 1 });
            const source = "export {};";

            assert.notEqual(
                emitCacheKey("/p/a/foo.ts", source, fingerprint),
                emitCacheKey("/p/a/bar.ts", source, fingerprint),
                "two names in one directory must not share an entry");
            assert.notEqual(
                emitCacheKey("/p/a/foo.ts", source, fingerprint),
                emitCacheKey("/p/b/foo.ts", source, fingerprint),
                "the same name in two directories must not share an entry");
            assert.notEqual(
                emitCacheKey("/p/a/foo.ts", source, fingerprint),
                emitCacheKey("/p/a/foo.tsx", source, fingerprint),
                "extensions that emit differently must not share an entry");
        });

        it("should be stable for the same file, text and options", () => {
            const fingerprint = optionsFingerprint("5.2.2", { target: 1 });

            assert.equal(
                emitCacheKey("/p/a/foo.ts", "let a = 1;", fingerprint),
                emitCacheKey("/p/a/foo.ts", "let a = 1;", fingerprint));
        });
    });

    describe("read / write", () => {
        it("should round-trip an entry", () => {
            const dir = _tempDir("roundtrip");
            try {
                const key = emitCacheKey("/p/a.ts", "let a = 1;", "fp");
                assert.isNull(readEmitCache(dir, key), "nothing stored yet");

                writeEmitCache(dir, key, "var a = 1;");
                assert.equal(readEmitCache(dir, key), "var a = 1;");
            } finally {
                _rm(dir);
            }
        });

        it("should preserve output containing the completion marker's own text", () => {
            const dir = _tempDir("marker");
            try {
                const key = emitCacheKey("/p/a.ts", "marker", "fp");
                const text = "var a = 1;\n//# tripwireEmitCacheComplete\nvar b = 2;";

                writeEmitCache(dir, key, text);
                assert.equal(readEmitCache(dir, key), text, "only the trailing marker terminates an entry");
            } finally {
                _rm(dir);
            }
        });

        it("should treat a truncated entry as a miss", () => {
            const dir = _tempDir("truncated");
            try {
                const key = emitCacheKey("/p/a.ts", "let a = 1;", "fp");
                writeEmitCache(dir, key, "var a = 1;");

                const stored = path.join(dir, "emit", key.substring(0, 2), key.substring(2) + ".js");
                const full = fs.readFileSync(stored, "utf8");
                fs.writeFileSync(stored, full.substring(0, full.length - 10), "utf8");

                assert.isNull(readEmitCache(dir, key), "a half-written entry must never be executed");
            } finally {
                _rm(dir);
            }
        });

        it("should treat an unreadable or absent entry as a miss", () => {
            const dir = _tempDir("absent");
            try {
                assert.isNull(readEmitCache(dir, emitCacheKey("/p/a.ts", "nothing here", "fp")));
                assert.isNull(readEmitCache(null, emitCacheKey("/p/a.ts", "nothing here", "fp")));
            } finally {
                _rm(dir);
            }
        });

        it("should ignore a write when there is no cache directory", () => {
            // No directory is a supported state, not an error: the run simply does not cache.
            writeEmitCache(null, "key", "var a = 1;");
            assert.isNull(readEmitCache(null, "key"));
        });

        it("should give up quietly when the cache directory cannot be created", () => {
            const dir = _tempDir("blocked");
            try {
                // A file where the cache directory would go
                const blocked = path.join(dir, "cache");
                fs.writeFileSync(blocked, "not a directory", "utf8");
                const key = emitCacheKey("/p/a.ts", "let a = 1;", "fp");

                writeEmitCache(blocked, key, "var a = 1;");
                writeProgramManifest(blocked, "/p/tsconfig.json", createProgramManifest("fp", [], [], [], false));

                assert.isNull(readEmitCache(blocked, key));
                assert.equal(fs.readFileSync(blocked, "utf8"), "not a directory");
            } finally {
                _rm(dir);
            }
        });

        it("should not leave temporary files behind", () => {
            const dir = _tempDir("notemp");
            try {
                const key = emitCacheKey("/p/a.ts", "let a = 1;", "fp");
                writeEmitCache(dir, key, "var a = 1;");

                const entries = fs.readdirSync(path.join(dir, "emit", key.substring(0, 2)));
                const temps = entries.filter((name) => name.indexOf(".tmp") !== -1);

                assert.deepEqual(temps, []);
            } finally {
                _rm(dir);
            }
        });
    });

    describe("pruneEmitCache", () => {
        const DAY = 24 * 60 * 60 * 1000;

        function _age(dir: string, key: string, ageMs: number, now: number): void {
            const entry = path.join(dir, "emit", key.substring(0, 2), key.substring(2) + ".js");
            const when = new Date(now - ageMs);
            fs.utimesSync(entry, when, when);
        }

        it("should remove entries not read within the age limit and keep the rest", () => {
            const dir = _tempDir("prune");
            try {
                const now = Date.now();
                const stale = hashText("stale");
                const fresh = hashText("fresh");
                writeEmitCache(dir, stale, "// stale");
                writeEmitCache(dir, fresh, "// fresh");
                _age(dir, stale, 8 * DAY, now);
                _age(dir, fresh, 1 * DAY, now);

                assert.equal(pruneEmitCache(dir, now, 7 * DAY, 0), 1);
                assert.isNull(readEmitCache(dir, stale), "the stale entry should be gone");
                assert.equal(readEmitCache(dir, fresh), "// fresh", "the fresh entry should survive");
            } finally {
                _rm(dir);
            }
        });

        it("should treat a read as keeping an entry alive", () => {
            // Entries are keyed by content and never rewritten, so a read is the only thing that can
            // distinguish a file loaded on every run from one orphaned by an edit.
            const dir = _tempDir("prune-touch");
            try {
                const now = Date.now();
                const key = hashText("read often");
                writeEmitCache(dir, key, "// live");
                _age(dir, key, 30 * DAY, now);

                assert.equal(readEmitCache(dir, key), "// live");
                assert.equal(pruneEmitCache(dir, now, 7 * DAY, 0), 0, "an entry read just now must not be pruned");
            } finally {
                _rm(dir);
            }
        });

        it("should sweep at most once per interval", () => {
            const dir = _tempDir("prune-throttle");
            try {
                const now = Date.now();
                const stale = hashText("stale one");
                writeEmitCache(dir, stale, "// stale");
                _age(dir, stale, 8 * DAY, now);

                assert.equal(pruneEmitCache(dir, now - 2 * DAY, 7 * DAY, DAY), 0, "first sweep: nothing old enough yet");
                assert.equal(pruneEmitCache(dir, now - 2 * DAY + 1000, 7 * DAY, DAY), -1, "a second sweep within the interval is skipped");
                assert.equal(pruneEmitCache(dir, now, 7 * DAY, DAY), 1, "after the interval it sweeps again");
            } finally {
                _rm(dir);
            }
        });

        it("should do nothing without a cache directory or an emit directory", () => {
            const dir = _tempDir("prune-empty");
            try {
                assert.equal(pruneEmitCache(null, Date.now(), 7 * DAY, 0), 0);
                assert.equal(pruneEmitCache(dir, Date.now(), 7 * DAY, 0), 0);
            } finally {
                _rm(dir);
            }
        });
    });

    describe("getCacheDir", () => {
        it("should use node_modules/.cache/tripwire when node_modules exists", () => {
            const dir = _tempDir("withnm");
            try {
                fs.mkdirSync(path.join(dir, "node_modules"), { recursive: true });
                resetCacheDirs();

                const cacheDir = getCacheDir(dir);

                assert.equal(cacheDir, path.join(dir, "node_modules", ".cache", "tripwire"));
                assert.isTrue(fs.existsSync(cacheDir), "the directory should have been created");
            } finally {
                resetCacheDirs();
                _rm(dir);
            }
        });

        it("should fall back outside the project when there is no node_modules", () => {
            const dir = _tempDir("nonm");
            try {
                resetCacheDirs();

                const cacheDir = getCacheDir(dir);

                assert.isString(cacheDir);
                assert.isTrue(cacheDir.indexOf(path.resolve(dir)) !== 0,
                    "nothing may be written into the project tree, where it could be committed or published");
            } finally {
                resetCacheDirs();
                _rm(dir);
            }
        });

        it("should give different projects different fallback directories", () => {
            const a = _tempDir("proj-a");
            const b = _tempDir("proj-b");
            try {
                resetCacheDirs();
                assert.notEqual(getCacheDir(a), getCacheDir(b));
            } finally {
                resetCacheDirs();
                _rm(a);
                _rm(b);
            }
        });
    });

    describe("buildInfoPath", () => {
        it("should be inside the cache directory, never beside the tsconfig", () => {
            const dir = _tempDir("buildinfo");
            try {
                const projectPath = path.join(dir, "tsconfig.json");
                const cacheDir = path.join(dir, "node_modules", ".cache", "tripwire");
                const infoPath = buildInfoPath(cacheDir, projectPath, "fp");

                assert.isString(infoPath);
                assert.isTrue(infoPath.indexOf(cacheDir) === 0, "the build info belongs in the cache directory");
                assert.notEqual(path.dirname(infoPath), path.dirname(projectPath),
                    "a .tsbuildinfo next to the tsconfig gets matched by include globs and published");
                assert.isTrue(/\.tsbuildinfo$/.test(infoPath));
            } finally {
                _rm(dir);
            }
        });

        it("should differ per project and per fingerprint", () => {
            const cacheDir = path.join(os.tmpdir(), "tripwire-cache-test");

            assert.notEqual(buildInfoPath(cacheDir, "/a/tsconfig.json", "fp"), buildInfoPath(cacheDir, "/b/tsconfig.json", "fp"));
            assert.notEqual(buildInfoPath(cacheDir, "/a/tsconfig.json", "fp1"), buildInfoPath(cacheDir, "/a/tsconfig.json", "fp2"));
        });

        it("should be null when there is no cache directory", () => {
            assert.isNull(buildInfoPath(null, "/a/tsconfig.json", "fp"));
        });
    });

    describe("hashFile", () => {
        it("should digest a file's content", () => {
            const dir = _tempDir("hashfile");
            try {
                const target = path.join(dir, "a.ts");
                fs.writeFileSync(target, "export const a = 1;", "utf8");

                assert.equal(hashFile(target), hashText("export const a = 1;"));
            } finally {
                _rm(dir);
            }
        });

        it("should return null for a file it cannot read", () => {
            assert.isNull(hashFile(path.join(os.tmpdir(), "tripwire-missing-" + Math.random() + ".ts")));
        });
    });

    describe("the program manifest", () => {
        let dir: string;
        let a: string;
        let b: string;
        let roots: string[];

        function _manifest(checked?: boolean) {
            return createProgramManifest("fp", roots, [ a, b ], lockSignatures(dir), !!checked);
        }

        beforeEach(() => {
            dir = _tempDir("manifest");
            a = path.join(dir, "a.ts");
            b = path.join(dir, "b.ts");
            fs.writeFileSync(a, "export const a = 1;", "utf8");
            fs.writeFileSync(b, "export const b = 2;", "utf8");
            roots = [ a ];
        });

        afterEach(() => {
            _rm(dir);
        });

        it("should validate against unchanged inputs", () => {
            assert.isTrue(checkProgramManifest(_manifest(), "fp", roots, lockSignatures(dir)).current);
        });

        it("should record every file it was given, not just the roots", () => {
            const manifest = _manifest();

            assert.equal(manifest.files.length, 2, "a dependency's contents change what a file compiles to");
        });

        it("should be invalidated by an edit to any recorded file", () => {
            const manifest = _manifest();
            fs.writeFileSync(b, "export const b = 3;", "utf8");

            assert.isFalse(checkProgramManifest(manifest, "fp", roots, lockSignatures(dir)).current,
                "b is not a root, but the program still used it");
        });

        it("should be invalidated by a deleted file", () => {
            const manifest = _manifest();
            fs.unlinkSync(b);

            assert.isFalse(checkProgramManifest(manifest, "fp", roots, lockSignatures(dir)).current);
        });

        it("should be invalidated by a different compiler or options", () => {
            assert.isFalse(checkProgramManifest(_manifest(), "other-fp", roots, lockSignatures(dir)).current);
        });

        it("should be invalidated when the roots change", () => {
            const manifest = _manifest();

            assert.isFalse(checkProgramManifest(manifest, "fp", [ a, b ], lockSignatures(dir)).current, "a file was added");
            assert.isFalse(checkProgramManifest(manifest, "fp", [], lockSignatures(dir)).current, "all files removed");
            assert.isFalse(checkProgramManifest(manifest, "fp", [ b ], lockSignatures(dir)).current, "a different file");
        });

        it("should be invalidated when an install changes how imports resolve", () => {
            const manifest = _manifest();
            const locks = lockSignatures(dir).concat([ [ "package-lock.json", "123:456" ] ]);

            assert.isFalse(checkProgramManifest(manifest, "fp", roots, locks).current);
        });

        it("should name the lock file whose install changed", () => {
            const recorded = createProgramManifest("fp", roots, roots, [ [ "package-lock.json", "1:1" ] ], true);

            const check = checkProgramManifest(recorded, "fp", roots, [ [ "package-lock.json", "2:2" ] ]);

            assert.isFalse(check.current);
            assert.equal(check.reason, "an install changed how imports resolve (package-lock.json)");
        });

        it("should reject a null or unrecognised manifest", () => {
            assert.isFalse(checkProgramManifest(null, "fp", roots, []).current);
            assert.isFalse(checkProgramManifest({ v: 99 } as any, "fp", roots, []).current);
        });

        it("should reject a manifest that recorded no files", () => {
            const manifest = createProgramManifest("fp", roots, [], [], true);

            assert.isFalse(checkProgramManifest(manifest, "fp", roots, []).current,
                "an empty record describes nothing and must never validate");
        });

        it("should give different inputs different signatures", () => {
            const first = _manifest().signature;
            fs.writeFileSync(b, "export const b = 3;", "utf8");

            assert.notEqual(first, _manifest().signature,
                "the signature keys the cached output, so it has to turn over when any input does");
        });

        it("should say why it was invalidated", () => {
            // The reason is printed by the CLI, so "the cache did not help" can be told apart from
            // "the cache is not working".
            const manifest = _manifest();

            assert.equal(checkProgramManifest(manifest, "fp", roots, lockSignatures(dir)).reason, "",
                "no reason when nothing changed");

            assert.isTrue(checkProgramManifest(null, "fp", roots, []).reason.indexOf("nothing cached") !== -1);
            assert.isTrue(checkProgramManifest(manifest, "other-fp", roots, lockSignatures(dir)).reason.indexOf("compiler") !== -1);
            assert.isTrue(checkProgramManifest(manifest, "fp", [ a, b ], lockSignatures(dir)).reason.indexOf("different set of files") !== -1);

            const locks = lockSignatures(dir).concat([ [ "package-lock.json", "1:2" ] ]);
            assert.isTrue(checkProgramManifest(manifest, "fp", roots, locks).reason.indexOf("install") !== -1);
        });

        it("should name the file that changed", () => {
            const manifest = _manifest();
            fs.writeFileSync(b, "export const b = 99;", "utf8");

            const result = checkProgramManifest(manifest, "fp", roots, lockSignatures(dir));

            assert.isFalse(result.current);
            assert.isTrue(result.reason.indexOf("b.ts") !== -1, "the reason should name the file: " + result.reason);
            assert.isTrue(result.reason.indexOf("changed") !== -1);
        });

        it("should round-trip through the cache directory", () => {
            const manifest = _manifest(true);
            const projectPath = path.join(dir, "tsconfig.json");

            assert.isNull(readProgramManifest(dir, projectPath, "fp"), "nothing stored yet");

            writeProgramManifest(dir, projectPath, manifest);
            const loaded = readProgramManifest(dir, projectPath, "fp");

            assert.isDefined(loaded);
            assert.equal(loaded.signature, manifest.signature);
            assert.isTrue(loaded.checked);
            assert.isTrue(checkProgramManifest(loaded, "fp", roots, lockSignatures(dir)).current);
        });

        it("should keep manifests for different projects and fingerprints apart", () => {
            const manifest = _manifest();

            writeProgramManifest(dir, path.join(dir, "tsconfig.json"), manifest);

            assert.isNull(readProgramManifest(dir, path.join(dir, "other.json"), "fp"), "a different project");
            assert.isNull(readProgramManifest(dir, path.join(dir, "tsconfig.json"), "other-fp"), "different options");
        });

        it("should record whether the run type-checked cleanly", () => {
            assert.isFalse(_manifest(false).checked, "a transpile-only run proves nothing about types");
            assert.isTrue(_manifest(true).checked);
        });

        it("should treat a corrupt manifest as absent", () => {
            const projectPath = path.join(dir, "tsconfig.json");
            writeProgramManifest(dir, projectPath, _manifest());

            const stored = path.join(dir, "program", fs.readdirSync(path.join(dir, "program"))[0]);
            fs.writeFileSync(stored, "{not json", "utf8");

            assert.isNull(readProgramManifest(dir, projectPath, "fp"));
        });

        it("should ignore a write with no cache directory", () => {
            writeProgramManifest(null, path.join(dir, "tsconfig.json"), _manifest());
            assert.isNull(readProgramManifest(null, path.join(dir, "tsconfig.json"), "fp"));
        });
    });

    describe("lockSignatures", () => {
        it("should sign the resolution-determining files that exist", () => {
            const dir = _tempDir("locks");
            try {
                assert.deepEqual(lockSignatures(dir), [], "nothing to sign in an empty directory");

                fs.writeFileSync(path.join(dir, "package.json"), "{}", "utf8");
                const signed = lockSignatures(dir);

                assert.equal(signed.length, 1);
                assert.equal(signed[0][0], "package.json");
                assert.isString(signed[0][1]);
            } finally {
                _rm(dir);
            }
        });

        it("should change when a lock file changes", (done) => {
            const dir = _tempDir("lockchange");
            const lock = path.join(dir, "package-lock.json");
            fs.writeFileSync(lock, "{}", "utf8");
            const before = lockSignatures(dir);

            // Size is part of the signature, so a differently sized file is enough -- no need to
            // depend on the filesystem's modified-time resolution.
            setTimeout(() => {
                try {
                    fs.writeFileSync(lock, "{ \"lockfileVersion\": 3 }", "utf8");
                    assert.notEqual(JSON.stringify(lockSignatures(dir)), JSON.stringify(before));
                    done();
                } catch (e) {
                    done(e as any);
                } finally {
                    _rm(dir);
                }
            }, 10);
        });
    });
});
