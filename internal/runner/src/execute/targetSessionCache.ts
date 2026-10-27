/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as fs from "fs";
import * as path from "path";
import { IBrowserWorkerModuleGraph } from "./browser";

export type InteractiveTarget = "browser" | "worker";

/**
 * Callbacks the cache uses to (re)build a target's session on demand -- kept generic over the
 * assembled session shape (`TSession`) so this module doesn't need to know about HTML/payload/
 * moduleAssets internals, just how to ask for a fresh one.
 */
export interface ITargetSessionBuilders<TSession> {
    /**
     * Resolves the current on-disk entry file list for `target`. Cheap (glob match only, no
     * transpilation) -- called on every staleness check, not just on an actual rebuild, so new/
     * removed entry files are always detected even when nothing else changed.
     */
    resolveEntryFiles(target: InteractiveTarget): string[];

    /**
     * Builds the (potentially expensive) module graph for `target` from its resolved entry
     * files. Only called when a rebuild is actually needed.
     */
    buildGraph(target: InteractiveTarget, entryFiles: string[]): IBrowserWorkerModuleGraph;

    /**
     * Assembles the full servable session (instrumented modules, bundle/registry assets,
     * payload, HTML, frame HTML, ...) from a freshly-built graph.
     */
    assemble(target: InteractiveTarget, graph: IBrowserWorkerModuleGraph): TSession;
}

/**
 * Options controlling `_createTargetSessionCache`'s optional background pre-warming.
 */
export interface ITargetSessionCacheOptions {
    /**
     * Whether to watch each built target's files in the background and pre-warm a rebuild
     * before the next request/poll arrives. Should only be true for long-lived interactive
     * sessions (`--browser-launch open`/`manual`) -- a one-shot Puppeteer run's cache is
     * discarded right after its single run regardless, so watching it would just leak open
     * `fs.watch()` handles that keep the process alive indefinitely after teardown.
     */
    watch: boolean;
}

/**
 * The spelling of `filePath` to watch it by: absolute, with the platform's separators, every 8.3
 * short name expanded and any link resolved -- the file system's own name for it. On Windows the
 * libuv in Node 24 aborts the whole process (an assertion in src/win/fs-event.c) when a change is
 * reported under a watched directory spelled any other way, as with forward slashes (the browser
 * and worker module graph's ids) or a short name (a temp folder such as C:\Users\BUILDA~1\...).
 * A file that no longer exists keeps its own name, in its resolved directory if that still exists.
 */
export function _watchPath(filePath: string): string {
    const resolved = path.resolve(filePath);

    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        return fs.realpathSync.native(resolved);
    } catch (e) {
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            return path.join(fs.realpathSync.native(path.dirname(resolved)), path.basename(resolved));
        } catch (e2) {
            return resolved;
        }
    }
}

/**
 * Watches `filePaths` for changes and calls `onChange` (debounced ~200ms, so a single save
 * that fires multiple fs events only triggers one call) until `close()` is called. Watches each
 * file's *containing directory* (non-recursively) rather than the file handle directly, and
 * filters events by filename -- this survives editors' common atomic-save pattern (write a temp
 * file, rename over the original), which can silently kill a direct file watch on some OS/
 * editor combinations, and avoids relying on `recursive: true` (inconsistently supported across
 * platforms). Feature-detected: if `fs.watch` throws (unsupported/unreliable on this Node
 * version/OS combination), this silently becomes a no-op rather than half-applying itself --
 * callers that also have an on-request fallback (see `_createTargetSessionCache`) stay fully
 * correct either way; callers that don't (the `--watch` CLI rerun loop) simply never get called.
 */
