/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import "../support/textImports";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createRequire } from "module";
import { assert } from "@nevware21/tripwire";
import { _graphWorkerEntry } from "../../../src/tripwire";
import { setGraphTypeCheck } from "../../../src/compile/tsCompile";

/**
 * The entry point a module-graph worker thread runs: it builds the graph its workerData describes and
 * posts back either the graph or the failure. Here it runs on this thread, with the thread's data and
 * port stood in for.
 */
describe("cli graph worker entry", function () {
    // The graph compiles a small TypeScript project
    this.timeout(60000);

    const workerThreads = createRequire(__filename)("worker_threads");
    const orgWorkerData = workerThreads.workerData;
    const orgParentPort = workerThreads.parentPort;
    let project: string;
    let posted: any[];
    let orgLog: typeof console.log;

    function write(name: string, text: string): string {
        const file = path.join(project, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text, "utf8");

        return file;
    }

    function runEntry(entryFiles: string[], typeCheck?: boolean, withPort: boolean = true): void {
        workerThreads.workerData = { entryFiles: entryFiles, cwd: project, parsed: {}, typeCheck: !!typeCheck };
        workerThreads.parentPort = withPort ? { postMessage: (result: any) => posted.push(result) } : null;

        _graphWorkerEntry();
    }

    before(() => {
        project = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-graph-entry-"));

        // Its own tripwire package, as in core's own suite, so the graph's runtime is this small file
        write("package.json", JSON.stringify({ name: "@nevware21/tripwire", version: "0.0.0" }));
        write("tsconfig.json", JSON.stringify({ compilerOptions: { target: "es2018", module: "commonjs", types: [], lib: [ "es2018" ] }, include: [ "src/**/*.ts", "test/**/*.ts" ] }));
        write("src/index.ts", "export function it(name: string, fn: () => void): void {\n    fn();\n}\n");
        write("test/a.test.ts", "import { it } from \"@nevware21/tripwire\";\nit(\"runs\", () => {\n});\n");
        write("test/builtin.test.ts", "import * as fs from \"fs\";\nexport const exists = fs.existsSync;\n");
    });

    after(() => {
        fs.rmSync(project, { recursive: true, force: true });
    });

    beforeEach(() => {
        posted = [];
        orgLog = console.log;
        console.log = () => {};
    });

    afterEach(() => {
        console.log = orgLog;
        workerThreads.workerData = orgWorkerData;
        workerThreads.parentPort = orgParentPort;
        setGraphTypeCheck(false);
    });

    it("posts the graph it built for the entry files", () => {
        runEntry([ path.join(project, "test/a.test.ts") ]);

        assert.equal(posted.length, 1);
        assert.isTrue(posted[0].ok);
        assert.deepEqual(posted[0].graph.entryIds, [ path.join(project, "test/a.test.ts").split(path.sep).join("/") ]);
    });

    it("posts a user error with its hints", () => {
        runEntry([ path.join(project, "test/builtin.test.ts") ]);

        assert.isFalse(posted[0].ok);
        assert.isTrue(posted[0].user);
        assert.includes(posted[0].message, "Node builtin module 'fs' is not supported in browser/worker target");
        assert.isTrue(posted[0].hints.length > 0);
        assert.isString(posted[0].stack);
    });

    it("posts any other failure as one that is not the user's", () => {
        runEntry([ path.join(project, "test/missing.test.ts") ]);

        assert.isFalse(posted[0].ok);
        assert.isFalse(posted[0].user);
        assert.includes(posted[0].message, "ENOENT");
    });

    it("posts nothing without a parent thread to post to", () => {
        runEntry([ path.join(project, "test/a.test.ts") ], false, false);

        assert.equal(posted.length, 0);
    });
});
