/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * The parts of a browser the interactive page's modules (src/ux/browser/ui) touch, as plain objects,
 * so those modules can be tested on node.
 */

/** A listener added to a stand-in element or document. */
interface IListener {
    fn: (evt: any) => void;
    capture: boolean;
}

/** A small DOM event: its type, plus whatever the test sets on it (`key`, ...). */
export function stubEvent(type: string, extra?: { [name: string]: any }): any {
    const evt: any = {
        type: type,
        target: null,
        defaultPrevented: false,
        propagationStopped: false,
        preventDefault: () => {
            evt.defaultPrevented = true;
        },
        stopPropagation: () => {
            evt.propagationStopped = true;
        }
    };

    return Object.assign(evt, extra || {});
}

function _listen(listeners: { [type: string]: IListener[] }, type: string, fn: (evt: any) => void, options?: any): void {
    const capture = options === true || !!(options && options.capture);
    (listeners[type] = listeners[type] || []).push({ fn: fn, capture: capture });
}

function _unlisten(listeners: { [type: string]: IListener[] }, type: string, fn: (evt: any) => void): void {
    const found = listeners[type] || [];
    for (let lp = found.length - 1; lp >= 0; lp--) {
        if (found[lp].fn === fn) {
            found.splice(lp, 1);
        }
    }
}

function _fire(owner: any, evt: any, capture: boolean): void {
    const found = ((owner && owner.listeners && owner.listeners[evt.type]) || []).slice(0);
    for (let lp = 0; lp < found.length && !evt.propagationStopped; lp++) {
        if (found[lp].capture === capture) {
            found[lp].fn(evt);
        }
    }
}

/**
 * Whether `el` matches one simple selector: a tag name, `.class`, `#id`, or an attribute test such as
 * `[role='menuitem']` or `[hidden]`.
 */
function _matches(el: any, selector: string): boolean {
    const sel = selector.trim();
    const attr = /^\[([\w-]+)(?:=['"]?([^'"\]]*)['"]?)?\]$/.exec(sel);
    if (attr) {
        return attr[2] === undefined ? el.hasAttribute(attr[1]) : el.getAttribute(attr[1]) === attr[2];
    }

    if (sel.charAt(0) === ".") {
        return el.classList.contains(sel.substring(1));
    }

    if (sel.charAt(0) === "#") {
        return el.id === sel.substring(1);
    }

    return String(el.tagName || "").toLowerCase() === sel.toLowerCase();
}

/**
 * A plain object with the element members the ui modules under test touch. `kids` holds its children;
 * setting `textContent` clears them, as a real element does, while reading it returns only the text
 * set on this element (see {@link textOf} for the text of a whole subtree).
 */
export function stubElement(id: string, tagName?: string): any {
    const attrs: { [name: string]: string } = {};
    const classes: string[] = [];
    const listeners: { [type: string]: IListener[] } = {};
    let text = "";
    let html = "";

    function _adopt(child: any): void {
        if (child && child.parentNode && child.parentNode !== el && child.parentNode.removeChild) {
            child.parentNode.removeChild(child);
        }

        if (child) {
            child.parentNode = el;
        }
    }

    const el: any = {
        id: id,
        tagName: (tagName || "").toUpperCase(),
        value: "",
        checked: false,
        disabled: false,
        open: false,
        style: {},
        attrs: attrs,
        kids: [] as any[],
        listeners: listeners,
        parentNode: null,
        scrollTop: 0,
        scrollHeight: 0,
        clientHeight: 0,
        scrolledIntoView: [] as any[],
        setAttribute: (name: string, value: any) => {
            attrs[name] = String(value);
        },
        getAttribute: (name: string) => (name in attrs ? attrs[name] : null),
        hasAttribute: (name: string) => name in attrs,
        removeAttribute: (name: string) => {
            delete attrs[name];
        },
        classList: {
            add: (...names: string[]) => {
                names.forEach((cls) => {
                    if (classes.indexOf(cls) === -1) {
                        classes.push(cls);
                    }
                });
            },
            remove: (...names: string[]) => {
                names.forEach((cls) => {
                    const idx = classes.indexOf(cls);
                    if (idx !== -1) {
                        classes.splice(idx, 1);
                    }
                });
            },
            contains: (cls: string) => classes.indexOf(cls) !== -1,
            toggle: (cls: string, force?: boolean) => {
                const on = force === undefined ? classes.indexOf(cls) === -1 : !!force;
                if (on) {
                    el.classList.add(cls);
                } else {
                    el.classList.remove(cls);
                }

                return on;
            }
        },
        appendChild: (child: any) => {
            const added = child && child.fragment ? child.kids.slice(0) : [ child ];
            added.forEach(_adopt);
            el.kids.push.apply(el.kids, added);

            return child;
        },
        insertBefore: (child: any, ref: any) => {
            _adopt(child);
            const idx = el.kids.indexOf(ref);
            el.kids.splice(idx === -1 ? el.kids.length : idx, 0, child);

            return child;
        },
        removeChild: (child: any) => {
            el.kids.splice(el.kids.indexOf(child), 1);
            if (child) {
                child.parentNode = null;
            }

            return child;
        },
        remove: () => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        },
        addEventListener: (type: string, fn: (evt: any) => void, options?: any) => _listen(listeners, type, fn, options),
        removeEventListener: (type: string, fn: (evt: any) => void) => _unlisten(listeners, type, fn),
        // Capture from the top down to this element, then bubble back up, then the document's listeners
        dispatchEvent: (evt: any) => {
            const path: any[] = [];
            for (let node = el; node; node = node.parentNode) {
                path.push(node);
            }

            evt.target = evt.target || el;
            for (let lp = path.length - 1; lp >= 0 && !evt.propagationStopped; lp--) {
                _fire(path[lp], evt, true);
            }

            for (let lp = 0; lp < path.length && !evt.propagationStopped; lp++) {
                _fire(path[lp], evt, false);
            }

            const doc = (globalThis as any).document;
            if (doc && doc.listeners && !evt.propagationStopped) {
                _fire(doc, evt, false);
            }

            return !evt.defaultPrevented;
        },
        click: () => el.dispatchEvent(stubEvent("click")),
        focus: () => {
            const doc = (globalThis as any).document;
            if (doc) {
                doc.activeElement = el;
            }
        },
        matches: (selector: string) => _matches(el, selector),
        closest: (selector: string) => {
            for (let node = el; node && node.matches; node = node.parentNode) {
                if (node.matches(selector)) {
                    return node;
                }
            }

            return null;
        },
        contains: (node: any) => {
            for (let current = node; current; current = current.parentNode) {
                if (current === el) {
                    return true;
                }
            }

            return false;
        },
        querySelectorAll: (selector: string) => {
            const found: any[] = [];
            const visit = (node: any) => {
                (node.kids || []).forEach((child: any) => {
                    if (child && child.matches && child.matches(selector)) {
                        found.push(child);
                    }

                    if (child) {
                        visit(child);
                    }
                });
            };
            visit(el);

            return found;
        },
        querySelector: (selector: string) => el.querySelectorAll(selector)[0] || null,
        scrollIntoView: (options?: any) => {
            el.scrolledIntoView.push(options);
        }
    };

    Object.defineProperty(el, "textContent", {
        get: () => text,
        set: (value: string) => {
            text = value;
            el.kids.length = 0;
        }
    });
    Object.defineProperty(el, "innerHTML", {
        get: () => html,
        set: (value: string) => {
            html = value;
            el.kids.length = 0;
        }
    });
    Object.defineProperty(el, "className", {
        get: () => classes.join(" "),
        set: (value: string) => {
            classes.length = 0;
            String(value || "").split(/\s+/).filter(Boolean).forEach((cls) => classes.push(cls));
        }
    });
    Object.defineProperty(el, "children", { get: () => el.kids });
    Object.defineProperty(el, "parentElement", { get: () => el.parentNode });
    Object.defineProperty(el, "childElementCount", { get: () => el.kids.length });
    Object.defineProperty(el, "firstElementChild", { get: () => el.kids[0] || null });

    return el;
}

