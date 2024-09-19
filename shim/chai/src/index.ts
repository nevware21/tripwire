/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IChaiAssert, Constructor, Operator, OperatorComparable } from "./assert/interfaces/IChaiAssert";
import { chaiAssert } from "./assert/chaiAssert";
import { chaiExpect } from "./assert/chaiExpect";

export {
    IChaiAssert as Assert,
    Constructor,
    Operator,
    OperatorComparable
};

export {
    chaiAssert as assert,
    chaiExpect as expect
}