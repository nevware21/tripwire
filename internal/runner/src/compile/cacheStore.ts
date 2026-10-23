/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { objHasOwnProperty } from "@nevware21/ts-utils";

/**
 * The directory name created under `node_modules/.cache` (the convention shared by babel, eslint,
 * jest and friends) for everything this runner persists between runs.
 */
const _CACHE_DIR_NAME = "tripwire";

/**
 * Bumped whenever the meaning of a cache entry changes in a way the fingerprint below cannot
 * describe -- an emit-shape change in this file, say. Old entries are then simply never looked up
 * again rather than having to be found and deleted.
 */
const _CACHE_VERSION = "v1";

let _cacheDirs: { [cwd: string]: string | null } = {};

function _mkDir(dir: string): boolean {
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.mkdirSync(dir, { recursive: true });

        return true;
    } catch (e) {
        return false;
    }
}

/**
 * The directory persistent compile state is written to, or `null` when nowhere writable was found.
 *
 * `node_modules/.cache/tripwire` is preferred and is deliberately *inside* `node_modules`: npm never
 * publishes that directory, so nothing written here can leak into a published package the way a
 * `.tsbuildinfo` dropped next to the tsconfig can. When there is no `node_modules` to write into (a
 * project run straight out of a checkout, or a read-only install) a per-user temp directory is used
 * instead, keyed by the project location so two projects cannot collide.
 *
 * Nothing here is required for correctness -- every caller treats a `null` directory, an unreadable
 * entry and a failed write as a plain cache miss.
 *
 * @param cwd - The directory the run was started from.
 * @returns The cache directory, or `null` when no writable location could be prepared.
 */
export function getCacheDir(cwd: string): string | null {
    const resolvedCwd = path.resolve(cwd);
    if (objHasOwnProperty(_cacheDirs, resolvedCwd)) {
        return _cacheDirs[resolvedCwd];
    }

    let result: string | null = null;
    const nodeModules = path.join(resolvedCwd, "node_modules");

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(nodeModules)) {
        const candidate = path.join(nodeModules, ".cache", _CACHE_DIR_NAME);
        if (_mkDir(candidate)) {
            result = candidate;
        }
    }

    if (!result) {
        const candidate = path.join(os.tmpdir(), _CACHE_DIR_NAME + "-" + hashText(resolvedCwd).substring(0, 16));
        if (_mkDir(candidate)) {
            result = candidate;
        }
    }

    _cacheDirs[resolvedCwd] = result;

    return result;
}

/**
 * Forgets the resolved cache directories, so the next {@link getCacheDir} re-probes the filesystem.
 * Only needed by the tests, which create and remove directories underneath a live process.
 */
export function resetCacheDirs(): void {
    _cacheDirs = {};
}

/**
 * A stable hex digest of `text`. sha256 rather than something faster because a collision here means
 * executing the wrong JavaScript, which is not a failure mode worth trading for a few microseconds.
 *
 * @param text - The text to digest.
 * @returns The hex digest.
 */
export function hashText(text: string): string {
    return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * The set of compiler options that change emitted output, reduced to a stable string.
 *
 * Every option is included (sorted, so key order in the tsconfig cannot change the result) rather
 * than an allow-list of the ones known to matter: a new TypeScript release adding an option that
 * affects emit would silently invalidate an allow-list, and the cost of being wrong is stale
 * JavaScript being executed. `ts.version` is folded in for the same reason -- the same options
 * under a different compiler can emit different code.
 *
 * @param tsVersion - The version of the TypeScript compiler doing the emit.
 * @param compilerOptions - The options the emit will use.
 * @returns A digest identifying this compiler and option set.
 */
export function optionsFingerprint(tsVersion: string, compilerOptions: any): string {
    const options = compilerOptions || {};
    const keys = Object.keys(options).sort();
    const parts: string[] = ["ts:" + (tsVersion || "unknown"), "cache:" + _CACHE_VERSION];

    for (let lp = 0; lp < keys.length; lp++) {
        const key = keys[lp];
        const value = options[key];
        let text: string;
        try {
            text = JSON.stringify(value);
        } catch (e) {
            // A circular or otherwise unserialisable value: treat it as "unknown", which can only
            // ever cause a miss, never a bad hit.
            text = "?";
        }

        parts.push(key + "=" + (text === undefined ? "undefined" : text));
    }

    return hashText(parts.join("\n"));
}

function _entryPath(cacheDir: string, key: string): string {
    // Two levels of fan-out so a large project does not end up with tens of thousands of entries in
    // a single directory.
    return path.join(cacheDir, "emit", key.substring(0, 2), key.substring(2) + ".js");
}

/**
 * Reads a previously cached emit result.
 *
 * @param cacheDir - The directory from {@link getCacheDir}, or `null` to disable the cache.
 * @param key - The entry key, from {@link emitCacheKey}.
 * @returns The cached JavaScript, or `null` for a miss. A missing, unreadable or truncated entry is
 * a miss: nothing here is allowed to fail a run.
 */
export function readEmitCache(cacheDir: string | null, key: string): string | null {
    if (!cacheDir || !key) {
        return null;
    }

    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const text = fs.readFileSync(_entryPath(cacheDir, key), "utf8");

        // Entries are written with a trailing marker (see writeEmitCache) so that a write
        // interrupted part way through -- a killed process, a full disk -- reads back as a miss
        // rather than as valid but truncated JavaScript.
        const markerAt = text.lastIndexOf(_ENTRY_MARKER);
        if (markerAt === -1 || markerAt !== text.length - _ENTRY_MARKER.length) {
            return null;
        }

        _touch(_entryPath(cacheDir, key));

        return text.substring(0, markerAt);
    } catch (e) {
        return null;
    }
}

