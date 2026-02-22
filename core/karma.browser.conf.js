process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function (config) {
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
                    /checkError\.ts$/i, 
                    /\/node_modules\//i
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