export function watchFiles(filePaths: string[], onChange: () => void): { close(): void } {
    const watchers: fs.FSWatcher[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function close() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }

        watchers.forEach((watcher) => {
            try {
                watcher.close();
            } catch (e) {
                // Already closed/never opened successfully -- nothing to do.
            }
        });
        watchers.length = 0;
    }

    function scheduleChange() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            onChange();
        }, 200);
    }

    const filesByDir: Record<string, string[]> = {};
    filePaths.forEach((filePath) => {
        const watched = _watchPath(filePath);
        const dir = path.dirname(watched);
        (filesByDir[dir] = filesByDir[dir] || []).push(path.basename(watched));
    });

    try {
        Object.keys(filesByDir).forEach((dir) => {
            const names = filesByDir[dir];
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            const watcher = fs.watch(dir, (_eventType, filename) => {
                if (filename && names.indexOf(filename) !== -1) {
                    scheduleChange();
                }
            });
            watcher.on("error", () => {
                // Best-effort only -- a watcher erroring after setup just means this directory
                // silently stops being watched; callers with an on-request fallback still work.
            });
            watchers.push(watcher);
        });
    } catch (e) {
        // fs.watch unsupported/unreliable on this Node version/OS combination -- disable
        // entirely rather than half-apply it.
        close();
    }

    return { close };
}

interface ICacheEntry<TSession> {
    session: TSession;
    generation: number;
    fingerprint: Record<string, number>;
    entryFilesKey: string;
    watcher: { close(): void } | null;
}

function _entryFilesKey(files: string[]): string {
    return files.slice().sort().join("\n");
}

/**
 * Records `{ realFilePath: mtimeMs }` for every module id in `graph` that maps to a real,
 * statable on-disk file -- virtual ids (eg. the os-shim, `/__tripwire__/...`) are skipped since
 * they have no filesystem presence to go stale.
 */
function _computeFingerprint(graph: IBrowserWorkerModuleGraph): Record<string, number> {
    const fingerprint: Record<string, number> = {};

    Object.keys(graph.modules).forEach((moduleId) => {
        if (moduleId.indexOf("/__tripwire__/") === 0) {
            return;
        }

        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            fingerprint[moduleId] = fs.statSync(moduleId).mtimeMs;
        } catch (e) {
            // Not a real file (eg. a synthetic/virtual id this graph didn't mark as such) --
            // nothing to fingerprint, safe to skip.
        }
    });

    return fingerprint;
}

/**
 * Creates a per-target ("browser"/"worker") lazy build cache: the first request for a target
 * builds and caches its session; later requests reuse the cache as long as nothing in its
 * fingerprint has changed, and transparently rebuild when it has. When `options.watch` is true,
 * also owns a best-effort background file-watcher (see `watchFiles` above) that pre-warms a
 * rebuild before the next request/poll arrives -- purely additive: correctness never depends on
 * watching actually working, or being enabled at all.
 */