const _ENTRY_MARKER = "\n//# tripwireEmitCacheComplete\n";

/**
 * How long an emit entry survives without being read before {@link pruneEmitCache} removes it, and
 * how often that sweep runs at most. A week covers a project nobody ran over a long weekend; a day
 * between sweeps keeps the directory walk off the common path.
 */
const _PRUNE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const _PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const _PRUNE_STAMP = "last-prune";

/**
 * Marks an entry as read now. Entries are keyed by content, so a live one is never rewritten --
 * without this its modification time would be the moment it was first created, and
 * {@link pruneEmitCache} could not tell a file read on every run from one orphaned by an edit.
 */
function _touch(target: string): void {
    try {
        const now = new Date();
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.utimesSync(target, now, now);
    } catch (e) {
        // Read-only, or racing with a removal: the entry just looks older than it is.
    }
}

/**
 * Removes emit entries nothing has read for {@link _PRUNE_MAX_AGE_MS}, at most once per
 * {@link _PRUNE_INTERVAL_MS} per cache directory.
 *
 * Whole-program entries are keyed by the signature of every input the program had, so a single
 * edit orphans the complete emit set of the previous run and nothing ever refers to it again;
 * isolated entries are orphaned one at a time as files change. Neither kind can be enumerated from
 * a manifest, and several projects and modes share one directory, so entries are judged by when
 * they were last read (see {@link _touch}) rather than by what currently refers to them. Deleting
 * a live entry is only a miss, so the sweep errs towards deleting.
 *
 * @param cacheDir - The directory from {@link getCacheDir}, or `null` to do nothing.
 * @param now - The current time, overridable by tests.
 * @param maxAgeMs - Entries not read within this many milliseconds are removed.
 * @param intervalMs - Minimum time between two sweeps of the same directory; `0` always sweeps.
 * @returns The number of entries removed, or `-1` when the sweep was skipped as too recent.
 * @since 0.2.0
 */
export function pruneEmitCache(cacheDir: string | null, now?: number, maxAgeMs?: number, intervalMs?: number): number {
    if (!cacheDir) {
        return 0;
    }

    const theNow = now === undefined ? Date.now() : now;
    const theMaxAge = maxAgeMs === undefined ? _PRUNE_MAX_AGE_MS : maxAgeMs;
    const theInterval = intervalMs === undefined ? _PRUNE_INTERVAL_MS : intervalMs;
    const stampPath = path.join(cacheDir, _PRUNE_STAMP);

    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const stamp = fs.statSync(stampPath);
        if (theInterval > 0 && theNow - stamp.mtimeMs < theInterval) {
            return -1;
        }
    } catch (e) {
        // No stamp yet: first sweep for this directory.
    }

    let removed = 0;
    const emitDir = path.join(cacheDir, "emit");
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const buckets = fs.readdirSync(emitDir);
        for (let bp = 0; bp < buckets.length; bp++) {
            const bucket = path.join(emitDir, buckets[bp]);
            let entries: string[];
            try {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                entries = fs.readdirSync(bucket);
            } catch (e) {
                continue;
            }

            for (let ep = 0; ep < entries.length; ep++) {
                const entry = path.join(bucket, entries[ep]);
                try {
                    // eslint-disable-next-line security/detect-non-literal-fs-filename
                    const stat = fs.statSync(entry);
                    // A leftover temporary from an interrupted write is judged the same way.
                    if (stat.isFile() && theNow - stat.mtimeMs > theMaxAge) {
                        // eslint-disable-next-line security/detect-non-literal-fs-filename
                        fs.unlinkSync(entry);
                        removed++;
                    }
                } catch (e) {
                    // Gone already, or unreadable: either way there is nothing to remove.
                }
            }

            try {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                if (!fs.readdirSync(bucket).length) {
                    // eslint-disable-next-line security/detect-non-literal-fs-filename
                    fs.rmdirSync(bucket);
                }
            } catch (e) {
                // An empty bucket that would not go is harmless.
            }
        }
    } catch (e) {
        // No emit directory yet, or it cannot be read: nothing to prune.
    }

    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(stampPath, String(theNow), "utf8");
        const stampTime = new Date(theNow);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.utimesSync(stampPath, stampTime, stampTime);
    } catch (e) {
        // The next run sweeps again; that is the only consequence.
    }

    return removed;
}

