/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAllOp } from "./IAllOp";
import { IAnyOp } from "./IAnyOp";
import { IncludeFn } from "../funcs/IncludeFn";

/**
 * Represents the include operations for the assertion scope.
 * @template R - The type of the result of the operation.
 */
export interface IIncludeOp<R> extends IncludeFn<R> {

    /**
     * Provides access to additional operations based on the {@link IAllOp} interface
     * for the assertion scope.
     */
    any: IAnyOp<R>;

    /**
     * Provides access to additional operations based on the {@link IAnyOp} interface
     * for the assertion scope.
     */
    all: IAllOp<R>;
}
