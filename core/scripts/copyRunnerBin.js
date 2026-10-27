const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const srcDir = path.resolve(root, "internal", "runner", "dist", "bin");
const dstDir = path.resolve(root, "core", "bin");

function _ensureExists(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            "Missing runner build output: " + filePath +
            "\nRun 'npm --prefix ./internal/runner run build' (or 'rush build') first."
        );
    }
}

/*
 * A source map's `sources` are relative to the map's own location, so copying one to a
 * different directory silently repoints every entry. `../../src/execute/execute.ts` means
 * `internal/runner/src/...` sitting in `internal/runner/dist/bin/`, and `core/src/...` -- a path that does not
 * exist -- once the file lands in `core/bin/`. Rewriting them on the way through keeps
 * `--debug-stack` frames and DevTools' "sources" panel pointing at real files.
 */
function _rewriteSourceMapPaths(srcPath, destPath) {
    const map = JSON.parse(fs.readFileSync(srcPath, "utf8"));
    if (!map || !Array.isArray(map.sources)) {
        fs.copyFileSync(srcPath, destPath);
        return;
    }

    const srcMapDir = path.dirname(srcPath);
    const destMapDir = path.dirname(destPath);

    map.sources = map.sources.map((source) => {
        if (!source || path.isAbsolute(source) || /^[a-z]+:\/\//i.test(source)) {
            return source;
        }

        const absolute = path.resolve(srcMapDir, source);

        return path.relative(destMapDir, absolute).replace(/\\/g, "/");
    });

    fs.writeFileSync(destPath, JSON.stringify(map));
}

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        for (const entry of fs.readdirSync(src)) {
            const srcPath = path.join(src, entry);
            const destPath = path.join(dest, entry);
            copyRecursive(srcPath, destPath);
        }
    } else {
        // Log the file being copied
        console.log("\x1b[33m - \x1b[0m", path.relative(srcDir, src));

        if (src.endsWith(".map")) {
            _rewriteSourceMapPaths(src, dest);
            return;
        }

        fs.copyFileSync(src, dest);
    }
}

// Removes the link an older build put at `linkPath` -- only the link, never the folder it points to.
function _removeLink(linkPath) {
    let stat = null;
    try {
        stat = fs.lstatSync(linkPath);
    } catch (e) {
        return;
    }

    if (stat.isSymbolicLink()) {
        // A Windows junction is reported as a link too, and unlink removes just the junction
        fs.unlinkSync(linkPath);
        console.log("\x1b[36mRemoved the old self-link: core/node_modules/@nevware21/tripwire\x1b[0m");
    }
}

function ensureSelfPackage() {
    const coreDir = path.resolve(__dirname, "..");
    const packageDir = path.join(coreDir, "node_modules", "@nevware21", "tripwire");

    // Lets the copied runner binary, and core's own test files, resolve "@nevware21/tripwire" (the
    // package under test) when core's dogfood test suite runs from within core/ -- the default
    // UX/compile providers are bundled directly into the binary now (internal/runner/src/ux,
    // internal/runner/src/compile), so nothing else needs resolving here.
    //
    // It is a folder holding just a package.json whose entry points lead back to core's build, and
    // not a link to core itself: core contains this very folder, so such a link was a loop. Anything
    // walking ignored folders through it -- `git clean -xdf` (the clean build), `git status --ignored`
    // -- went round core/node_modules/@nevware21/tripwire/node_modules/... until the paths grew too
    // long for the file system. Node resolves `main` to the real file under core/dist, so the module
    // loaded is the same one either way.
    _removeLink(packageDir);
    fs.mkdirSync(packageDir, { recursive: true });

    const corePackage = JSON.parse(fs.readFileSync(path.join(coreDir, "package.json"), "utf8"));
    const redirect = {
        name: corePackage.name,
        version: corePackage.version,
        private: true,
        description: "Points back to this checkout's core build. Written by core/scripts/copyRunnerBin.js.",
        main: "../../../" + corePackage.main,
        module: "../../../" + corePackage.module,
        types: "../../../" + corePackage.types
    };
    const text = JSON.stringify(redirect, null, 4) + "\n";
    const target = path.join(packageDir, "package.json");

    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== text) {
        fs.writeFileSync(target, text, "utf8");
        console.log("\x1b[36mWrote local package: core/node_modules/@nevware21/tripwire\x1b[0m");
    }
}

function main() {
    _ensureExists(srcDir);

    if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
    }

    console.log("\x1b[36mCopying runner bin artifacts...\x1b[0m");
    copyRecursive(srcDir, dstDir);
    ensureSelfPackage();

    console.log("\x1b[32mDone copying runner bin artifacts to core/bin\x1b[0m");
}

main();
