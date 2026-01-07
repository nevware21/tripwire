
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
 * Creates a new expect object with the given value and message.
 *
 * **NOTE:** The Chai `expect` BDD-style API is not yet implemented in this shim.
 * This function will throw an error if called. Please use the `assert` API instead
 * via `chaiAssert` export.
 *
 * The `expect` API requires a complex chainable assertion DSL that is not yet
 * available. Contributions to implement this functionality are welcome!
 *
 * @param value The value to create the context object with.
 * @param initMsg The message to create the context object with.
 * @throws {AssertionError} Always throws indicating the feature is not implemented.
 * @see chaiAssert for the implemented assert-style API
 */
export function chaiExpect<T>(value: T, initMsg?: string): IChaiAssert {
    throw new AssertionError("chaiExpect (BDD-style expect API) is not yet implemented. Please use chaiAssert (assert-style API) instead.");
}
