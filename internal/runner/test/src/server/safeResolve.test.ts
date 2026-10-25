/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import { assert } from "@nevware21/tripwire";
import { _safeResolve } from "../../../src/server/handlers/fs";

/*
 * TEST-FSPATH. `_safeResolve` is the containment check standing between an incoming request
 * and everything outside `--server-root`. It is the one function in the runner where a
 * regression is a security bug rather than a broken feature, so every branch is pinned:
 * the resolve-then-compare, the Windows drive-letter guard, the percent-decoded traversal
 * (decoded by the caller before it arrives here), and `isAbsolute` for the cross-drive
 * `relative()` case.
 *
 * The root is a real absolute path rather than a fixture on disk -- `_safeResolve` never
 * touches the filesystem, it only decides.
 */
const _root = path.resolve(path.join("served", "root"));

function _expectAllowed(subpath: string, ...expectedParts: string[]): void {
    const resolved = _safeResolve(_root, subpath);

    assert.isNotNull(resolved, "expected " + JSON.stringify(subpath) + " to be allowed");
    assert.equal(resolved, path.join(_root, ...expectedParts));
}

function _expectBlocked(subpath: string): void {
    assert.isNull(_safeResolve(_root, subpath), "expected " + JSON.stringify(subpath) + " to be blocked");
}