/** The text of an element and everything under it, the way a page would show it. */
export function textOf(el: any): string {
    if (!el) {
        return "";
    }

    return (el.textContent || "") + (el.kids || []).map(textOf).join("");
}

/**
 * A stand-in `document` for code that builds elements while it runs. `getElementById` reads the same
 * registry as {@link uxDom} -- creating a missing element when `createMissing` is set, as the page's
 * `./dom` needs when it loads -- and document-level listeners are kept so a test can fire them.
 */
export function stubDocument(registry?: { [id: string]: any }, createMissing?: boolean): any {
    const ids = registry || {};
    const listeners: { [type: string]: IListener[] } = {};
    const doc: any = {
        body: stubElement("body", "body"),
        activeElement: null,
        listeners: listeners,
        createElement: (tag: string) => stubElement("", tag),
        createDocumentFragment: () => {
            const fragment: any = { fragment: true, kids: [] as any[] };
            fragment.appendChild = (child: any) => {
                fragment.kids.push(child);
            };

            return fragment;
        },
        getElementById: (id: string) => ids[id] || (createMissing ? (ids[id] = stubElement(id)) : null),
        addEventListener: (type: string, fn: (evt: any) => void, options?: any) => _listen(listeners, type, fn, options),
        removeEventListener: (type: string, fn: (evt: any) => void) => _unlisten(listeners, type, fn)
    };

    return doc;
}

/**
 * Installs a {@link stubDocument} as the global `document` and returns what puts the previous one
 * back. Meant for a beforeEach/afterEach pair: nothing outside the test should see a document.
 */
export function useStubDocument(registry?: { [id: string]: any }): { document: any, restore: () => void } {
    const g = globalThis as any;
    const had = Object.prototype.hasOwnProperty.call(g, "document");
    const previous = g.document;
    const doc = stubDocument(registry);
    g.document = doc;

    return {
        document: doc,
        restore: () => {
            if (had) {
                g.document = previous;
            } else {
                delete g.document;
            }
        }
    };
}

/**
 * `./dom` looks every element it exports up from `document` once, as it loads, and node has no
 * `document`. This hands it the smallest stand-in that lets it load -- one plain object per id,
 * created on demand -- and takes `document` away again straight afterwards so nothing else in the
 * process can mistake this for a browser. The objects live in a registry on `globalThis` because
 * `./dom` loads once per process, for whichever test file gets there first: every file that needs
 * them has to read the same objects back, whoever created them.
 */
export function uxDom(): { [id: string]: any } {
    const g = globalThis as any;
    const registry = g.__tripwireUxDomStub || (g.__tripwireUxDomStub = {});
    const hadDocument = !!g.document;

    if (!hadDocument) {
        g.document = {
            body: null,
            getElementById: (id: string) => registry[id] || (registry[id] = stubElement(id))
        };
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("../../../src/ux/browser/ui/dom");
    } finally {
        if (!hadDocument) {
            delete g.document;
        }
    }

    return registry;
}
