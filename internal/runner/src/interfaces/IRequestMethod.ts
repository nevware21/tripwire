/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Represents an HTTP request method (e.g., GET, POST) and its characteristics.
 */
export interface IRequestMethod {
    /**
     * The name of the HTTP method (e.g., "GET", "POST").
     */
    name: string;

    /**
     * Indicates whether this method is considered a GET request.
     * This can be used to determine if the request should be treated as idempotent and cacheable.
     */
    isGet: boolean;

    /**
     * Indicates whether this method is considered a POST request.
     * This can be used to determine if the request should be treated as non-idempotent and not cacheable.
     */
    isPost: boolean;
}