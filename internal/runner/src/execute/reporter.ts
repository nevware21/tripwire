/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { IListener } from "@nevware21/tripwire";
import { isFunction } from "@nevware21/ts-utils";
import { IReporterOptions, createReporter } from "../reporters";
import { _loadModule } from "../internal/loadModule";
import { _isReporterModuleSpec, _reporterModuleId } from "../internal/reporterSpec";
import { _userError } from "../internal/userError";

/**
 * The three shapes a custom reporter module may export, in the order they are tried. Mirrors
 * `_getCompileProvider`/`_loadUxProvider`: a named factory first, then a bare function, then the
 * already-built object -- so the same module works whether its author thought in terms of "a
 * reporter factory" or "a listener".
 */
function _instantiate(mod: any, options?: IReporterOptions): any {
    if (isFunction(mod.createReporter)) {
        return mod.createReporter(options);
    }

    if (isFunction(mod)) {
        return mod(options);
    }

    return mod;
}

/**
 * Whether `candidate` is usable as an `IListener` -- at least one of the three optional hooks is
 * actually a function. Every member of `IListener` is optional, so "is it an object" would accept
 * a module that exported the wrong thing entirely (a config object, a class, `{}`) and then
 * silently report nothing for the whole run; requiring one real hook is what turns that into an
 * error the user can act on.
 */
function _isListener(candidate: any): boolean {
    return !!candidate && (isFunction(candidate.onStart) || isFunction(candidate.onDone) || isFunction(candidate.onAssert));
}

/**
 * Turns one configured reporter value into a listener -- a built-in name via
 * {@link createReporter}, or, for a module specifier (see `_isReporterModuleSpec`), a custom
 * reporter `require()`d from the project.
 *
 * This is the node target's dispatch point only. The browser and worker targets build their
 * reporters *inside* the page/worker (`client/workerRunner.ts`, `ux/browser/ui/frame-mode.ts`),
 * where there is no `require` and no filesystem to load a module from, which is why
 * {@link _assertReporterTargetSupport} rejects the combination up front rather than letting it
 * fall back to `spec` unannounced.
 *
 * @param name - A built-in reporter name or a module specifier.
 * @param options - Options handed to the reporter's factory, exactly as the built-ins receive
 * them (`slowThreshold`, `showExecution`, the `console` sink).
 * @since 0.2.0
 */
export function _createReporter(name: string, options?: IReporterOptions): { listener: IListener } {
    if (!_isReporterModuleSpec(name)) {
        return createReporter(name, options);
    }

    const moduleId = _reporterModuleId(name);
    const mod = _loadModule<any>(moduleId, true, "reporter", "--reporter");

    if (!mod) {
        throw _userError("Reporter module '" + moduleId + "' exported nothing.", [
            "A reporter module must export a listener, or a createReporter(options) factory returning one."
        ]);
    }

    const created = _instantiate(mod, options);

    // Accept both `{ listener }` (what the built-in factories return, so a custom reporter can be
    // written by wrapping one) and a bare listener.
    const listener = (created && _isListener(created.listener)) ? created.listener : created;

    if (!_isListener(listener)) {
        throw _userError("Invalid reporter module '" + moduleId + "': it exported no onStart, onDone or onAssert.", [
            "Export the listener itself, a { listener } object, or a createReporter(options) factory returning either.",
            "See the 'Custom reporters' section of docs/reporters.md."
        ]);
    }

    return {
        listener: listener as IListener
    };
}

/**
 * Fails the run, before anything is launched, when a custom reporter module is selected for a
 * target that cannot load one.
 *
 * A browser/worker run's reporters are constructed by the client-side runtime from the names in
 * the run payload; a node module specifier means nothing there, and `createReporter` would warn
 * once into the page console and quietly hand back `spec`. That is exactly the "quietly given
 * different output than you asked for" failure the built-in dispatch already refuses to make, so
 * it is raised here as a user error naming the way forward instead.
 *
 * @param reporters - The configured reporter values (built-in names and/or module specifiers).
 * @param target - The resolved run target.
 * @since 0.2.0
 */
export function _assertReporterTargetSupport(reporters: string[] | undefined, target: string): void {
    if (target === "node" || !reporters) {
        return;
    }

    for (let lp = 0; lp < reporters.length; lp++) {
        if (_isReporterModuleSpec(reporters[lp])) {
            throw _userError("Custom reporter module '" + _reporterModuleId(reporters[lp]) + "' is not supported for the " + target + " target.", [
                "The " + target + " target builds its reporters inside the " + (target === "worker" ? "worker" : "browser") + ", where a node module cannot be loaded.",
                "Use a built-in reporter name for this target, or run the suite with --target node."
            ]);
        }
    }
}
