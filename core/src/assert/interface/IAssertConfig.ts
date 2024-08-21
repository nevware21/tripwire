/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { MsgSource } from "./types";

/**
 * Provides the options for the current context
 */
export interface IAssertConfig {
    
    /**
     * Identifies if the current context is verbose mode, which will include additional
     * information in the execution context and any resulting assertion failures.
     * @default false
     */
    isVerbose?: boolean;

    /**
     * Identifies if the current context is in full-stack mode, which will include the full
     * stack trace in the error message if an assertion fails.
     * @default false
     */
    fullStack?: boolean;

    /**
     * Defiines the default assertion failure message to display if no message is provided.
     * @default "assertion failed"
     */
    defAssertMsg?: MsgSource;

    /**
     * Defines the default fatal message to display if no message is provided.
     * @default "fatal assertion failure"
     * @remarks This is used for fatal errors that are not assertion failures.
     */
    defFatalMsg?: MsgSource;
}

export interface IAssertConfigDefaults extends IAssertConfig {
    
    /**
     * Returns the current context options in a new plain object
     * @param options - The options to override the current context options
     */
    clone: (options?: IAssertConfig) => IAssertConfig;
}