/**
 * Stores an emit result for a later run. Failures (no writable directory, a full disk, a race with
 * another process) are ignored -- the only consequence is a miss next time.
 *
 * @param cacheDir - The directory from {@link getCacheDir}, or `null` to disable the cache.
 * @param key - The entry key, from {@link emitCacheKey}.
 * @param text - The emitted JavaScript to store.
 */
export function writeEmitCache(cacheDir: string | null, key: string, text: string): void {
    if (!cacheDir || !key || text === null || text === undefined) {
        return;
    }

    const target = _entryPath(cacheDir, key);

    try {
        if (!_mkDir(path.dirname(target))) {
            return;
        }

        // Written to a unique temporary name and renamed into place, so a reader in another process
        // sees either the previous entry or the complete new one, never a half-written file.
        const temp = target + "." + process.pid + "." + Math.random().toString(36).substring(2) + ".tmp";
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(temp, text + _ENTRY_MARKER, "utf8");

        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            fs.renameSync(temp, target);
        } catch (e) {
            try {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                fs.unlinkSync(temp);
            } catch (e2) {
                // Nothing left to do -- a stray temporary file is harmless.
            }
        }
    } catch (e) {
        // Caching is an optimisation; a run must never fail because of it.
    }
}

/**
 * The key identifying one emitted file: which file it is, its own content, and the compiler and
 * options that produced the output.
 *
 * The file name has to be part of the key because the emit is not a pure function of the source
 * text: the hook forces `inlineSourceMap`/`inlineSources`, and the inline map names the file it
 * came from, so the same text at `foo.ts` and at `bar.ts` produces genuinely different output.
 * Leaving the name out let two identical-text files -- an empty `export {}`, a re-export barrel, a
 * fixture skeleton -- share one entry, and the second file then reported the first one's name in
 * every source-mapped stack frame and every coverage record. `foo.ts` and `foo.tsx` were conflated
 * the same way.
 *
 * The whole path is folded in rather than just the base name: what a map's `sources` entry ends up
 * containing depends on the emit options, and a cache that lives inside the project's own
 * `node_modules` has nothing to gain from being portable to a different directory.
 *
 * What the key still cannot describe is a whole-program emit's dependence on *other* files (a
 * `const enum` member, most obviously), so callers must combine `fingerprint` with a program
 * signature before caching one -- see `_programEmitKey` in tsCompile.ts.
 *
 * @param fileName - The file's normalized path.
 * @param source - The TypeScript source text.
 * @param fingerprint - The compiler/options digest from {@link optionsFingerprint}.
 * @returns The entry key.
 */
export function emitCacheKey(fileName: string, source: string, fingerprint: string): string {
    return hashText(fingerprint + "\n" + fileName + "\n" + source);
}

/**
 * What a previous run recorded about the TypeScript program it built, so that a later run can tell
 * -- without building one -- whether it would build exactly the same program again.
 * @since 0.2.0
 */
export interface IProgramManifest {
    /**
     * Manifest format version.
     */
    v: number;

    /**
     * The compiler and options digest the program was built with.
     */
    fingerprint: string;

    /**
     * The root file names the program was created from, in order.
     */
    roots: string[];

    /**
     * Whether that run type-checked the program and it came back clean. Only then may a later run
     * skip checking; a failing check is never recorded, so the failure is reproduced every time.
     */
    checked: boolean;

