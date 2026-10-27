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
import { assert } from "@nevware21/tripwire";
import { applyGlobalRunnerConfig, createContextServer, createRunnerHost } from "../../../src/client/runnerHost";
import { _loadUxProvider } from "../../../src/client/loadUxProvider";
import * as defaultUx from "../../../src/ux";
import { _isUserError } from "../../../src/internal/userError";

/**
 * What the browser and worker runtimes build around a run in the page: the runner host, the view of
 * the CLI's server the payload describes, and the run settings applied to tripwire's configuration.
 * Also how the CLI picks the browser UX it serves.
 */
describe("client runner host", () => {
    describe("createContextServer", () => {
        it("describes the server named in the run settings", () => {
            const server = createContextServer({ server: { url: "http://127.0.0.1:1234/", port: 1234, isRunning: true } });

            assert.equal(server.url, "http://127.0.0.1:1234/");
            assert.equal(server.port, 1234);
            assert.isTrue(server.isRunning);
        });

        it("defaults the port and treats a server as running unless told otherwise", () => {
            assert.equal(createContextServer({ server: { url: "http://host/", port: "80" } }).port, 0);
            assert.isTrue(createContextServer({ server: { url: "http://host/" } }).isRunning);
            assert.isFalse(createContextServer({ server: { url: "http://host/", isRunning: false } }).isRunning);
        });

        it("starts and stops only its own running flag", async () => {
            const server = createContextServer({ server: { url: "http://host/", isRunning: false } });

            assert.equal(server.start(), server);
            assert.isTrue(server.isRunning);
            await server.stop();
            assert.isFalse(server.isRunning);
        });

        it("has no server without settings naming one", () => {
            assert.isNull(createContextServer(null));
            assert.isNull(createContextServer({}));
            assert.isNull(createContextServer({ server: { port: 80 } }));
        });
    });

    describe("createRunnerHost", () => {
        it("works on a clone of the configuration, with its own notifications and the settings' server", () => {
            const clone = { cloned: true };
            const notifyMgr = { notify: true };
            const tripwire: any = {
                assertConfig: { $ops: { clone: () => clone } },
                createNotifyMgr: () => notifyMgr
            };

            const host = createRunnerHost(tripwire, { server: { url: "http://host/" } });

            assert.equal(host.opts.v, clone);
            assert.equal(host.notifyMgr, notifyMgr);
            assert.equal(host.serverMgr.server.url, "http://host/");
            assert.equal(host.serverMgr.start(), host.serverMgr.server);
            host.serverMgr.setProvider({});
        });

        it("uses the configuration as it is when it cannot be cloned, and copes without a server or notifications", () => {
            const config = { timeout: 5 };
            const host = createRunnerHost({ assertConfig: config } as any, {});

            assert.equal(host.opts.v, config);
            assert.isNull(host.notifyMgr);
            assert.isNull(host.serverMgr.server);
            assert.isNull(host.serverMgr.start());
        });

        it("clones into a fresh host for the same module and settings", () => {
            const tripwire: any = { assertConfig: { $ops: { clone: () => ({}) } } };
            const host = createRunnerHost(tripwire, { server: { url: "http://host/" } });

            const copy = host.clone();

            assert.notEqual(copy, host);
            assert.equal(copy.serverMgr.server.url, "http://host/");
        });
    });

    describe("applyGlobalRunnerConfig", () => {
        it("applies the run's timeout, slow and retries settings, and puts the old values back", () => {
            const config: any = { timeout: 2000, slow: 75, retries: 0, other: "kept" };
            const restore = applyGlobalRunnerConfig({ assertConfig: config }, { timeout: 100, retries: 2, unrelated: true });

            assert.deepEqual(config, { timeout: 100, slow: 75, retries: 2, other: "kept" });

            restore();
            assert.deepEqual(config, { timeout: 2000, slow: 75, retries: 0, other: "kept" });
        });

        it("does nothing without a configuration or settings", () => {
            applyGlobalRunnerConfig(null, { timeout: 1 })();
            applyGlobalRunnerConfig({}, { timeout: 1 })();

            const config: any = { timeout: 3 };
            applyGlobalRunnerConfig({ assertConfig: config }, null)();
            assert.equal(config.timeout, 3);
        });
    });

    describe("_loadUxProvider", () => {
        let scratch: string;

        function provider(name: string, source: string): string {
            const file = path.join(scratch, name + ".js");
            fs.writeFileSync(file, source, "utf8");

            return file;
        }

        function failure(name: string): any {
            try {
                _loadUxProvider(name);
            } catch (e) {
                return e;
            }

            return null;
        }

        before(() => {
            scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tripwire-ux-provider-"));
        });

        after(() => {
            fs.rmSync(scratch, { recursive: true, force: true });
        });

        it("uses the built in UX unless a provider is named", () => {
            assert.equal(_loadUxProvider(), defaultUx as any);
            assert.equal(_loadUxProvider(""), defaultUx as any);
        });

        it("loads a named provider with both page builders", () => {
            const name = provider("complete", "exports.createBrowserRunnerHtml = () => 'page';\nexports.createFsDirListingHtml = () => 'listing';\n");

            assert.equal(_loadUxProvider(name).createBrowserRunnerHtml("browser", "classic"), "page");
        });

        it("rejects a provider missing either page builder as a user error", () => {
            const noPage = failure(provider("noPage", "exports.createFsDirListingHtml = () => 'listing';\n"));
            const noListing = failure(provider("noListing", "exports.createBrowserRunnerHtml = () => 'page';\n"));

            assert.isTrue(_isUserError(noPage));
            assert.includes(noPage.message, "missing createBrowserRunnerHtml(target, style)");
            assert.isTrue(_isUserError(noListing));
            assert.includes(noListing.message, "missing createFsDirListingHtml(style, relativePath, entries)");
        });
    });
});
