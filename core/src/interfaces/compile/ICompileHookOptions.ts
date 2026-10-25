/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/**
 * Optional tuning passed to {@link ICompileProvider.registerHook}. Every value is optional and every
 * default is the faster behaviour, so a provider that ignores this argument entirely still works --
 * it just does more work than it needs to.
 * @since 0.2.0
 */
export interface ICompileHookOptions {
    /**
     * The files this run actually matched, used to root the type-check at the code the run can
     * reach instead of at the whole project. See {@link typeCheckScope}.
     */
    scopeFiles?: string[];

    /**
     * Whether the type-check may keep TypeScript's own incremental state (`.tsbuildinfo`) between
     * runs, so that a later run re-checks only the files affected by what changed.
     *
     * Off by default because it measured no benefit: emitting a file needs much of the work the
     * check does, so what the warm check saves, the emit pays back. It is also largely superseded by
     * {@link emitCache}, which skips building and checking the program altogether when nothing has
     * changed. Worth turning on for a project whose type-check covers far more than any one run
     * loads.
     *
     * @defaultValue false
     */
    incremental?: boolean;

    /**
     * Whether each file may be compiled on its own (TypeScript's `transpileModule`) instead of
     * through a whole program, when the run is not type-checking. It is much faster and its output
     * can be cached on disk (see {@link emitCache}), but it cannot resolve an **ambient**
     * `declare const enum` -- one declared in a `.d.ts`, typically by a dependency -- because there
     * is no emitted object for the member access to resolve against at runtime, and no file that
     * could produce one. Such a project fails at load with a `Cannot read properties of undefined`
     * error and needs this left off.
     *
     * A project's own `const enum` is fine: it is emitted as a real object rather than inlined.
     *
     * @defaultValue false
     */
    isolatedTranspile?: boolean;

    /**
     * Whether compiled output may be cached on disk between runs, so that running the same tests
     * again over an unchanged tree does not compile (or type-check) anything a second time.
     *
     * With {@link isolatedTranspile} each file is keyed by its own text. Otherwise the identity of
     * the whole program's inputs is recorded and used as the key, and a type-checked run whose
     * recorded inputs still match skips checking too.
     *
     * @defaultValue true
     */
    emitCache?: boolean;

    /**
     * What the type-check covers.
     *
     * - `"project"` (the default) checks every file the tsconfig resolves to, whether or not this
     *   run can reach it.
     * - `"run"` roots the check at the files the run matched, so it covers those and everything they
     *   import, transitively, plus anything declaring globals. Files in the project that no test
     *   reaches are not checked, which is what makes it faster -- and is also why it is not the
     *   default: it narrows what a green run actually proves.
     *
     * Either way, a matched file the project does not contain is still reported as unchecked, and
     * still fails the run under `--strict-type-check`.
     *
     * @defaultValue "project"
     */
    typeCheckScope?: "run" | "project";
}
