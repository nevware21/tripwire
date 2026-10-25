/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { getDeferred } from "@nevware21/ts-utils";
import { assert } from "../../../src/assert/assertClass";
import { addAssertionListener, assertConfig, removeAssertionListener } from "../../../src/config/assertConfig";
import { getCurrentHost, useHost, withHost } from "../../../src/config/configHost";
import { _gblConfigHost } from "../../../src/internal/_configHost";
import { IConfigHost } from "../../../src/interfaces/IConfigHost";
import { IListener } from "../../../src/interfaces/IListener";
import { IListenerContext } from "../../../src/interfaces/IListenerContext";
import { eListenerEvent } from "../../../src/types/ListenerEvent";

function runCtx() {
    return getDeferred<IListenerContext>(() => ({ type: eListenerEvent.Run, suite: null } as any));
}

/**
 * Outside of any useHost()/withHost() scope the listener functions resolve to the global default
 * host, which must therefore carry a notification manager of its own -- and a host cloned from it
 * chains to that manager, so listeners registered globally also observe a scoped host's events.
 */
describe("assertConfig scoped values", () => {
    it("reads and writes through assertConfig go to the active host while a scope is installed", () => {
        const gblVerbose = assertConfig.isVerbose;
        const gblMaxProps = assertConfig.format.maxProps;

        withHost((host) => {
            assert.equal(assertConfig.isVerbose, gblVerbose, "a fresh clone starts from the global values");

            assertConfig.isVerbose = !gblVerbose;
            assertConfig.format.maxProps = gblMaxProps + 5;

            assert.equal(assertConfig.isVerbose, !gblVerbose, "the write is visible through assertConfig");
            assert.equal(host.opts.v.isVerbose, !gblVerbose, "and landed on the scoped host's own config");
            assert.equal(host.opts.v.format.maxProps, gblMaxProps + 5);
            assert.notEqual(host.opts.v, assertConfig, "the scoped host has a config of its own");
            assert.equal(_gblConfigHost().opts.v.isVerbose, gblVerbose, "the global host's own config is untouched");
            assert.equal(_gblConfigHost().opts.v.format.maxProps, gblMaxProps);
        });

        assert.equal(assertConfig.isVerbose, gblVerbose, "leaving the scope restores the global values");
        assert.equal(assertConfig.format.maxProps, gblMaxProps);
    });

    it("$ops operations resolve against the active host", () => {
        // assertConfig *is* the global host's config object (the same identity, with its accessors routed to the
        // active host), so the global format manager has to be captured while no scope is installed.
        const gblVerbose = assertConfig.isVerbose;
        const gblFormatMgr = assertConfig.$ops.formatMgr;

        withHost((host) => {
            assert.notEqual(assertConfig.$ops.formatMgr, gblFormatMgr, "the scoped host has its own format manager");
            assert.equal(assertConfig.$ops.formatMgr, host.opts.v.$ops.formatMgr);

            assertConfig.isVerbose = !gblVerbose;
            assertConfig.$ops.reset();
            assert.equal(host.opts.v.isVerbose, gblVerbose, "reset applies to the scoped config, back to the values it was cloned with");
        });

        assert.equal(assertConfig.$ops.formatMgr, gblFormatMgr, "outside a scope the global manager is returned");
    });

    it("a host whose options carry no $ops falls back to the global operations", () => {
        const gblVerbose = assertConfig.isVerbose;
        const gblFormatMgr = assertConfig.$ops.formatMgr;
        const bare: IConfigHost = {
            opts: getDeferred(() => ({ isVerbose: !gblVerbose } as any)),
            clone: () => bare
        };

        useHost(bare, () => {
            assert.equal(assertConfig.isVerbose, !gblVerbose, "values are read from the installed host's options");
            assert.equal(assertConfig.$ops.formatMgr, gblFormatMgr, "operations come from the global config");
        });

        assert.equal(assertConfig.isVerbose, gblVerbose);
    });

    it("a host without a notification manager registers listeners on the global one", () => {
        const bare: IConfigHost = {
            opts: getDeferred(() => ({} as any)),
            clone: () => bare
        };
        let starts = 0;

        useHost(bare, () => {
            const removable = addAssertionListener({
                onStart: () => {
                    starts++;
                }
            });

            try {
                assert.isTrue(_gblConfigHost().notifyMgr.hasListeners(), "the listener went to the global manager");
                _gblConfigHost().notifyMgr.notifyStart(eListenerEvent.Run, runCtx());
                assert.equal(starts, 1);
            } finally {
                removable.rm();
            }
        });

        assert.isFalse(_gblConfigHost().notifyMgr.hasListeners());
    });

    it("is a facade distinct from the global host's own configuration", () => {
        assert.notEqual(assertConfig, _gblConfigHost().opts.v);
        assert.notEqual(assertConfig.$ops, _gblConfigHost().opts.v.$ops);
        assert.equal(assertConfig.$ops.formatMgr, _gblConfigHost().opts.v.$ops.formatMgr, "outside a scope it reaches the global operations");
    });

    it("cloning the global host while another host is active copies the global values, not the active ones", () => {
        const gblFullStack = assertConfig.fullStack;

        withHost((active) => {
            assertConfig.fullStack = !gblFullStack;
            assert.equal(active.opts.v.fullStack, !gblFullStack);

            const copy = _gblConfigHost().clone();
            assert.equal(copy.opts.v.fullStack, gblFullStack, "the clone is built from the global host's own options");
            assert.equal(copy.opts.v.$ops.formatMgr.getFormatters().length, 0);

            const nested = active.clone();
            assert.equal(nested.opts.v.fullStack, !gblFullStack, "while a clone of the active host carries its values");
        });
    });

    it("writes outside any scope go to the global config", () => {
        const before = assertConfig.isVerbose;

        try {
            assertConfig.isVerbose = !before;
            assert.equal(_gblConfigHost().opts.v.isVerbose, !before);
        } finally {
            assertConfig.isVerbose = before;
        }
    });
});

