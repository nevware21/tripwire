/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IAssertInst } from "../IAssertInst";

/**
 * Represents an interface that provides assertion operations based on the
 * property operations.
 * @template R - The type of the result of the operation.
 */
export interface IPropertyResultOp extends IAssertInst {

    /**
     * A new {@link IAssertInst} with the value of the property assertion.
     */
    and: this;

    /**
     * A new {@link IAssertInst} with the value of the property assertion.
     */
    value: IAssertInst;

    /**
     * A new {@link IAssertInst} with the value of the property assertion.
     */
    that: IAssertInst;
}
