/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import { ICachedValue } from "@nevware21/ts-utils";
import { IListener, IListenerContext, INotifyResult, INotificationManager, IRemovable, eListenerEvent } from "@nevware21/tripwire";
import { IReporterConsole, IReporterTestRecord, _buildTestRecord } from "./_reporterRecord";

/**
 * Options for creating an xUnit/JUnit-style XML reporter.
 * @since 0.2.0
 */
export interface IXunitReporterOptions {
    /**
     * Custom console-like output sink. Defaults to the global `console`.
     */
    console?: IReporterConsole;

    /**
     * Name attribute for the emitted `<testsuite>` element. Default: "Tripwire Tests".
     */
    suiteName?: string;
}

/**
 * Characters XML 1.0 does not permit *at all* -- not even as a numeric character reference:
 * everything below 0x20 except tab (0x09), newline (0x0A) and carriage return (0x0D), plus the
 * two permanently-unassigned noncharacters at the end of the BMP.
 *
 * These reach the document through error messages, which are arbitrary user strings: an
 * assertion message carrying an ANSI colour escape (0x1B) is the common case, and it produces a
 * document Jenkins/JUnit parsers reject outright rather than merely render oddly. They are
 * dropped rather than escaped because XML defines no escape for them.
 *
 * Surrogates are deliberately *not* in this set -- a well-formed pair is how JavaScript stores
 * every astral character (emoji included), and those are perfectly valid XML.
 */
// eslint-disable-next-line no-control-regex
const _INVALID_XML_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g;

function _stripInvalidXml(value: string): string {
    return String(value).replace(_INVALID_XML_CHARS, "");
}

function _escapeXml(value: string): string {
    return _stripInvalidXml(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * CDATA has no escapes, so `]]>` is split across two sections rather than encoded -- and the
 * control characters stripped above are just as invalid inside CDATA as outside it.
 */
function _cdata(value: string): string {
    return "<![CDATA[" + _stripInvalidXml(value).replace(/]]>/g, "]]]]><![CDATA[>") + "]]>";
}

/**
 * A reporter that emits a single JUnit/xUnit-compatible `<testsuite>` XML document -- the
 * format most CI systems (Jenkins, Azure DevOps, GitLab, etc) natively understand for
 * publishing test results.
 * @param options - Optional configuration
 * @returns A reporter object whose `.listener` property should be registered
 * @since 0.2.0
 */
export function createXunitReporter(options?: IXunitReporterOptions): { listener: IListener } {
    var _console = (options && options.console) || console;
    var _suiteName = (options && options.suiteName) || "Tripwire Tests";
    var _tests: IReporterTestRecord[] = [];
    var _timestamp = "";

    var _listener: IListener = {
        onStart: function(event: number): INotifyResult | void {
            if (event === eListenerEvent.Run) {
                _tests = [];
                _timestamp = new Date().toISOString();
            }
        },

        onDone: function(event: number, context: ICachedValue<IListenerContext>): INotifyResult | void {
            var ctx = context.v;

            if (event === eListenerEvent.Test) {
                _tests.push(_buildTestRecord(ctx));
            } else if (event === eListenerEvent.Run) {
                var end = ctx.end;
                var failures = (end && end.failed) || 0;
                var skipped = ((end && end.skipped) || 0) + ((end && end.pending) || 0);
                var total = (end && end.total) || _tests.length;
                var time = (((end && end.duration) || 0) / 1000).toFixed(3);

                var xml: string[] = [];
                xml.push("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
                xml.push("<testsuite name=\"" + _escapeXml(_suiteName) + "\" tests=\"" + total + "\" failures=\"" + failures
                    + "\" skipped=\"" + skipped + "\" timestamp=\"" + _timestamp + "\" time=\"" + time + "\">");

                for (var i = 0; i < _tests.length; i++) {
                    var record = _tests[i];
                    var seconds = (record.duration / 1000).toFixed(3);
                    var attrs = "classname=\"" + _escapeXml(record.suiteTitle) + "\" name=\"" + _escapeXml(record.title)
                        + "\" time=\"" + seconds + "\"";

                    if (record.status === "failed" || record.status === "aborted") {
                        var message = record.error ? (record.error.message || String(record.error)) : "";
                        var stack = record.error ? (record.error.stack || "") : "";
                        xml.push("  <testcase " + attrs + ">");
                        xml.push("    <failure message=\"" + _escapeXml(message) + "\">" + _cdata(stack || message) + "</failure>");
                        xml.push("  </testcase>");
                    } else if (record.status === "skipped" || record.status === "pending") {
                        xml.push("  <testcase " + attrs + ">");
                        xml.push("    <skipped/>");
                        xml.push("  </testcase>");
                    } else {
                        xml.push("  <testcase " + attrs + "/>");
                    }
                }

                xml.push("</testsuite>");
                _console.log(xml.join("\n"));
            }
        }
    };

    return {
        listener: _listener
    };
}

/**
 * Register an xUnit reporter with a notification manager and return a handle to remove it.
 * @param mgr - The notification manager to register with
 * @param options - Optional reporter configuration
 * @returns A removable handle
 * @since 0.2.0
 */
export function addXunitReporter(mgr: INotificationManager, options?: IXunitReporterOptions): IRemovable {
    var reporter = createXunitReporter(options);
    return mgr.addListener(reporter.listener);
}
