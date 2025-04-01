/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ValuesFn } from "../funcs/ValuesFn";
import { IKeysOp } from "./IKeysOp";

/**
 * Represents the all operations for the current assertion scope.
 * @template R - The type of the result of the operation.
 */
export interface IAllOp<R> extends ValuesFn<R>, IKeysOp<R> {
}
