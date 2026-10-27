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
import { spawnSync } from "child_process";
import { assert } from "@nevware21/tripwire";
import { _createTargetSessionCache, _watchPath, InteractiveTarget, watchFiles } from "../../../src/execute/targetSessionCache";

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check: () => boolean, timeoutMs: number = 5000): Promise<boolean> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
        if (check()) {
            return true;
        }

        await delay(25);
    }

    return check();
}

/**
 * The interactive browser and worker runner keeps one built module graph per target, rebuilding it only
 * when the entry files or a module file changes, and optionally watching those files.
 */
describe("execute targetSessionCache", function () {
    // The watch cases wait on real file system notifications
    this.timeout(30000);

    let scratch: string;
    let disposers: Array<() => void> = [];

    function write(name: string, text: string): string {
        const file = path.join(scratch, name);
        fs.writeFileSync(file, text, "utf8");

        return file;
    }

    // Moves a file's modified time, so a rebuild check sees it changed without waiting for the clock
    function touch(file: string, secondsAhead: number): void {
        const when = new Date(Date.now() + secondsAhead * 1000);
        fs.utimesSync(file, when, when);
    }

    beforeEach(() => {
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-sessions-"));
    });

    afterEach(() => {
        disposers.forEach((dispose) => dispose());
        disposers = [];
        fs.rmSync(scratch, { recursive: true, force: true });
    });

    describe("watchFiles", () => {
        it("reports changes to the watched files once they settle", async () => {
            const watched = write("a.ts", "a");
            let changes = 0;
            const watcher = watchFiles([ watched ], () => changes++);
            disposers.push(() => watcher.close());

            fs.writeFileSync(watched, "a1", "utf8");
            fs.writeFileSync(watched, "a2", "utf8");

            assert.isTrue(await waitFor(() => changes > 0), "the change was reported");
            await delay(400);
            assert.equal(changes, 1, "a burst of writes is one change");
        });

        it("ignores other files in the same folder", async () => {
            const watched = write("a.ts", "a");
            const other = write("other.ts", "other");
            let changes = 0;
            const watcher = watchFiles([ watched ], () => changes++);
            disposers.push(() => watcher.close());

            fs.writeFileSync(other, "changed", "utf8");

            await delay(500);
            assert.equal(changes, 0);
        });

        it("drops a pending change when it is closed", async () => {
            const watched = write("a.ts", "a");
            let changes = 0;
            const watcher = watchFiles([ watched ], () => changes++);

            fs.writeFileSync(watched, "a1", "utf8");
            await delay(100);
            watcher.close();
            watcher.close();

            await delay(400);
            assert.equal(changes, 0);
        });

        it("gives up quietly when a folder cannot be watched", () => {
            const watcher = watchFiles([ path.join(scratch, "missing", "a.ts") ], () => {
                throw new Error("unexpected");
            });

            watcher.close();
        });

        it("reports changes to a file named with forward slashes, as module graph ids are", async () => {
            const watched = write("a.ts", "a");
            let changes = 0;
            const watcher = watchFiles([ watched.split(path.sep).join("/") ], () => changes++);
            disposers.push(() => watcher.close());

            fs.writeFileSync(watched, "a1", "utf8");

            assert.isTrue(await waitFor(() => changes > 0), "the change was reported");
        });
    });

    describe("_watchPath", () => {
        // The 8.3 short name Windows gives a path, or "" where there is none (another OS, or a volume
        // with short names turned off)
        function shortName(longPath: string): string {
            if (process.platform !== "win32") {
                return "";
            }

            const result = spawnSync("cmd.exe", [ "/d", "/c", "for %I in (\"" + longPath + "\") do @echo %~sI" ], { encoding: "utf8", windowsVerbatimArguments: true });
            const short = result.status === 0 ? String(result.stdout || "").trim() : "";

            return short && short.toLowerCase() !== longPath.toLowerCase() ? short : "";
        }

        it("spells a path the way the file system does, with the platform's separators", () => {
            const file = write("a.ts", "a");

            const watched = _watchPath(file.split(path.sep).join("/"));

            assert.equal(watched, fs.realpathSync.native(file));
            assert.isTrue(path.isAbsolute(watched));
            if (process.platform === "win32") {
                assert.equal(watched.indexOf("/"), -1, "no forward slashes on Windows");
            }
        });

        it("expands an 8.3 short name", function () {
            const longDir = path.join(scratch, "a folder with a long name");
            fs.mkdirSync(longDir);
            fs.writeFileSync(path.join(longDir, "file.ts"), "f", "utf8");
            const short = shortName(longDir);
            if (!short) {
                // Nothing to expand on this platform or volume
                this.skip();
            }

            assert.equal(_watchPath(path.join(short, "file.ts")), fs.realpathSync.native(path.join(longDir, "file.ts")));
        });

        it("keeps the name of a file that no longer exists, in its folder's own spelling", () => {
            const gone = scratch.split(path.sep).join("/") + "/gone.ts";

            assert.equal(_watchPath(gone), path.join(fs.realpathSync.native(scratch), "gone.ts"));
        });

        it("keeps a path whose folder does not exist either, made absolute", () => {
            const nowhere = path.join(scratch, "missing", "a.ts");

            assert.equal(_watchPath(nowhere.split(path.sep).join("/")), path.resolve(nowhere));
        });
    });

    describe("_createTargetSessionCache", () => {
        interface ISession {
            target: InteractiveTarget;
            build: number;
        }

        function createCache(entryFiles: { [target: string]: string[] }, moduleFiles: () => string[], watch?: boolean) {
            const counts = { builds: 0, resolves: 0 };
            const cache = _createTargetSessionCache<ISession>({
                resolveEntryFiles: (target) => {
                    counts.resolves++;
                    return entryFiles[target].slice(0);
                },
                buildGraph: (target, files) => {
                    const modules: Record<string, string> = { "/__tripwire__/virtual.js": "virtual" };
                    files.concat(moduleFiles()).forEach((file) => {
                        modules[file] = "source of " + file;
                    });

                    return { modules, entryIds: files, tripwireModuleId: "", coverageOnlyIds: [], moduleUrls: {}, rawAssets: {}, elapsedMs: 0 };
                },
                assemble: (target) => {
                    counts.builds++;
                    return { target, build: counts.builds };
                }
            }, { watch: !!watch });
            disposers.push(() => cache.dispose());

            return { cache, counts };
        }

        it("builds a target once and reuses it while nothing changed", () => {
            const entry = write("a.test.ts", "a");
            const { cache, counts } = createCache({ browser: [ entry ], worker: [] }, () => []);

            const first = cache.get("browser");
            assert.deepEqual(first, { target: "browser", build: 1 });
            assert.equal(cache.get("browser"), first);
            assert.equal(counts.builds, 1);
            assert.equal(cache.getGeneration("browser"), 1);
        });

        it("rebuilds when the entry files change, in any order", () => {
            const a = write("a.test.ts", "a");
            const b = write("b.test.ts", "b");
            const entries = { browser: [ a, b ], worker: [] as string[] };
            const { cache, counts } = createCache(entries, () => []);

            cache.get("browser");
            entries.browser = [ b, a ];
            cache.get("browser");
            assert.equal(counts.builds, 1, "the same files in another order");

            entries.browser = [ a ];
            assert.equal(cache.get("browser").build, 2);
        });

        it("rebuilds when a module file is modified or removed", () => {
            const entry = write("a.test.ts", "a");
            const helper = write("helper.ts", "h");
            const { cache } = createCache({ browser: [ entry ], worker: [] }, () => [ helper ]);

            cache.get("browser");
            touch(helper, 10);
            assert.equal(cache.get("browser").build, 2, "modified");

            fs.unlinkSync(helper);
            assert.equal(cache.get("browser").build, 3, "removed");
        });

        it("lists the real module files to watch, without virtual or missing modules", () => {
            const entry = write("a.test.ts", "a");
            const missing = path.join(scratch, "missing.ts");
            const { cache } = createCache({ browser: [ entry ], worker: [] }, () => [ missing ]);

            assert.deepEqual(cache.getWatchFiles("browser"), []);
            cache.get("browser");
            assert.deepEqual(cache.getWatchFiles("browser"), [ entry ]);
        });

        it("peeks at the cached session without checking it, building only when there is none", () => {
            const entry = write("a.test.ts", "a");
            const { cache, counts } = createCache({ browser: [ entry ], worker: [ entry ] }, () => []);

            assert.isUndefined(cache.tryPeek("worker"));
            const built = cache.peek("worker");
            assert.equal(built.target, "worker");
            assert.equal(cache.tryPeek("worker"), built);

            touch(entry, 10);
            const resolves = counts.resolves;
            assert.equal(cache.peek("worker"), built, "a stale session is still returned");
            assert.equal(counts.resolves, resolves, "and nothing was checked");
        });

        it("numbers builds across targets", () => {
            const entry = write("a.test.ts", "a");
            const { cache } = createCache({ browser: [ entry ], worker: [ entry ] }, () => []);

            assert.equal(cache.getGeneration("worker"), 0);
            cache.get("browser");
            cache.get("worker");
            assert.equal(cache.getGeneration("browser"), 1);
            assert.equal(cache.getGeneration("worker"), 2);
        });

        it("rebuilds in the background when a watched file changes, until disposed", async () => {
            const entry = write("a.test.ts", "a");
            const { cache } = createCache({ browser: [ entry ], worker: [] }, () => [], true);

            cache.get("browser");
            fs.writeFileSync(entry, "a changed", "utf8");
            touch(entry, 10);
            assert.isTrue(await waitFor(() => cache.getGeneration("browser") === 2), "rebuilt by the watcher");

            cache.dispose();
            fs.writeFileSync(entry, "a changed again", "utf8");
            touch(entry, 20);
            await delay(500);
            assert.equal(cache.getGeneration("browser"), 2, "the watcher was closed");
        });

        it("does not rebuild when a watched file's change leaves it as it was built", async () => {
            const pinned = new Date(2020, 0, 1);
            const entry = write("a.test.ts", "a");
            fs.utimesSync(entry, pinned, pinned);
            const { cache, counts } = createCache({ browser: [ entry ], worker: [] }, () => [], true);

            cache.get("browser");
            const resolves = counts.resolves;
            fs.writeFileSync(entry, "a", "utf8");
            fs.utimesSync(entry, pinned, pinned);

            assert.isTrue(await waitFor(() => counts.resolves > resolves), "the watcher checked the session");
            await delay(300);
            assert.equal(cache.getGeneration("browser"), 1, "and kept it");
        });
    });
});
