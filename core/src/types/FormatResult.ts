/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { createEnum } from "@nevware21/ts-utils";

/**
 * Indicates the result of a formatting operation.
 *
 * @since 0.1.3
 * @group Formatter
 */
export const enum eFormatResult {
    /**
     * The value was successfully formatted and should be used.
     */
    Ok = 0,

    /**
     * The value was formatted, but continue trying other formatters to find a better result.
     */
    Continue = 1,

    /**
     * The formatter could not format this value. Try the next formatter.
     */
    Skip = 2,

    /**
     * An error occurred while formatting the value, this indicates a failure in the formatting process
     * either explicitly set by the formatter or due to an exception being thrown.
     */
    Failed = 3
}

/**
 * Indicates the result of a formatting operation.
 *
 * @since 0.1.3
 * @group Formatter
 */
export const FormatResult = createEnum<typeof eFormatResult>({
    Ok: eFormatResult.Ok,
    Continue: eFormatResult.Continue,
    Skip: eFormatResult.Skip,
    Failed: eFormatResult.Failed
});

export type FormatResult = number | eFormatResult;
