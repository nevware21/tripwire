/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { objDefineProps } from "@nevware21/ts-utils";
import { ISuiteStateContext } from "./interfaces/ISuiteStateContext";
import { ITestSuite } from "./interfaces/ITestSuite";

export function _createContext() : ISuiteStateContext {
    let stack: ITestSuite[] = [];
    let root: ITestSuite | null = null;

    function _resetSuite(): void {
        stack = [];
        root = null;
    }

    let context: ISuiteStateContext = {
        current: null,
        root: root,
        length: 0,
        reset: _resetSuite,
        add: (suite: ITestSuite) => {
            stack.push(suite);
        },
        rm: (suite: ITestSuite) => {
            // Search from the top: the most recently pushed instance of a suite is the one being closed
            for (let idx = stack.length - 1; idx >= 0; idx--) {
                if (stack[idx] === suite) {
                    stack.splice(idx, 1);
                    return true;
                }
            }

            return false;
        }
    };

    return objDefineProps(context, {
        current: {
            g: () => {
                return stack.length ? stack[stack.length - 1] : null;
            }
        },
        length: {
            g: () => stack.length
        },
        root: {
            g: () => root,
            s: (newRoot: ITestSuite) => {
                root = newRoot;
            }
        }
    });
}

