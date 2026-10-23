/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { INotificationManager } from "./INotificationManager";
import { IServerManager } from "./IServerManager";
import { IConfigInst } from "./IConfigInst";

/**
 * Interface representing a host that provides configuration options.
 * @since 0.2.0
 */
export interface IConfigHost {
    /**
     * Returns the options (the current configuration) for the current context.
     */
    readonly opts: ICachedValue<IConfigInst>;

    /**
     * The notification manager associated with this configuration host.
     */
    readonly notifyMgr?: INotificationManager | null;

    /**
     * The server manager associated with this configuration host, which provides access to the test server.
     */
    readonly serverMgr?: IServerManager | null;

    /**
     * Creates a clone of the current configuration host.
     * @returns A new instance of IConfigHost with the same configuration
     */
    clone(): IConfigHost;
}