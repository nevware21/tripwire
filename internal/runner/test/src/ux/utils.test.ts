/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { assert } from "@nevware21/tripwire";
import {
    _setDurationText, _setNodeHidden, _setStatusClass, _stickToBottom, _wasAtBottom,
    createRerunButton, formatCount, getStatusMarker, resolveUrl, safeToString
} from "../../../src/ux/browser/ui/utils";

/**
 * The interactive page's small helpers. Most are pure; the ones that take an element only ever
 * set a few members on it, so they get a plain object, and the two that reach for a global
 * (`resolveUrl` for `location`, `createRerunButton` for `document`) get one for the duration of
 * the call.
 */

function _withGlobal(name: string, value: any, fn: () => void): void {
    const g = globalThis as any;
    const had = name in g;
    const prev = g[name];
    g[name] = value;
    try {
        fn();
    } finally {
        if (had) {
            g[name] = prev;
        } else {
            delete g[name];
        }
    }
}

function _element(): any {
    const attrs: { [name: string]: string } = {};
    const classes: string[] = [];

    return {
        attrs: attrs,
        classes: classes,
        style: {},
        textContent: "",
        setAttribute: (name: string, value: any) => {
            attrs[name] = String(value);
        },
        getAttribute: (name: string) => (name in attrs ? attrs[name] : null),
        removeAttribute: (name: string) => {
            delete attrs[name];
        },
        classList: {
            add: (...names: string[]) => {
                for (let lp = 0; lp < names.length; lp++) {
                    if (classes.indexOf(names[lp]) === -1) {
                        classes.push(names[lp]);
                    }
                }
            },
            remove: (...names: string[]) => {
                for (let lp = 0; lp < names.length; lp++) {
                    const idx = classes.indexOf(names[lp]);
                    if (idx !== -1) {
                        classes.splice(idx, 1);
                    }
                }
            }
        }
    };
}

