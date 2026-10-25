/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */
import { isFunction } from "@nevware21/ts-utils";
import { IRunnerUxProvider } from "../interfaces/IRunnerUxProvider";
import { _loadModule } from "../internal/loadModule";
import { _userError } from "../internal/userError";
import * as _defaultUxProvider from "../ux";

/**
 * Resolves the browser UX provider to use -- the built-in one (a direct, statically-typed
 * reference, so no runtime shape validation is needed) unless `providerName` names a custom
 * override module, in which case it's dynamically loaded and shape-checked since it's untrusted.
 */
export function _loadUxProvider(providerName?: string): IRunnerUxProvider {
    if (!providerName) {
        return _defaultUxProvider as unknown as IRunnerUxProvider;
    }

    const provider = _loadModule<IRunnerUxProvider>(providerName);
    if (!provider || !isFunction(provider.createBrowserRunnerHtml)) {
        throw _userError("Invalid UX provider '" + providerName + "': missing createBrowserRunnerHtml(target, style).");
    }

    if (!isFunction(provider.createFsDirListingHtml)) {
        throw _userError("Invalid UX provider '" + providerName + "': missing createFsDirListingHtml(style, relativePath, entries).");
    }

    return provider;
}
