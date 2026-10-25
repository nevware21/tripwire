/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach, isUnsafePropKey } from "@nevware21/ts-utils";
import { ITripwireModule } from "../interfaces/ITripwireModule";
import { IConfigInst } from "@nevware21/tripwire";

function _applyGlobalRunnerConfig(tripwire: ITripwireModule, parsed: any): () => void {
    const assertConfig = tripwire.assertConfig;

    if (!assertConfig) {
        return () => {
            // No config surface exposed by the loaded tripwire runtime.
        };
    }

    const trackedKeys: (keyof typeof assertConfig)[] = [ "timeout", "slow", "retries" ];
    const previous: { [key in keyof IConfigInst]?: any } = {};
    const changed: (keyof typeof assertConfig)[] = [];

    arrForEach(trackedKeys, (key) => {
        const value: any = parsed ? parsed[key] : undefined;

        if (!isUnsafePropKey(key) && value !== undefined) {
            previous[key] = assertConfig[key];
            (assertConfig as any)[key] = value;
            changed.push(key);
        }
    });

    return () => {
        arrForEach(changed, (key) => {
            if (!isUnsafePropKey(key)) {
                (assertConfig as any)[key] = previous[key];
            }
        });
    };
}

export function _installGlobalApi(tripwire: ITripwireModule, parsed: any) {
    const gbl = global as any;

    gbl.describe = tripwire.describe;
    gbl.suite = tripwire.suite;
    gbl.xdescribe = tripwire.xdescribe;
    gbl.fdescribe = tripwire.fdescribe;
    gbl.it = tripwire.it;
    gbl.spec = tripwire.spec;
    gbl.test = tripwire.test;
    gbl.xit = tripwire.xit;
    gbl.fit = tripwire.fit;
    gbl.before = tripwire.before;
    gbl.beforeAll = tripwire.beforeAll;
    gbl.beforeEach = tripwire.beforeEach;
    gbl.after = tripwire.after;
    gbl.afterAll = tripwire.afterAll;
    gbl.afterEach = tripwire.afterEach;
    gbl.assert = tripwire.assert;
    gbl.expect = tripwire.expect;

    return _applyGlobalRunnerConfig(tripwire, parsed);
}


