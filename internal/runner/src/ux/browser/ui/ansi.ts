/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Terminal colour codes, drawn in the page. The reporters running in the page colour their output for
 * the CLI's terminal, which receives every line the page logs; the page's log panel shows the same
 * lines in the same colours.
 *
 * Only the select graphic rendition (SGR, `ESC [ ... m`) codes change how text looks: bold, dim,
 * italic and underline, the 8 standard and 8 bright foreground and background colours (as classes,
 * which the stylesheet colours for the log panel's dark background), and 256 and 24-bit colours (as
 * the CSS colour itself). Every other escape sequence -- cursor movement, erasing, a hyperlink's
 * OSC wrapper -- is dropped.
 */

import { parseAnsi } from "@nevware21/chromacon";

/** A run of text drawn one way. */
export interface IAnsiSegment {
    text: string;
    // The `ansi-*` classes it is drawn with
    classes: string[];
    // A 256 or 24-bit colour, as CSS, in place of a colour class
    color?: string;
    background?: string;
}

interface IAnsiState {
    fg: string;
    bg: string;
    color: string;
    background: string;
    bold: boolean;
    dim: boolean;
    italic: boolean;
    underline: boolean;
}

// The levels of each channel in the xterm 256 colour cube (codes 16 to 231)
const _CUBE_LEVELS = [ 0, 95, 135, 175, 215, 255 ];

function _resetState(state: IAnsiState) {
    state.fg = "";
    state.bg = "";
    state.color = "";
    state.background = "";
    state.bold = false;
    state.dim = false;
    state.italic = false;
    state.underline = false;
}

function _isByte(value: number) {
    return value >= 0 && value <= 255;
}

/** One of the 256 xterm colours: the first 16 as their class, the rest as CSS. */
function _palette(n: number, isFg: boolean): { cls: string, css: string } | null {
    if (!_isByte(n)) {
        return null;
    }

    if (n < 16) {
        return { cls: (isFg ? "ansi-fg-" : "ansi-bg-") + ((n < 8 ? (isFg ? 30 : 40) : (isFg ? 82 : 92)) + n), css: "" };
    }

    if (n >= 232) {
        var grey = 8 + (n - 232) * 10;
        return { cls: "", css: "rgb(" + grey + "," + grey + "," + grey + ")" };
    }

    var index = n - 16;
    return {
        cls: "",
        css: "rgb(" + _CUBE_LEVELS[Math.floor(index / 36)] + "," + _CUBE_LEVELS[Math.floor(index / 6) % 6] + "," + _CUBE_LEVELS[index % 6] + ")"
    };
}

function _setColor(state: IAnsiState, isFg: boolean, cls: string, css: string) {
    if (isFg) {
        state.fg = cls;
        state.color = css;
    } else {
        state.bg = cls;
        state.background = css;
    }
}

/** Applies one SGR sequence's parameters ("1;31", "38;5;208", or "" for a reset) to `state`. */
function _applySgr(state: IAnsiState, params: string) {
    var codes = params.split(";").map(function(param) {
        return param === "" ? 0 : parseInt(param, 10);
    });

    for (var lp = 0; lp < codes.length; lp++) {
        var code = codes[lp];
        if (code === 0) {
            _resetState(state);
        } else if (code === 1) {
            state.bold = true;
        } else if (code === 2) {
            state.dim = true;
        } else if (code === 3) {
            state.italic = true;
        } else if (code === 4) {
            state.underline = true;
        } else if (code === 22) {
            state.bold = false;
            state.dim = false;
        } else if (code === 23) {
            state.italic = false;
        } else if (code === 24) {
            state.underline = false;
        } else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
            _setColor(state, true, "ansi-fg-" + code, "");
        } else if (code === 39) {
            _setColor(state, true, "", "");
        } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) {
            _setColor(state, false, "ansi-bg-" + code, "");
        } else if (code === 49) {
            _setColor(state, false, "", "");
        } else if (code === 38 || code === 48) {
            // 38;5;n and 38;2;r;g;b (48 for the background); a malformed one ends the sequence
            var isFg = code === 38;
            if (codes[lp + 1] === 5 && lp + 2 < codes.length) {
                var picked = _palette(codes[lp + 2], isFg);
                if (picked) {
                    _setColor(state, isFg, picked.cls, picked.css);
                }

                lp += 2;
            } else if (codes[lp + 1] === 2 && lp + 4 < codes.length) {
                var rgb = codes.slice(lp + 2, lp + 5);
                if (_isByte(rgb[0]) && _isByte(rgb[1]) && _isByte(rgb[2])) {
                    _setColor(state, isFg, "", "rgb(" + rgb.join(",") + ")");
                }

                lp += 4;
            } else {
                break;
            }
        }
    }
}

// A select graphic rendition sequence -- ESC [ (or the one-byte CSI) then its parameters, then m --
// the only kind of escape sequence that changes how the text after it looks
// eslint-disable-next-line no-control-regex
const _SGR = /^(?:\u001b\[|\u009b)([0-9;]*)m$/;

// eslint-disable-next-line no-control-regex
const _ESCAPE = /^[\u001b\u009b]/;

/**
 * `text` split into runs, each with how it is drawn. chromacon's `parseAnsi` finds the escape
 * sequences -- every kind, OSC hyperlinks included -- and this works out what each SGR one does to
 * the text after it; the sequences themselves are gone. Neighbouring runs drawn the same way are one.
 */
export function toAnsiSegments(text: string): IAnsiSegment[] {
    var segments: IAnsiSegment[] = [];
    var state: IAnsiState = {} as IAnsiState;
    _resetState(state);

    function push(part: string) {
        var classes: string[] = [];
        if (state.fg) {
            classes.push(state.fg);
        }

        if (state.bg) {
            classes.push(state.bg);
        }

        [ "bold", "dim", "italic", "underline" ].forEach(function(name) {
            if ((state as any)[name]) {
                classes.push("ansi-" + name);
            }
        });

        var last = segments[segments.length - 1];
        if (last && last.classes.join(" ") === classes.join(" ") && last.color === (state.color || undefined) &&
                last.background === (state.background || undefined)) {
            last.text += part;
            return;
        }

        var segment: IAnsiSegment = { text: part, classes: classes };
        if (state.color) {
            segment.color = state.color;
        }

        if (state.background) {
            segment.background = state.background;
        }

        segments.push(segment);
    }

    var parts = parseAnsi(String(text));
    for (var lp = 0; lp < parts.length; lp++) {
        var part = parts[lp];
        if (_ESCAPE.test(part)) {
            var sgr = _SGR.exec(part);
            if (sgr) {
                _applySgr(state, sgr[1]);
            }
        } else if (part) {
            push(part);
        }
    }

    return segments;
}

/** Appends `segments` to `target`: plain runs as text, the others as styled spans. */
export function appendAnsiSegments(target: HTMLElement, segments: IAnsiSegment[]) {
    for (var lp = 0; lp < segments.length; lp++) {
        var segment = segments[lp];
        if (!segment.classes.length && !segment.color && !segment.background) {
            target.appendChild(document.createTextNode(segment.text));
            continue;
        }

        var span = document.createElement("span");
        span.className = segment.classes.join(" ");
        if (segment.color) {
            span.style.color = segment.color;
        }

        if (segment.background) {
            span.style.backgroundColor = segment.background;
        }

        span.textContent = segment.text;
        target.appendChild(span);
    }
}
