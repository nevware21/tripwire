/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createCachedValue, isFunction } from "@nevware21/ts-utils";
import { ITripwireModule } from "../interfaces/ITripwireModule";
import { IServer } from "../interfaces/IServer";
import { _createTestServerAdapter } from "../client/createTestServerAdapter";

export function _createRunnerHost(tripwire: ITripwireModule, testServer: IServer | null): any {
    const configInst = tripwire && tripwire.assertConfig && tripwire.assertConfig.$ops && isFunction(tripwire.assertConfig.$ops.clone)
        ? tripwire.assertConfig.$ops.clone()
        : tripwire.assertConfig;
    const runnerServer = _createTestServerAdapter(testServer);

    const host: any = {
        opts: createCachedValue(configInst),
        notifyMgr: tripwire.createNotifyMgr ? tripwire.createNotifyMgr() : null,
        serverMgr: {
            server: runnerServer,
            start: function() {
                return runnerServer && runnerServer.start ? runnerServer.start() : runnerServer;
            },
            setProvider: function(_provider: any) {
                // Runner host for CLI execution uses a fixed server instance.
            }
        },
        clone: function() {
            return _createRunnerHost(tripwire, testServer);
        }
    };

    return host;
}

