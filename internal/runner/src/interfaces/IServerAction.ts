/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IServerHandler } from "./IServerHandler";

/**
 * Defines an action that can be performed by the server, such as handling a specific API endpoint.
 * Each action has a name, a handler function, and optional metadata for documentation and UI purposes.
 */
export interface IServerAction {
    /**
     * The name of the action, which can be used for routing or documentation purposes.
     */
    name: string;

    /**
     * The handler function that will be called when this action is invoked.
     * It receives an `IServerRequest` object and can return a promise for asynchronous handling or void for synchronous handling.
     */
    handler: IServerHandler;

    /**
     * Optional description of the action for documentation purposes.
     */
    description?: string;

    /**
     * Optional URL or reference for more information about this action, which can be used in documentation or UI.
     */
    href?: string;

    /**
     * Optional flag indicating whether this action should be shown in an index or list of available actions.
     * This can be used to hide internal or less commonly used actions from the user interface.
     */
    showInIndex?: boolean;
}