describe("ux utils", () => {

    describe("safeToString", () => {
        it("should pass strings through untouched", () => {
            assert.strictEqual(safeToString("as is"), "as is");
            assert.strictEqual(safeToString(""), "");
        });

        it("should turn null and undefined into an empty string", () => {
            assert.strictEqual(safeToString(null), "");
            assert.strictEqual(safeToString(undefined), "");
        });

        it("should serialise everything else as JSON", () => {
            assert.equal(safeToString(42), "42");
            assert.equal(safeToString(true), "true");
            assert.equal(safeToString({ a: [1, "two"] }), "{\"a\":[1,\"two\"]}");
        });

        it("should fall back to String() for a value JSON cannot take", () => {
            const circular: any = { name: "loop" };
            circular.self = circular;
            assert.equal(safeToString(circular), "[object Object]");
            assert.equal(safeToString(BigInt(7)), "7");
        });
    });

    describe("resolveUrl", () => {
        const PAGE = "http://localhost:4321/__tripwire__/test-frame/index.html";

        it("should resolve a root-relative path against the server origin, not the page's directory", () => {
            _withGlobal("location", { href: PAGE }, () => {
                assert.equal(resolveUrl("/api/log"), "http://localhost:4321/api/log");
            });
        });

        it("should resolve a relative path against the page's directory", () => {
            _withGlobal("location", { href: PAGE }, () => {
                assert.equal(resolveUrl("runner-client.js"), "http://localhost:4321/__tripwire__/test-frame/runner-client.js");
            });
        });

        it("should treat a missing path as the page itself", () => {
            _withGlobal("location", { href: PAGE }, () => {
                assert.equal(resolveUrl(null), PAGE);
                assert.equal(resolveUrl(""), PAGE);
            });
        });

        it("should leave an absolute URL alone", () => {
            _withGlobal("location", { href: PAGE }, () => {
                assert.equal(resolveUrl("https://example.com/x?y=1"), "https://example.com/x?y=1");
            });
        });
    });

    describe("formatCount", () => {
        it("should pick the singular for exactly one and the plural otherwise", () => {
            assert.equal(formatCount(1, "test", "tests"), "1 test");
            assert.equal(formatCount(0, "test", "tests"), "0 tests");
            assert.equal(formatCount(2, "assertion", "assertions"), "2 assertions");
        });
    });

    describe("getStatusMarker", () => {
        it("should give each status its glyph and a hollow circle to anything else", () => {
            assert.equal(getStatusMarker("passed"), "✓");
            assert.equal(getStatusMarker("failed"), "✗");
            assert.equal(getStatusMarker("running"), "…");
            assert.equal(getStatusMarker("pending"), "○");
            assert.equal(getStatusMarker(undefined), "○");
        });
    });

    describe("_wasAtBottom and _stickToBottom", () => {
        it("should count anything within 12px of the end as at the bottom", () => {
            assert.isTrue(_wasAtBottom({ scrollTop: 400, clientHeight: 100, scrollHeight: 500 }));
            assert.isTrue(_wasAtBottom({ scrollTop: 388, clientHeight: 100, scrollHeight: 500 }));
            assert.isFalse(_wasAtBottom({ scrollTop: 387, clientHeight: 100, scrollHeight: 500 }));
            assert.isFalse(_wasAtBottom(null));
        });

        it("should scroll to the end only when asked to", () => {
            const el = { scrollTop: 10, scrollHeight: 900 };
            _stickToBottom(el, false);
            assert.equal(el.scrollTop, 10);

            _stickToBottom(el, true);
            assert.equal(el.scrollTop, 900);

            _stickToBottom(null, true);
        });
    });

    describe("_setDurationText", () => {
        it("should show a positive duration in ms and hide anything else", () => {
            const el = _element();
            _setDurationText(el, 125);
            assert.equal(el.textContent, "125ms");
            assert.equal(el.style.display, "inline-flex");

            _setDurationText(el, 0);
            assert.equal(el.textContent, "");
            assert.equal(el.style.display, "none");

            _setDurationText(el, "12");
            assert.equal(el.style.display, "none", "a string is not a duration");

            _setDurationText(null, 5);
        });
    });

    describe("_setStatusClass", () => {
        it("should swap the status class, leaving unrelated classes alone", () => {
            const el = _element();
            el.classList.add("chip", "chip-running");

            _setStatusClass(el, "chip", "failed");

            assert.deepEqual(el.classes, ["chip", "chip-failed"]);
        });
    });

    describe("_setNodeHidden", () => {
        it("should mark and unmark a node in both the attribute the filter queries and the style the eye sees", () => {
            const el = _element();
            _setNodeHidden(el, true);
            assert.equal(el.getAttribute("data-filter-hidden"), "1");
            assert.equal(el.style.display, "none");

            _setNodeHidden(el, false);
            assert.isNull(el.getAttribute("data-filter-hidden"));
            assert.strictEqual(el.style.display, "", "cleared, so the stylesheet decides again");

            _setNodeHidden(null, true);
        });
    });

    describe("createRerunButton", () => {
        function _create(suiteTitle: string, testTitle: string): any {
            let button: any = null;
            _withGlobal("document", { createElement: (tag: string) => Object.assign(_element(), { tag: tag }) }, () => {
                button = createRerunButton(suiteTitle, testTitle, "Run again");
            });

            return button;
        }

        it("should carry its scope as data attributes for the delegated click handler", () => {
            const button = _create("outer", "outer > alpha");
            assert.equal(button.tag, "button");
            assert.equal(button.type, "button");
            assert.equal(button.getAttribute("data-rerun-suite"), "outer");
            assert.equal(button.getAttribute("data-rerun-test"), "outer > alpha");
            assert.equal(button.title, "Run again");
            assert.equal(button.getAttribute("aria-label"), "Run again");
            assert.equal(button.className, "rerun-btn tiny-btn");
        });

        it("should name no test on a suite's button, so the click is read as a whole-suite rerun", () => {
            const button = _create("outer", "");
            assert.equal(button.getAttribute("data-rerun-suite"), "outer");
            assert.isNull(button.getAttribute("data-rerun-test"));
        });

        it("should always write the suite attribute, even for the default suite", () => {
            const button = _create("", "loose test");
            assert.strictEqual(button.getAttribute("data-rerun-suite"), "");
        });
    });
});
