const childProcess = require('child_process');

function _resolvePuppeteerExecutablePathSync() {
    return childProcess.execFileSync(process.execPath, [
        "-e",
        "require('puppeteer').executablePath().then((path) => process.stdout.write(path || ''))"
    ], {
        encoding: "utf8"
    }).trim();
}

module.exports = function (config) {
    // Puppeteer v25+ resolves executablePath asynchronously, so resolve it in a subprocess
    // to keep this Karma config synchronous.
    try {
        const chromePath = _resolvePuppeteerExecutablePathSync();
        if (chromePath) {
            process.env.CHROME_BIN = chromePath;
            process.env.CHROMIUM_BIN = chromePath;
        }
    } catch (error) {
        console.warn("Puppeteer executable path could not be resolved. Chrome/Chromium tests may be skipped.");
        process.exit(0);
    }
     
    config.set({
        browsers: [ "Chromium_without_security" ],
        listenAddress: 'localhost',
        hostname: 'localhost',
        frameworks: [ "mocha", "karma-typescript" ],
        files: [
            { pattern: "src/**/*.ts" },
            { pattern: "test/src/!(node|worker)/**/*.ts" } // Exclude node and worker tests
        ],
        preprocessors: {
            "src/**/*.ts": [ "karma-typescript" ],
            "test/src/**/*.ts": [ "karma-typescript" ]
        },
        karmaTypescriptConfig: {
            tsconfig: "./test/tsconfig.browser.karma.json",
            compilerOptions: {
                sourceMap: true
            },
            bundlerOptions: {
                sourceMap: true
            },
            coverageOptions: {
                instrumentation: true,
                sourceMap: true,
                exclude: [
                    /\.(d|spec|test)\.ts$/i,
                    /index.ts$/i,
                    /globalErr\.ts$/i, 
                    /\/node\_modules\//i
                ]
            },
            reports: {
                "html-spa":  {
                    "directory": "./coverage",
                    "subdirectory": "browser"
                },
                "json": {
                    "directory": "./coverage",
                    "subdirectory": "browser",
                    "filename": "coverage-final.json"
                },
                "text": ""
            }
        },

        reporters: [ "spec", "karma-typescript" ],

        customLaunchers: {
            Chromium_without_security: {
                base: 'ChromeHeadless',
                flags: ['--disable-web-security', '--disable-site-isolation-trials', '--no-sandbox']
            }
        },

        logLevel: config.LOG_INFO
    })
};
