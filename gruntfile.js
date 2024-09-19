/*
 * ts-utils
 * https://github.com/nevware21/tripwire
 *
 * Copyright (c) 2024 NevWare21 Solutions LLC
 * Licensed under the MIT license.
 */

"use strict";

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                "Gruntfile.js",
                "<%= nodeunit.tests %>"
            ],
            options: {
                jshintrc: ".jshintrc"
            }
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ["tmp"]
        },

        // Unit tests.
        nodeunit: {
            tests: ["test/*_test.js"]
        },
        ts: {
            options: {
                debug: false,
                logOutput: true
            },
            "tripwire": {
                // Default ES5
                tsconfig: [
                    {
                        name: "./core/tsconfig.json",
                        tsconfig: {
                            compilerOptions: {
                                target: "es5",
                                declaration: true,
                                declarationDir: "./build/types",
                                removeComments: false,
                                outDir: "./build/es5"
                            }
                        },
                        outDir: "./core/build/es5/mod"
                    },
                    {
                        name: "./core/tsconfig.json",
                        tsconfig: {
                            compilerOptions: {
                                target: "es6",
                                outDir: "./build/es6"
                            }
                        },
                        outDir: "./core/build/es6/mod"
                    }
                ]
            },
            "tripwire-test": {
                tsconfig: "./core/test/tsconfig.test.json",
                outDir: "./core/test/build-es5"
            },
            "tripwire-chai": {
                // Default ES5
                tsconfig: [
                    {
                        name: "./shim/chai/tsconfig.json",
                        tsconfig: {
                            compilerOptions: {
                                target: "es5",
                                declaration: true,
                                declarationDir: "./build/types",
                                removeComments: false,
                                outDir: "./build/es5"
                            }
                        },
                        outDir: "./shim/chai/build/es5/mod"
                    },
                    {
                        name: "./shim/chai/tsconfig.json",
                        tsconfig: {
                            compilerOptions: {
                                target: "es6",
                                outDir: "./build/es6"
                            }
                        },
                        outDir: "./shim/chai/build/es6/mod"
                    }
                ]
            },
            "tripwire-chai-test": {
                tsconfig: "./shim/chai/test/tsconfig.test.json",
                outDir: "./shim/chai/test/build-es5"
            }
        },
        "lint": {
            options: {
                format: "codeframe",
                suppressWarnings: false,
                logOutput: true,
            },
            "tripwire": {
                tsconfig: "./core/tsconfig.json",
                ignoreFailures: true
            },
            "tripwire-test": {
                tsconfig: "./core/test/tsconfig.test.json",
                ignoreFailures: true
            },
            "tripwire-fix": {
                options: {
                    tsconfig: "./core/tsconfig.json",
                    fix: true
                }
            },
            "tripwire-test-fix": {
                options: {
                    tsconfig: "./core/test/tsconfig.test.json",
                    fix: true
                }
            },
            "tripwire-chai": {
                tsconfig: "./shim/chai/tsconfig.json",
                ignoreFailures: true
            },
            "tripwire-chai-test": {
                tsconfig: "./shim/chai/test/tsconfig.test.json",
                ignoreFailures: true
            },
            "tripwire-chai-fix": {
                options: {
                    tsconfig: "./shim/chai/tsconfig.json",
                    fix: true
                }
            },
            "tripwire-chai-test-fix": {
                options: {
                    tsconfig: "./shim/chai/test/tsconfig.test.json",
                    fix: true
                }
            }
        }
    });

    // Actually load this plugin's task(s).
    grunt.loadNpmTasks("@nevware21/grunt-ts-plugin");
    grunt.loadNpmTasks("@nevware21/grunt-eslint-ts");

    grunt.registerTask("rollupuglify", ["ts:rollupuglify" ]);
    grunt.registerTask("tripwire", [ "lint:tripwire-fix", "lint:tripwire-test-fix", "ts:tripwire" ]);
    grunt.registerTask("tripwire-test", [ "lint:tripwire-test-fix", "ts:tripwire-test" ]);
    grunt.registerTask("tripwire-lint", [ "lint:tripwire-fix", "lint:tripwire-test-fix" ]);
    grunt.registerTask("dolint", [ "lint:tripwire", "lint:tripwire-test" ]);
    grunt.registerTask("lint-fix", [ "lint:tripwire-fix", "lint:tripwire-test-fix" ]);

    grunt.registerTask("tripwire-chai", [ "lint:tripwire-chai-fix", "lint:tripwire-chai-test-fix", "ts:tripwire-chai" ]);
    grunt.registerTask("tripwire-chai-test", [ "lint:tripwire-chai-test-fix", "ts:tripwire-chai-test" ]);
    grunt.registerTask("tripwire-chai-lint", [ "lint:tripwire-chai-fix", "lint:tripwire-chai-test-fix" ]);
    grunt.registerTask("dolint-chai", [ "lint:tripwire-chai", "lint:tripwire-chai-test" ]);
    grunt.registerTask("lint-chai-fix", [ "lint:tripwire-chai-fix", "lint:tripwire-chai-test-fix" ]);

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    // grunt.registerTask('ts_utils_test', ['clean', 'ts_utils']);

    // By default, lint and run all tests.
    grunt.registerTask("default", ["jshint" ]);
};
