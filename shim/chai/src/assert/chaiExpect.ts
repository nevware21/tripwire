
/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { AssertionError } from "@nevware21/tripwire";
import { IChaiAssert } from "./interfaces/IChaiAssert";

/**
 * Creates a new assert object with the given value and message.
 * @param value The value to create the context object with.
 * @param initMsg The message to create the context object with.
 */
export function chaiExpect<T>(value: T, initMsg?: string): IChaiAssert {
    throw new AssertionError("chaiExpect is not implemented");
}
