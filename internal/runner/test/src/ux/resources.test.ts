/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import "../support/textImports";
import { assert } from "@nevware21/tripwire";
import { createBrowserRunnerHtml } from "../../../src/ux/browser/ui/resources";

/**
 * The interactive page as the server sends it: what it carries of the run's --browser-theme, the
 * stylesheets it is built from, and the accessibility basics a page has to declare up front.
 */
describe("ux resources", () => {
    describe("createBrowserRunnerHtml", () => {
        function bodyTag(html: string): string {
            return /<body[^>]*>/.exec(html)[0];
        }

        it("carries each part of the run's theme to the page as a default it applies before painting", () => {
            const html = createBrowserRunnerHtml("browser", "slate", { scheme: "dim", vision: "colorblind", zoom: 125 });

            assert.equal(bodyTag(html), "<body class=\"style-slate\" data-runner-target=\"browser\" data-default-theme=\"dim\" data-default-vision=\"colorblind\" data-default-zoom=\"125\">");
            assert.includes(html, "choose(\"tripwire.theme\", \"data-default-theme\",", "the inline script reads the default, after a choice kept in the browser");
            assert.includes(html, "choose(\"tripwire.zoom\", \"data-default-zoom\", isZoom)");
            assert.includes(html, "body.style.setProperty(\"--ui-zoom\"", "and applies the zoom to the page's own --ui-zoom");
        });

        it("carries only the parts the run set, and none without a theme", () => {
            assert.equal(bodyTag(createBrowserRunnerHtml("worker", "classic", { zoom: 80 })), "<body class=\"style-classic\" data-runner-target=\"worker\" data-default-zoom=\"80\">");
            assert.equal(bodyTag(createBrowserRunnerHtml("browser", "classic")), "<body class=\"style-classic\" data-runner-target=\"browser\">");
            assert.equal(createBrowserRunnerHtml("browser", "classic").indexOf("__RUNNER_"), -1, "every placeholder filled");
        });

        it("escapes a theme value, which a custom caller could pass unchecked", () => {
            const html = createBrowserRunnerHtml("browser", "classic", { scheme: "dark\" onload=\"x" as any });

            assert.includes(bodyTag(html), "data-default-theme=\"dark&quot; onload=&quot;x\"");
        });

        it("layers the accessibility themes over the style", () => {
            const html = createBrowserRunnerHtml("browser", "classic");

            assert.isTrue(html.indexOf("body.style-classic {") < html.indexOf("body[data-theme=\"dim\"] {"), "after the style, so they win");
            assert.includes(html, "body[data-vision=\"colorblind\"] {");
            assert.equal(html.indexOf("data-font-size"), -1, "the zoom is not a theme: nothing sizes the root, which a test's own content shares");
        });

        it("zooms only the page's own controls, results and log, and fits its compact layout to the zoom", () => {
            const html = createBrowserRunnerHtml("browser", "slate");

            assert.isTrue(/\.app-shell,\s*\.skip-link \{\s*zoom: var\(--ui-zoom, 1\);/.test(html), "the app shell and the skip link follow --ui-zoom");
            assert.isTrue(/\n  <div id="testFrameContainer"/.test(html), "the tests' frame is the body's own child, outside the app shell");
            assert.includes(html, "max-height: calc(100vh / var(--ui-zoom, 1) - 80px)", "a viewport unit inside the zoom is kept to the window");
            assert.includes(html, "body.layout-narrow .toolbar {");
            assert.includes(html, "body.layout-short .toolbar {");
            assert.isFalse(/@media \((max|min)-(width|height)/.test(html), "no media query measures the window alone");
        });

        it("declares its language, a way past the controls, and names its regions", () => {
            const html = createBrowserRunnerHtml("browser", "classic");

            assert.includes(html, "<html lang=\"en\">");
            assert.includes(html, "<a id=\"skipLink\" class=\"skip-link\" href=\"#results\">Skip to the results</a>");
            assert.includes(html, "<main class=\"results-main\" aria-label=\"Test results\">");
            assert.includes(html, "<section class=\"controls\" aria-label=\"Run controls\">");
            assert.includes(html, "id=\"logs\" role=\"log\" aria-live=\"off\" aria-label=\"Runner log\" tabindex=\"0\"");
        });
    });
});
