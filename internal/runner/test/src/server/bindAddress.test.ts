/*
 * @nevware21/tripwire
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2026 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

import * as os from "os";
import { assert } from "@nevware21/tripwire";
import { DEFAULT_BIND_ADDRESS, _getReachableHosts, _isWildcardAddress, _toConnectHost, _toUrlHost } from "../../../src/server/server";

describe("server bind address", () => {
    it("should default to loopback, so the dev server is not on the network unless asked", () => {
        assert.equal(DEFAULT_BIND_ADDRESS, "127.0.0.1");
    });

    describe("_isWildcardAddress", () => {
        it("should recognise the IPv4 and IPv6 wildcards", () => {
            assert.isTrue(_isWildcardAddress("0.0.0.0"));
            assert.isTrue(_isWildcardAddress("::"));
            assert.isTrue(_isWildcardAddress("[::]"));
        });

        it("should not treat a real address as a wildcard", () => {
            assert.isFalse(_isWildcardAddress("127.0.0.1"));
            assert.isFalse(_isWildcardAddress("::1"));
            assert.isFalse(_isWildcardAddress("192.168.1.10"));
            assert.isFalse(_isWildcardAddress("0.0.0.1"));
        });
    });

    describe("_toUrlHost", () => {
        it("should bracket a bare IPv6 literal", () => {
            // Without the brackets the address and port run together into `http://::1:8080/`,
            // which is not a parseable URL.
            assert.equal(_toUrlHost("::1"), "[::1]");
            assert.equal(_toUrlHost("fe80::1%eth0"), "[fe80::1%eth0]");
        });

        it("should leave an already-bracketed literal alone", () => {
            assert.equal(_toUrlHost("[::1]"), "[::1]");
        });

        it("should leave IPv4 literals and hostnames untouched", () => {
            assert.equal(_toUrlHost("127.0.0.1"), "127.0.0.1");
            assert.equal(_toUrlHost("192.168.1.10"), "192.168.1.10");
            assert.equal(_toUrlHost("my-host.local"), "my-host.local");
        });
    });

    describe("_toConnectHost", () => {
        it("should use a named interface as-is -- that is the point of naming one", () => {
            assert.equal(_toConnectHost("192.168.1.10"), "192.168.1.10");
            assert.equal(_toConnectHost("my-host.local"), "my-host.local");
        });

        it("should bracket a named IPv6 interface", () => {
            assert.equal(_toConnectHost("::1"), "[::1]");
        });

        // `http://0.0.0.0:port/` fails outright in a browser on Windows and macOS -- a wildcard
        // is a bind target, not a connect target.
        it("should fall back to loopback for a wildcard bind", () => {
            assert.equal(_toConnectHost("0.0.0.0"), DEFAULT_BIND_ADDRESS);
            assert.equal(_toConnectHost("::"), DEFAULT_BIND_ADDRESS);
        });
    });

    describe("_getReachableHosts", () => {
        it("should return only non-internal addresses", () => {
            const hosts = _getReachableHosts();
            const internal: string[] = [];
            const interfaces = os.networkInterfaces();

            Object.keys(interfaces).forEach((name) => {
                (interfaces[name] || []).forEach((entry: any) => {
                    if (entry && entry.internal && entry.address) {
                        internal.push(entry.address);
                    }
                });
            });

            assert.isArray(hosts);
            for (let lp = 0; lp < internal.length; lp++) {
                assert.isFalse(hosts.indexOf(internal[lp]) !== -1, internal[lp] + " is a loopback address and should not be listed as reachable");
            }
        });

        it("should list IPv4 addresses before IPv6 ones", () => {
            // A remote device or container is far more likely to be able to use the IPv4 one, so
            // it should be what a user sees first.
            const hosts = _getReachableHosts();
            let seenIpv6 = false;

            for (let lp = 0; lp < hosts.length; lp++) {
                const isIpv6 = hosts[lp].indexOf(":") !== -1;
                if (isIpv6) {
                    seenIpv6 = true;
                } else {
                    assert.isFalse(seenIpv6, "IPv4 address " + hosts[lp] + " should not follow an IPv6 one");
                }
            }
        });
    });
});
