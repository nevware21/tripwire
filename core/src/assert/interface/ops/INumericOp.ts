/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { NumberFn } from "../funcs/NumericFn";
import { WithinFn } from "../funcs/WithinFn";

/**
 * @since 0.1.5
 */
export interface INumericOp<R> {
    above: NumberFn<R>;
    gt: NumberFn<R>;
    greaterThan: NumberFn<R>;
    least: NumberFn<R>;
    gte: NumberFn<R>;
    greaterThanOrEqual: NumberFn<R>;
    below: NumberFn<R>;
    lt: NumberFn<R>;
    lessThan: NumberFn<R>;
    most: NumberFn<R>;
    lte: NumberFn<R>;
    lessThanOrEqual: NumberFn<R>;
    within: WithinFn<R>;
}
