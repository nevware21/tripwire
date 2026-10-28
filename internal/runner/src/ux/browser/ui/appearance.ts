/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createAutocomplete, IAutocomplete, IAutocompleteItem } from "./autocomplete";
import {
    applyPageSetting, findTheme, fitLayout, IThemeInfo, PageSettingName, readPageSetting, readRunSetting, readThemeChoice, readZoom,
    searchThemes, stepZoom, THEMES, ZOOM_LEVELS
} from "./theme";

/**
 * The Appearance panel the actions menu opens: the theme, color vision and the zoom (theme.ts says
 * what each does to the page).
 *
 * It is a small non-modal dialog rather than more entries in the menu because a menu may only hold
 * menu items, and the theme is a searchable combobox -- so however many themes there come to be,
 * any one is a few letters away. Built to the WAI-ARIA dialog pattern:
 *
 *  - "Appearance..." in the menu opens it with focus on the theme, whose list stays closed until
 *    asked for (a click, ArrowDown or typing);
 *  - Escape closes the theme's list while it is open, and otherwise the panel, putting focus back on
 *    the menu button; a click outside the panel, or focus leaving it, closes it too;
 *  - the zoom's buttons are aria-disabled rather than disabled at either end, so the one a keyboard
 *    is on never loses focus from under it.
 */

/** The panel's elements, and what to call when the zoom changes. */
export interface IAppearanceParts {
    // The menu entry that opens the panel, and the button focus goes back to when it closes
    item: HTMLElement | null;
    button: HTMLElement | null;
    panel: HTMLElement | null;
    themeInput: HTMLInputElement | null;
    themeList: HTMLElement | null;
    colorblindToggle: HTMLInputElement | null;
    zoomOut: HTMLElement | null;
    zoomIn: HTMLElement | null;
    zoomReset: HTMLElement | null;
    zoomValue: HTMLElement | null;
    // Called once the zoom has changed, for whatever has to fit the page again
    onZoom?: () => void;
}

/** What opens and closes the panel. */
export interface IAppearancePanel {
    open: () => void;
    close: (refocus: boolean) => void;
    isOpen: () => boolean;
}

/**
 * The theme rows for `query`: every theme while the input holds nothing or the current theme's
 * name, so the list opens on the whole choice, and otherwise the ones a search for it finds.
 */
export function themeCandidates(query: string): IAutocompleteItem[] {
    var current = findTheme(readThemeChoice());
    var text = String(query || "").trim().toLowerCase();
    var themes = !text || (current && current.name.toLowerCase() === text) ? THEMES : searchThemes(text);

    return themes.map(function(theme) {
        return { value: theme.name, label: theme.name };
    });
}

/** The theme `text` names in full, by its name or its id, ignoring case; or null. */
function _themeNamed(text: string): IThemeInfo | null {
    var lower = String(text || "").trim().toLowerCase();
    for (var lp = 0; lp < THEMES.length; lp++) {
        if (THEMES[lp].name.toLowerCase() === lower || THEMES[lp].id === lower) {
            return THEMES[lp];
        }
    }

    return null;
}

function _isDisabled(el: HTMLElement): boolean {
    return el.getAttribute("aria-disabled") === "true";
}

function _setDisabled(el: HTMLElement | null, disabled: boolean) {
    if (el) {
        el.setAttribute("aria-disabled", disabled ? "true" : "false");
    }
}

/**
 * Wires the panel up, and shows each setting as the page has it: the choice kept in this browser,
 * else the run's `--browser-theme`, else the default.
 */
