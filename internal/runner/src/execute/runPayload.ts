/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { arrForEach } from "@nevware21/ts-utils";
import { IRunPayload } from "@nevware21/tripwire";

function _toGrepFlags(parsed: any): Array<{ source: string, flags: string }> {
    const values: Array<{ source: string, flags: string }> = [];
    arrForEach(parsed.grep || [], (rx) => {
        values.push({
            source: rx.source,
            flags: rx.flags
        });
    });
    return values;
}

export function _createRunPayload(moduleGraph: { entryIds: string[], tripwireModuleId: string, coverageOnlyIds?: string[], moduleUrls: Record<string, string> }, parsed: any): IRunPayload {
    // The client-side require() graph is keyed by each module's clean, URL-mirroring id
    // (see moduleAssets.ts), not the server-internal absolute filesystem path used for
    // coverage/instrumentation bookkeeping -- translate entryIds/tripwireModuleId/
    // coverageOnlyIds the same way so the client's req(id) calls resolve against the
    // registry it actually has.
    const moduleUrls = moduleGraph.moduleUrls || {};
    const coverageOnlyIds = moduleGraph.coverageOnlyIds && moduleGraph.coverageOnlyIds.length
        ? moduleGraph.coverageOnlyIds.map((id) => moduleUrls[id] || id)
        : undefined;
    return {
        entryIds: moduleGraph.entryIds.map((id) => moduleUrls[id] || id),
        tripwireModuleId: moduleUrls[moduleGraph.tripwireModuleId] || moduleGraph.tripwireModuleId,
        coverageOnlyIds,
        settings: {
            slow: parsed.slow,
            timeout: parsed.timeout,
            retries: parsed.retries,
            grep: _toGrepFlags(parsed),
            invert: !!parsed.invert,
            bail: !!parsed.bail,
            trace: !!parsed.trace,
            reporter: (parsed.reporter && parsed.reporter.length) ? parsed.reporter : ["spec"],
            server: undefined
        }
    };
}

