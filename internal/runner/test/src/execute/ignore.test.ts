/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as path from "path";
import { assert } from "@nevware21/tripwire";
import { _applyIgnoredFilePatterns } from "../../../src/execute/ignore";

/**
 * `--ignore` patterns are matched against each file's path relative to the working directory, with
 * forward slashes whatever the platform wrote.
 */
describe("execute ignore patterns", () => {
    const cwd = path.resolve("project");
    const files = [
        path.join(cwd, "test", "src", "a.test.ts"),
        path.join(cwd, "test", "src", "slow", "b.test.ts"),
        path.join(cwd, "test", "fixtures", "c.test.ts"),
        path.join(cwd, "src", "d.ts")
    ];

    it("returns the same array when there is nothing to ignore", () => {
        const result = _applyIgnoredFilePatterns(files, cwd, []);

        assert.equal(result, files, "no copy is made when no pattern applies");
    });

    it("drops the files a glob pattern matches", () => {
        const result = _applyIgnoredFilePatterns(files, cwd, ["test/fixtures/**"]);

        assert.deepEqual(result, [files[0], files[1], files[3]]);
    });

    it("matches nested folders with a double star and ignores a leading ./", () => {
        const result = _applyIgnoredFilePatterns(files, cwd, ["./test/**/slow/*.ts"]);

        assert.deepEqual(result, [files[0], files[2], files[3]]);
    });

    it("accepts patterns written with backslashes", () => {
        const result = _applyIgnoredFilePatterns(files, cwd, ["test\\src\\*.test.ts"]);

        assert.deepEqual(result, [files[1], files[2], files[3]]);
    });

    it("applies every pattern and keeps files none of them match", () => {
        const result = _applyIgnoredFilePatterns(files, cwd, ["src/**", "**/fixtures/**"]);

        assert.deepEqual(result, [files[0], files[1]]);
    });
});