    /**
     * Every source file the program actually used -- project files, dependency `.d.ts` files and the
     * compiler's own libs -- with a digest of its content.
     */
    files: string[][];

    /**
     * Signatures of the files that decide *which* modules resolve, rather than what is in them.
     */
    locks: string[][];

    /**
     * A digest over everything above. Doubles as the identity of this exact set of inputs, which is
     * what emitted output produced from the program is keyed by.
     */
    signature: string;
}

/**
 * Digest of one file's content, or `null` when it cannot be read.
 */
export function hashFile(filePath: string): string | null {
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return hashText(fs.readFileSync(filePath, "utf8"));
    } catch (e) {
        return null;
    }
}

/**
 * The files that determine which module a given import resolves to, rather than what that module
 * contains. An install can change resolution without touching any file already in the program --
 * a newly added package shadowing one further up the tree -- which is the one input a content
 * digest of the program's own files cannot see, so these are signed alongside it.
 */
const _LOCK_FILES = [
    "package.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "node_modules/.package-lock.json",
    "node_modules/.yarn-integrity",
    "node_modules/.modules.yaml"
];

/**
 * Signs the resolution-determining files under `cwd`. Size and modified time rather than content:
 * a lock file can be megabytes, and this only has to notice that an install happened.
 *
 * @param cwd - The directory the run was started from.
 * @returns One `[path, signature]` pair per file that exists.
 */
export function lockSignatures(cwd: string): string[][] {
    const result: string[][] = [];

    for (let lp = 0; lp < _LOCK_FILES.length; lp++) {
        const target = path.join(path.resolve(cwd), _LOCK_FILES[lp]);
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const stat = fs.statSync(target);
            result.push([ _LOCK_FILES[lp], stat.size + ":" + stat.mtimeMs ]);
        } catch (e) {
            // Not present in this project; nothing to sign.
        }
    }

    return result;
}

/**
 * Builds the manifest describing a program that has just been created.
 *
 * @param fingerprint - The compiler/options digest from {@link optionsFingerprint}.
 * @param roots - The root file names the program was created from.
 * @param sourceFiles - Every file the program used, as absolute paths.
 * @param locks - The signatures from {@link lockSignatures}.
 * @param checked - Whether the program was type-checked and came back clean.
 * @returns The manifest, ready for {@link writeProgramManifest}.
 */
export function createProgramManifest(fingerprint: string, roots: string[], sourceFiles: string[], locks: string[][], checked: boolean): IProgramManifest {
    const files: string[][] = [];
    const parts: string[] = [ fingerprint, roots.join("\n") ];

    for (let lp = 0; lp < sourceFiles.length; lp++) {
        const digest = hashFile(sourceFiles[lp]);
        if (digest) {
            files.push([ sourceFiles[lp], digest ]);
            parts.push(sourceFiles[lp] + "=" + digest);
        }
    }

    for (let lp = 0; lp < locks.length; lp++) {
        parts.push(locks[lp][0] + "=" + locks[lp][1]);
    }

    return {
        v: 1,
        fingerprint: fingerprint,
        roots: roots.slice(0),
        checked: checked,
        files: files,
        locks: locks,
        signature: hashText(parts.join("\n"))
    };
}

/**
 * The outcome of checking a manifest, and -- when it did not hold -- what stopped it.
 * @since 0.2.0
 */
export interface IManifestCheck {
    /**
     * Whether a program built now would be identical to the one the manifest describes.
     */
    current: boolean;

    /**
     * Why not, in a form fit to print. Empty when {@link current} is `true`.
     */
    reason: string;
}

/**
 * Whether the program a manifest describes would still be built identically now: same compiler and
 * options, same roots, same resolution-determining files, and every recorded input byte-for-byte
 * unchanged.
 *
 * When this holds, a program built now would have the same source files and therefore emit the same
 * output and report the same diagnostics -- which is what lets a run reuse cached output, and skip a
 * check the manifest records as having passed.
 *
 * The reason for a mismatch is reported rather than just the verdict, because "the cache did not
 * help" is otherwise indistinguishable from "the cache is not working", and one of those is worth
 * investigating.
 *
 * @param manifest - The manifest from a previous run, or `null`.
 * @param fingerprint - This run's compiler/options digest.
 * @param roots - This run's root file names.
 * @param locks - This run's lock signatures.
 * @returns The verdict, and the first thing found to differ.
 */
