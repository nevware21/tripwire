/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

/*
 * Forces `process.stdout.isTTY` on, used only by genReporterImages.js as a `node -r` preload:
 *
 *     node -r ./docs/scripts/_ttyShim.js core/bin/tripwire.js ...
 *
 * The runner supplies reporters a raw `write` sink -- the one their in-place `\r` redraws need --
 * only when stdout is a real terminal (see execute.ts). Capturing that output means pretending to
 * be one, since a spawned, piped process never is.
 *
 * It has to be a preload rather than a wrapper that `require()`s the CLI: the CLI only starts
 * itself under `require.main === module`, which a wrapper would break. A preload runs first and
 * leaves the CLI as the genuine main module. Nothing else about the run changes -- the writes
 * still land on the same stdout pipe, `\r`-separated, which is what the generator parses back
 * into frames.
 */

"use strict";

process.stdout.isTTY = true;
