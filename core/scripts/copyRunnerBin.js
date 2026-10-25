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

function ensureLocalLinks() {
    const coreDir = path.resolve(__dirname, "..");
    const nevware21Dir = path.join(coreDir, "node_modules", "@nevware21");
    const linkType = process.platform === "win32" ? "junction" : "dir";

    if (!fs.existsSync(nevware21Dir)) {
        fs.mkdirSync(nevware21Dir, { recursive: true });
    }

    // Self-link so the copied runner binary can dynamically resolve "@nevware21/tripwire"
    // (the package under test) when run against core's own dogfood test suite from within
    // core/ -- the default UX/compile providers are bundled directly into the binary now
    // (internal/runner/src/ux, internal/runner/src/compile), so no other local links are needed here.
    const localLinks = {
        "tripwire": coreDir
    };

    for (const [name, target] of Object.entries(localLinks)) {
        const linkPath = path.join(nevware21Dir, name);
        if (!fs.existsSync(linkPath)) {
            fs.symlinkSync(target, linkPath, linkType);
            console.log("\x1b[36mCreated local link: core/node_modules/@nevware21/" + name + "\x1b[0m");
        }
    }
}

function main() {
    _ensureExists(srcDir);

    if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
    }

    console.log("\x1b[36mCopying runner bin artifacts...\x1b[0m");
    copyRecursive(srcDir, dstDir);
    ensureLocalLinks();

    console.log("\x1b[32mDone copying runner bin artifacts to core/bin\x1b[0m");
}

main();