export function _createTargetSessionCache<TSession>(builders: ITargetSessionBuilders<TSession>, options: ITargetSessionCacheOptions) {
    const cache: Partial<Record<InteractiveTarget, ICacheEntry<TSession>>> = {};

    function _isFresh(entry: ICacheEntry<TSession>, target: InteractiveTarget): boolean {
        const currentEntryFiles = builders.resolveEntryFiles(target);
        if (_entryFilesKey(currentEntryFiles) !== entry.entryFilesKey) {
            return false;
        }

        const paths = Object.keys(entry.fingerprint);
        for (let lp = 0; lp < paths.length; lp++) {
            const filePath = paths[lp];
            try {
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                if (fs.statSync(filePath).mtimeMs !== entry.fingerprint[filePath]) {
                    return false;
                }
            } catch (e) {
                // File no longer exists.
                return false;
            }
        }

        return true;
    }

    function _disposeEntry(entry: ICacheEntry<TSession> | undefined) {
        if (entry && entry.watcher) {
            entry.watcher.close();
            entry.watcher = null;
        }
    }

    let _generation = 0;

    function _build(target: InteractiveTarget): ICacheEntry<TSession> {
        const previous = cache[target];

        const entryFiles = builders.resolveEntryFiles(target);
        const graph = builders.buildGraph(target, entryFiles);
        const session = builders.assemble(target, graph);

        // Only dispose the previous entry's watcher once the rebuild above has actually
        // succeeded -- if buildGraph()/assemble() throws (eg. a syntax error in a test file),
        // the previous entry (and its watcher) is left fully intact and still serving, so
        // background pre-warming for this target doesn't silently die until the next successful
        // rebuild.
        _disposeEntry(previous);

        const entry: ICacheEntry<TSession> = {
            session,
            generation: ++_generation,
            fingerprint: _computeFingerprint(graph),
            entryFilesKey: _entryFilesKey(entryFiles),
            watcher: null
        };

        cache[target] = entry;

        if (options.watch) {
            entry.watcher = watchFiles(Object.keys(entry.fingerprint), () => {
                // Only pre-warm if the cache still considers this the live entry for the
                // target -- if it's already been superseded (eg. an on-request rebuild beat
                // this debounced callback to it), there's nothing left to pre-warm. Also skip
                // if the entry is still fresh: a single save can surface as more than one raw
                // fs.watch notification more than 200ms apart (eg. Windows reporting a file's
                // data write and its metadata/mtime update as separate events), each of which
                // survives the debounce in watchFiles() on its own -- without this check every
                // one of those would trigger its own full, independently-logged rebuild for a
                // change already picked up by an earlier one.
                if (cache[target] === entry && !_isFresh(entry, target)) {
                    _build(target);
                }
            });
        }

        return entry;
    }

    return {
        /**
         * Returns the current session for `target`, checking staleness and rebuilding if
         * missing or stale. This is the only entry point that re-checks freshness -- call it
         * for the top-level page request only (`/browser`/`/worker`); everything served as
         * part of that same page load (payload, module assets, test-frame) should use `peek()`
         * instead so one page load stays internally consistent even if a rebuild happens to
         * land in between.
         */
        get(target: InteractiveTarget): TSession {
            const entry = cache[target];
            if (entry && _isFresh(entry, target)) {
                return entry.session;
            }

            return _build(target).session;
        },

        /**
         * Returns whatever is currently cached for `target` without re-checking staleness --
         * only builds if `target` has genuinely never been built before (which shouldn't
         * happen in the normal flow, since the top-level page request always builds first, but
         * is handled defensively rather than assumed).
         */
        peek(target: InteractiveTarget): TSession {
            const entry = cache[target];
            if (entry) {
                return entry.session;
            }

            return _build(target).session;
        },

        /**
         * Returns whatever is currently cached for `target`, or `undefined` if it's never been
         * built -- unlike `peek()`, never triggers a build. For callers that only want to use a
         * target's session *if it happens to already exist* (eg. merging asset registries across
         * both targets so either can be requested from either page) without forcing an unvisited
         * target to be built just to find out it has nothing to contribute.
         */
        tryPeek(target: InteractiveTarget): TSession | undefined {
            const entry = cache[target];
            return entry ? entry.session : undefined;
        },

        /**
         * The build generation currently cached for `target`, or 0 if it's never been built.
         * Monotonically increasing across both on-request and watch-triggered rebuilds --
         * callers (the `/check-fresh` poll endpoint) compare this against whatever generation
         * the client last observed to decide whether to auto-reload.
         */
        getGeneration(target: InteractiveTarget): number {
            const entry = cache[target];
            return entry ? entry.generation : 0;
        },

        /**
         * The real on-disk files behind `target`'s currently cached build (the same fingerprint
         * this cache itself already tracks for staleness detection), or an empty array if it's
         * never been built. For a caller that needs to watch a *live* session's files from the
         * outside -- eg. puppeteer.ts's `--watch` loop, which re-visits a long-lived session
         * rather than owning a fresh one-shot build of its own -- so it knows what to wait on for
         * the *next* iteration once this one's build is known.
         */
        getWatchFiles(target: InteractiveTarget): string[] {
            const entry = cache[target];
            return entry ? Object.keys(entry.fingerprint) : [];
        },

        /**
         * Closes any background watchers for every cached target. Must be called before the
         * process is expected to exit on its own -- an open `fs.watch()` handle keeps Node's
         * event loop alive indefinitely, which is exactly what caused an interactive session to
         * never terminate before this was wired into teardown.
         */
        dispose(): void {
            (Object.keys(cache) as InteractiveTarget[]).forEach((target) => {
                _disposeEntry(cache[target]);
            });
        }
    };
}