export function checkProgramManifest(manifest: IProgramManifest | null, fingerprint: string, roots: string[], locks: string[][]): IManifestCheck {
    function _no(reason: string): IManifestCheck {
        return { current: false, reason: reason };
    }

    if (!manifest || manifest.v !== 1) {
        return _no("nothing cached for this project yet");
    }

    if (manifest.fingerprint !== fingerprint) {
        return _no("the compiler version or its options changed");
    }

    if (!manifest.roots || manifest.roots.length !== roots.length) {
        return _no("the project resolves to a different set of files");
    }

    for (let lp = 0; lp < roots.length; lp++) {
        if (manifest.roots[lp] !== roots[lp]) {
            return _no("the project resolves to a different set of files");
        }
    }

    const recordedLocks = manifest.locks || [];
    if (recordedLocks.length !== locks.length) {
        return _no("an install changed how imports resolve");
    }

    for (let lp = 0; lp < locks.length; lp++) {
        if (recordedLocks[lp][0] !== locks[lp][0] || recordedLocks[lp][1] !== locks[lp][1]) {
            return _no("an install changed how imports resolve (" + locks[lp][0] + ")");
        }
    }

    const files = manifest.files || [];
    if (!files.length) {
        return _no("nothing cached for this project yet");
    }

    for (let lp = 0; lp < files.length; lp++) {
        if (hashFile(files[lp][0]) !== files[lp][1]) {
            return _no(files[lp][0] + " changed");
        }
    }

    return { current: true, reason: "" };
}

function _manifestPath(cacheDir: string, projectPath: string, fingerprint: string): string {
    const key = hashText(path.resolve(projectPath).replace(/\\/g, "/") + "\n" + fingerprint).substring(0, 32);

    return path.join(cacheDir, "program", key + ".json");
}

/**
 * Reads the manifest a previous run left for this project, or `null` when there is none (or it
 * cannot be read or parsed, which is treated the same way).
 */
export function readProgramManifest(cacheDir: string | null, projectPath: string, fingerprint: string): IProgramManifest | null {
    if (!cacheDir) {
        return null;
    }

    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const text = fs.readFileSync(_manifestPath(cacheDir, projectPath, fingerprint), "utf8");
        const manifest = JSON.parse(text);

        return manifest && manifest.v === 1 ? manifest : null;
    } catch (e) {
        return null;
    }
}

/**
 * Stores the manifest for a later run. Failures are ignored: the only consequence is that the next
 * run rebuilds and re-checks, exactly as it would have without any cache.
 */
export function writeProgramManifest(cacheDir: string | null, projectPath: string, manifest: IProgramManifest): void {
    if (!cacheDir || !manifest) {
        return;
    }

    const target = _manifestPath(cacheDir, projectPath, manifest.fingerprint);

    try {
        if (!_mkDir(path.dirname(target))) {
            return;
        }

        const temp = target + "." + process.pid + "." + Math.random().toString(36).substring(2) + ".tmp";
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(temp, JSON.stringify(manifest), "utf8");

        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            fs.renameSync(temp, target);
        } catch (e) {
            try {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                fs.unlinkSync(temp);
            } catch (e2) {
                // Nothing left to do.
            }
        }
    } catch (e) {
        // Caching is an optimisation; a run must never fail because of it.
    }
}

/**
 * The path of the `.tsbuildinfo` for a project, inside the cache directory.
 *
 * Kept out of the project tree on purpose: TypeScript's own default puts the file next to the
 * tsconfig, where it is picked up by `files`/`include` globs, committed by accident and published
 * with the package. The options fingerprint is part of the name so that two runs of the same project
 * under different settings (a type-checked run and a `--target browser` graph build, say) keep
 * separate state instead of repeatedly invalidating each other's.
 *
 * @param cacheDir - The directory from {@link getCacheDir}, or `null` when unavailable.
 * @param projectPath - The absolute path of the tsconfig.
 * @param fingerprint - The compiler/options digest from {@link optionsFingerprint}.
 * @returns The build info path, or `null` when there is nowhere to write it.
 */
export function buildInfoPath(cacheDir: string | null, projectPath: string, fingerprint: string): string | null {
    if (!cacheDir) {
        return null;
    }

    const key = hashText(path.resolve(projectPath).replace(/\\/g, "/") + "\n" + fingerprint).substring(0, 32);

    return path.join(cacheDir, "tsbuildinfo", key + ".tsbuildinfo");
}
