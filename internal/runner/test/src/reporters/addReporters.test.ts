/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert, createNotifyMgr } from "@nevware21/tripwire";
import { addCargoReporter } from "../../../src/reporters/cargoReporter";
import { addConsoleReporter } from "../../../src/reporters/consoleReporter";
import { addDocReporter } from "../../../src/reporters/docReporter";
import { addDotReporter } from "../../../src/reporters/dotReporter";
import { addJsonReporter } from "../../../src/reporters/jsonReporter";
import { addJsonStreamReporter } from "../../../src/reporters/jsonStreamReporter";
import { addLandingReporter } from "../../../src/reporters/landingReporter";
import { addListReporter } from "../../../src/reporters/listReporter";
import { addMarkdownReporter } from "../../../src/reporters/markdownReporter";
import { addMinReporter } from "../../../src/reporters/minReporter";
import { addNyanReporter } from "../../../src/reporters/nyanReporter";
import { addProgressReporter } from "../../../src/reporters/progressReporter";
import { addTapReporter } from "../../../src/reporters/tapReporter";
import { addXunitReporter } from "../../../src/reporters/xunitReporter";
import { makeSink } from "../support/reporterHarness";

/**
 * Each reporter also has an `add...Reporter` helper, which creates it and registers it with a
 * notification manager in one step. Each is checked here against a real manager: registering adds a
 * listener, and the handle it returns takes it away again.
 */
describe("reporter registration", () => {
    const adders: { [name: string]: (mgr: any, options?: any) => { rm(): void } } = {
        cargo: addCargoReporter,
        console: addConsoleReporter,
        doc: addDocReporter,
        dot: addDotReporter,
        json: addJsonReporter,
        "json-stream": addJsonStreamReporter,
        landing: addLandingReporter,
        list: addListReporter,
        markdown: addMarkdownReporter,
        min: addMinReporter,
        nyan: addNyanReporter,
        progress: addProgressReporter,
        tap: addTapReporter,
        xunit: addXunitReporter
    };

    Object.keys(adders).forEach((name) => {
        it("registers the " + name + " reporter, and removes it with the handle it returns", () => {
            const mgr = createNotifyMgr();
            assert.isFalse(mgr.hasListeners());

            const handle = adders[name](mgr, { console: makeSink() });
            assert.isTrue(mgr.hasListeners());

            handle.rm();
            assert.isFalse(mgr.hasListeners());
        });
    });
});
