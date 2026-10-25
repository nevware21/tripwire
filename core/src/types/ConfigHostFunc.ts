/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IConfigHost } from "../interfaces/IConfigHost";

/**
 * A callback invoked with the active configuration host by {@link useHost} and {@link withHost}.
 * @since 0.2.0
 */
export type ConfigHostFunc<T> = (host: IConfigHost) => T;