describe("server handlers _safeResolve", () => {
    describe("paths inside the root are allowed", () => {
        it("should resolve the root itself", () => {
            assert.equal(_safeResolve(_root, "/"), _root);
        });

        it("should resolve an empty subpath to the root", () => {
            assert.equal(_safeResolve(_root, ""), _root);
        });

        it("should treat a null subpath as the root", () => {
            assert.equal(_safeResolve(_root, null as any), _root);
        });

        it("should resolve a single file", () => {
            _expectAllowed("/index.html", "index.html");
        });

        it("should resolve a nested path", () => {
            _expectAllowed("/src/utils/helper.ts", "src", "utils", "helper.ts");
        });

        it("should resolve a nested path with no leading slash", () => {
            _expectAllowed("src/utils/helper.ts", "src", "utils", "helper.ts");
        });

        it("should collapse repeated leading slashes", () => {
            _expectAllowed("///src/index.ts", "src", "index.ts");
        });

        it("should accept backslashes as separators", () => {
            _expectAllowed("\\src\\index.ts", "src", "index.ts");
        });

        it("should allow an interior .. that stays inside the root", () => {
            // `src/../lib` normalises to `lib`, which is still contained.
            _expectAllowed("/src/../lib/index.ts", "lib", "index.ts");
        });

        it("should allow a filename that merely begins with dots", () => {
            // The containment test looks for a leading ".." *segment*, not a leading ".."
            // substring -- these names resolve inside the root and are legitimate. A
            // `rel.startsWith("..")` check rejects all three.
            _expectAllowed("/..hidden.ts", "..hidden.ts");
            _expectAllowed("/...weird.ts", "...weird.ts");
        });

        it("should allow a directory whose name merely begins with dots", () => {
            _expectAllowed("/..config/settings.json", "..config", "settings.json");
            _expectAllowed("/..a/b.ts", "..a", "b.ts");
        });

        it("should allow a directory whose name starts with the root's name", () => {
            // Guards against a naive `startsWith(root)` string comparison, which would
            // also accept a sibling directory sharing the prefix.
            _expectAllowed("/rootish/file.ts", "rootish", "file.ts");
        });

        it("should allow a single dot segment", () => {
            assert.equal(_safeResolve(_root, "."), _root);
            assert.equal(_safeResolve(_root, "/./"), _root);
        });
    });

    describe("traversal out of the root is blocked", () => {
        it("should block a bare .. escape", () => {
            _expectBlocked("/../secret.txt");
        });

        it("should block a deep .. escape", () => {
            _expectBlocked("/../../../etc/passwd");
        });

        it("should block a .. escape hidden behind a real directory", () => {
            // The comment on _safeResolve calls this case out by name.
            _expectBlocked("/src/../../../etc/passwd");
        });

        it("should block a .. escape written with backslashes", () => {
            _expectBlocked("..\\..\\secret.txt");
        });

        it("should block an escape that lands exactly on the parent", () => {
            _expectBlocked("/..");
        });

        it("should block a mixed-separator escape", () => {
            _expectBlocked("/src\\../../secret.txt");
        });

        it("should block an escape that returns to a sibling of the root", () => {
            _expectBlocked("/../root-sibling/file.ts");
        });

        it("should distinguish a .. segment from a name beginning with dots", () => {
            // The pair that separates a segment check from a substring check. Both halves
            // matter: the first must stay blocked, the second must stay allowed.
            _expectBlocked("/../hidden.ts");
            _expectAllowed("/..hidden.ts", "..hidden.ts");
        });
    });

    describe("percent-encoded traversal", () => {
        /*
         * The handler calls decodeURIComponent before _safeResolve precisely so that an
         * encoded traversal is normalised into real `..` segments and caught here. These
         * assert both halves: decoded input is blocked, and still-encoded input is not
         * silently treated as a traversal by this function (it is an ordinary filename).
         */
        it("should block %2e%2e%2f once decoded", () => {
            _expectBlocked(decodeURIComponent("%2e%2e%2f%2e%2e%2fetc/passwd"));
        });

        it("should block %2E%2E/ once decoded, uppercase included", () => {
            _expectBlocked(decodeURIComponent("%2E%2E/%2E%2E/secret.txt"));
        });

        it("should block an encoded backslash traversal once decoded", () => {
            _expectBlocked(decodeURIComponent("..%5C..%5Csecret.txt"));
        });

        it("should treat a still-encoded sequence as an ordinary name", () => {
            // Not a traversal at this layer -- there is no `..` segment after the literal
            // text is resolved, so it stays inside the root as a strangely-named file.
            const resolved = _safeResolve(_root, "%2e%2e%2fetc");

            assert.isNotNull(resolved);
            assert.isTrue(resolved.indexOf(_root) === 0, "must stay under the root");
        });
    });

    describe("NUL bytes are blocked", () => {
        /*
         * FS-NULLBYTE. `%00` is valid percent-encoding, so the handler's decodeURIComponent
         * decodes it rather than throwing, and every check here used to pass it through: a NUL
         * survives path.resolve/relative untouched and looks like an ordinary relative name to
         * the containment test. It only surfaced at fs.stat, where node's path validation
         * throws ERR_INVALID_ARG_VALUE *synchronously* from inside a promise executor -- which
         * killed the whole server process on a single `GET /%00x`.
         *
         * These are written against the decoded value, because that is what the handler passes.
         */
        it("should block a bare NUL byte", () => {
            _expectBlocked("\0");
        });

        it("should block the decoded %00 that crashed the server", () => {
            _expectBlocked(decodeURIComponent("/%00x"));
        });

        it("should block a NUL byte embedded in an otherwise contained path", () => {
            // The dangerous shape: everything about this says "ordinary file under the root".
            _expectBlocked("/src/index\0.ts");
        });

        it("should block a NUL byte in a directory segment", () => {
            _expectBlocked("/src\0/index.ts");
        });

        it("should block a trailing NUL byte", () => {
            // The classic truncation shape -- a path that reads as one file and opens another.
            _expectBlocked("/index.html\0.txt");
        });

        it("should block a NUL byte combined with traversal", () => {
            _expectBlocked(decodeURIComponent("/..%2f..%2fetc%2fpasswd%00"));
        });

        it("should block a NUL byte regardless of leading slashes or separators", () => {
            _expectBlocked("\0/src/a.ts");
            _expectBlocked("///\0src/a.ts");
            _expectBlocked("\\src\\a\0.ts");
        });

        it("should not reject the two-character text \\0", () => {
            // A literal backslash-zero is an ordinary (if odd) filename, not a NUL byte. The
            // guard must test for the control character itself, not the escape that spells it.
            _expectAllowed("/src/a\\0.ts", "src", "a", "0.ts");
        });
    });

    describe("drive-qualified paths are blocked", () => {
        it("should block a C:-prefixed subpath", () => {
            _expectBlocked("C:/Windows/System32/drivers/etc/hosts");
        });

        it("should block a lowercase drive letter", () => {
            _expectBlocked("c:/windows/win.ini");
        });

        it("should block a drive letter behind URL-style leading slashes", () => {
            // The guard runs *after* leading slashes are stripped, which is what makes
            // `/C:/...` -- the shape a browser actually sends -- reachable by it.
            _expectBlocked("/C:/Windows/win.ini");
            _expectBlocked("///D:/data/file.txt");
        });

        it("should block a drive letter written with backslashes", () => {
            _expectBlocked("C:\\Windows\\win.ini");
        });

        it("should block a bare drive reference", () => {
            _expectBlocked("C:");
        });

        it("should allow a single-letter directory that is not drive-qualified", () => {
            // `C` without the colon is an ordinary directory name.
            _expectAllowed("/C/file.ts", "C", "file.ts");
        });
    });

    describe("absolute-looking subpaths", () => {
        it("should treat a leading-slash absolute path as root-relative", () => {
            // "/etc/passwd" has its leading slash stripped, so it becomes <root>/etc/passwd
            // -- contained, and therefore allowed. The escape only happens via `..`.
            _expectAllowed("/etc/passwd", "etc", "passwd");
        });

        it("should keep a UNC-looking path inside the root or block it, never outside", () => {
            // Leading slashes are stripped, so this cannot become a real UNC reference.
            const resolved = _safeResolve(_root, "//server/share/file.ts");

            if (resolved !== null) {
                assert.isTrue(resolved.indexOf(_root) === 0, "must stay under the root");
            }
        });
    });

    describe("the containment decision itself", () => {
        it("should never return a path that is outside the root or unsafe to pass to fs", () => {
            // A sweep over the shapes above asserting the invariant directly: whatever
            // comes back is either null or genuinely under the root.
            const probes = [
                "/", "", ".", "/./", "/index.html", "/src/a.ts", "src/a.ts", "///src/a.ts",
                "\\src\\a.ts", "/src/../lib/a.ts", "/..hidden.ts", "/..a/b.ts", "/rootish/f.ts",
                "/../secret.txt", "/../../../etc/passwd", "/src/../../../etc/passwd",
                "..\\..\\secret.txt", "/..", "C:/Windows/win.ini", "/C:/Windows/win.ini",
                "C:", "/etc/passwd", "//server/share/f.ts",
                decodeURIComponent("%2e%2e%2f%2e%2e%2fetc/passwd"),
                "\0", "/src/index\0.ts", "/index.html\0.txt", decodeURIComponent("/%00x")
            ];

            for (let lp = 0; lp < probes.length; lp++) {
                const resolved = _safeResolve(_root, probes[lp]);

                if (resolved !== null) {
                    // Containment is asserted by walking the relative segments: no segment
                    // may be "..". This is the property being protected, stated
                    // independently of how _safeResolve happens to test for it.
                    const rel = path.relative(_root, resolved);
                    const segments = rel.split(/[\\/]/);
                    const why = "escaped via " + JSON.stringify(probes[lp]) + " -> " + resolved;

                    assert.isFalse(path.isAbsolute(rel), why);

                    for (let seg = 0; seg < segments.length; seg++) {
                        assert.notEqual(segments[seg], "..", why);
                    }

                    // The second half of the contract: anything returned here goes straight to
                    // fs.stat/readFile, so it must also be a path node will accept. A NUL byte
                    // is the one character it rejects -- synchronously, fatally (FS-NULLBYTE).
                    assert.equal(resolved.indexOf("\0"), -1,
                        "returned an fs-unsafe path for " + JSON.stringify(probes[lp]));
                }
            }
        });

        it("should return an absolute path when it allows the request", () => {
            const resolved = _safeResolve(_root, "/src/index.ts");

            assert.isNotNull(resolved);
            assert.isTrue(path.isAbsolute(resolved));
        });

        it("should resolve a relative root before comparing", () => {
            // The root is normalised with path.resolve first, so a relative root still
            // produces an absolute answer and a sound comparison.
            const resolved = _safeResolve(path.join("served", "root"), "/src/index.ts");

            assert.isNotNull(resolved);
            assert.isTrue(path.isAbsolute(resolved));
            assert.equal(resolved, path.join(_root, "src", "index.ts"));
        });

        it("should still block traversal when given a relative root", () => {
            assert.isNull(_safeResolve(path.join("served", "root"), "/../../etc/passwd"));
        });
    });
});
