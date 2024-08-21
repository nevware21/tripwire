/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { objAssign, objDefine, objForEachKey } from "@nevware21/ts-utils";
import { IAssertConfig, IAssertConfigDefaults } from "./interface/IAssertConfig";

/**
 * @internal
 * @ignore
 * The default configuration values.
 */
const DEFAULT_CONFIG: IAssertConfig = {
    isVerbose: false,
    fullStack: false,
    defAssertMsg: "assertion failure",
    defFatalMsg: "fatal assertion failure"
};

export const assertConfig: IAssertConfigDefaults = (function() {
    let theValues = objAssign({}, DEFAULT_CONFIG);
    let theConfig: IAssertConfigDefaults = {
        clone: (options?: IAssertConfig) => {
            let newConfig: any = {};

            // Copy all of the values from the current config to the new config.
            objForEachKey(DEFAULT_CONFIG, (key: keyof IAssertConfig) => {
                if (options && options[key] !== undefined) {
                    newConfig[key] = options[key];
                } else {
                    newConfig[key] = theConfig[key];
                }
            });

            return newConfig;
        }
    };
    
    // Provide an accessor for each of the supported configuration values.
    objForEachKey(DEFAULT_CONFIG, (key: keyof IAssertConfig) => {
        objDefine(theConfig, key, {
            g: () => theValues[key],
            s: (value) => theValues[key] = value
        });
    });

    return theConfig;
})();