describe("assertConfig listeners", () => {
    it("the global default host carries its own notification and server managers", () => {
        const gbl = _gblConfigHost();

        assert.isObject(gbl.notifyMgr, "notifyMgr");
        assert.isObject(gbl.serverMgr, "serverMgr");
        assert.equal(getCurrentHost(), gbl, "no scope is active for this test");
    });

    it("addAssertionListener outside any scope registers on the global host", () => {
        let starts = 0;
        const listener: IListener = {
            onStart: () => {
                starts++;
            }
        };

        const removable = addAssertionListener(listener);
        try {
            _gblConfigHost().notifyMgr.notifyStart(eListenerEvent.Run, runCtx());
            assert.equal(starts, 1, "the global manager notifies the listener");
        } finally {
            removable.rm();
        }

        _gblConfigHost().notifyMgr.notifyStart(eListenerEvent.Run, runCtx());
        assert.equal(starts, 1, "a removed listener is no longer notified");
    });

    it("removeAssertionListener outside any scope removes from the global host", () => {
        let starts = 0;
        const listener: IListener = {
            onStart: () => {
                starts++;
            }
        };

        addAssertionListener(listener);
        removeAssertionListener(listener);
        _gblConfigHost().notifyMgr.notifyStart(eListenerEvent.Run, runCtx());

        assert.equal(starts, 0);
    });

    it("a host cloned from the global host inherits globally registered listeners", () => {
        let starts = 0;
        const removable = addAssertionListener({
            onStart: () => {
                starts++;
            }
        });

        try {
            withHost((host) => {
                assert.notEqual(host.notifyMgr, _gblConfigHost().notifyMgr, "the scoped host has its own manager");
                host.notifyMgr.notifyStart(eListenerEvent.Run, runCtx());
            });

            assert.equal(starts, 1, "the scoped manager delegates to the global one");
        } finally {
            removable.rm();
        }
    });

    it("a host cloned from the global host chains its server manager to the global one", () => {
        const gblServerMgr = _gblConfigHost().serverMgr;
        const server: any = { url: "", port: 0, isRunning: true, start: (): any => server, stop: (): any => null };
        gblServerMgr.setProvider({ canProvideServer: true, getServer: () => server });

        try {
            withHost((host) => {
                assert.isObject(host.serverMgr, "the clone has a server manager of its own");
                assert.notEqual(host.serverMgr, gblServerMgr);
                assert.equal(host.serverMgr.server, server, "with no provider of its own it defers to the global manager");
            });
        } finally {
            gblServerMgr.setProvider({ canProvideServer: false });
        }
    });

    it("addAssertionListener inside a scope registers on that scope's host only", () => {
        let starts = 0;

        withHost((host) => {
            const removable = addAssertionListener({
                onStart: () => {
                    starts++;
                }
            });

            try {
                assert.isTrue(host.notifyMgr.hasListeners());
                _gblConfigHost().notifyMgr.notifyStart(eListenerEvent.Run, runCtx());
                assert.equal(starts, 0, "the global manager does not see a scoped listener");

                host.notifyMgr.notifyStart(eListenerEvent.Run, runCtx());
                assert.equal(starts, 1);
            } finally {
                removable.rm();
            }
        });
    });
});