export function createAppearancePanel(parts: IAppearanceParts): IAppearancePanel {
    var panel = parts.panel;
    var themeList: IAutocomplete | null = null;

    function isOpen(): boolean {
        return !!panel && !panel.hasAttribute("hidden");
    }

    function syncTheme() {
        var theme = findTheme(readThemeChoice());
        if (parts.themeInput && theme) {
            parts.themeInput.value = theme.name;
        }
    }

    function syncZoom() {
        var zoom = readZoom();
        var runZoom = +readRunSetting("zoom");
        if (parts.zoomValue) {
            parts.zoomValue.textContent = zoom + "%";
        }

        _setDisabled(parts.zoomOut, zoom <= ZOOM_LEVELS[0]);
        _setDisabled(parts.zoomIn, zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
        _setDisabled(parts.zoomReset, zoom === runZoom);
        if (parts.zoomReset) {
            parts.zoomReset.setAttribute("title", "Back to " + runZoom + "%");
        }
    }

    function setZoom(zoom: number) {
        if (applyPageSetting("zoom", String(zoom), true)) {
            syncZoom();
            if (parts.onZoom) {
                parts.onZoom();
            }
        }
    }

    function open() {
        if (!panel) {
            return;
        }

        panel.removeAttribute("hidden");
        if (parts.item) {
            parts.item.setAttribute("aria-expanded", "true");
        }

        syncTheme();
        syncZoom();
        if (parts.themeInput) {
            parts.themeInput.focus();
            // Typing starts a new search rather than adding to the current theme's name
            if (parts.themeInput.select) {
                parts.themeInput.select();
            }
        }
    }

    function close(refocus: boolean) {
        if (!panel || !isOpen()) {
            return;
        }

        if (themeList) {
            themeList.close();
        }

        syncTheme();
        panel.setAttribute("hidden", "");
        if (parts.item) {
            parts.item.setAttribute("aria-expanded", "false");
        }

        if (refocus && parts.button) {
            parts.button.focus();
        }
    }

    // runner.html applied each setting before the page first painted; this applies them again so
    // the panel and the page agree, whatever the inline script made of them
    ([ "theme", "vision", "zoom" ] as PageSettingName[]).forEach(function(name) {
        applyPageSetting(name, readPageSetting(name), false);
    });
    syncTheme();
    syncZoom();

    if (parts.themeInput && parts.themeList) {
        var input = parts.themeInput;
        themeList = createAutocomplete(input, parts.themeList, themeCandidates, { openOnFocus: false });

        // A theme picked from the list or typed out in full is applied; anything else is put back
        // to the current theme's name
        input.addEventListener("change", function() {
            var theme = _themeNamed(input.value);
            if (theme) {
                applyPageSetting("theme", theme.id, true);
            }

            syncTheme();
        });
    }

    if (parts.colorblindToggle) {
        var toggle = parts.colorblindToggle;
        toggle.checked = readPageSetting("vision") === "colorblind";
        toggle.addEventListener("change", function() {
            applyPageSetting("vision", toggle.checked ? "colorblind" : "standard", true);
        });
    }

    [ { el: parts.zoomOut, direction: -1 }, { el: parts.zoomIn, direction: 1 } ].forEach(function(step) {
        var el = step.el;
        if (el) {
            el.addEventListener("click", function() {
                if (!_isDisabled(el)) {
                    setZoom(stepZoom(readZoom(), step.direction));
                }
            });
        }
    });

    if (parts.zoomReset) {
        var reset = parts.zoomReset;
        reset.addEventListener("click", function() {
            if (!_isDisabled(reset)) {
                setZoom(+readRunSetting("zoom"));
            }
        });
    }

    if (parts.item) {
        parts.item.addEventListener("click", function() {
            // Once the menu has handled the same click -- closing, and putting focus on its button
            setTimeout(open, 0);
        });
    }

    if (panel) {
        var shown = panel;

        // Capture, so the theme's list is seen open before its own handler closes it on this Escape
        shown.addEventListener("keydown", function(evt: KeyboardEvent) {
            var listOpen = !!parts.themeInput && evt.target === parts.themeInput && parts.themeInput.getAttribute("aria-expanded") === "true";
            if (evt.key === "Escape" && !listOpen) {
                evt.preventDefault();
                close(true);
            }
        }, true);

        // Focus leaving the panel by any route -- Tab past its end, a click into another field --
        // closes it, so it is never left open behind where the user is. The panel takes focus itself
        // (tabindex -1) for a click on its background, which so stays inside.
        shown.addEventListener("focusout", function() {
            setTimeout(function() {
                if (isOpen() && !shown.contains(document.activeElement)) {
                    close(false);
                }
            }, 0);
        });

        document.addEventListener("click", function(evt) {
            var target = evt.target as Node;
            if (isOpen() && !shown.contains(target) && target !== parts.item) {
                close(false);
            }
        });
    }

    // The compact layout follows the window as well as the zoom
    if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("resize", fitLayout);
    }

    return { open: open, close: close, isOpen: isOpen };
}
