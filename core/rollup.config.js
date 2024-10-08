import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import cleanup from 'rollup-plugin-cleanup';
import minify from "rollup-plugin-minify-es";

const UglifyJs = require('uglify-js');

const version = require("./package.json").version;
const outputName = "tripwire";
const banner = [
    "/*!",
    ` * NevWare21 Solutions LLC - tripwire, ${version}`,
    " * https://github.com/nevware21/tripwire",
    " * Copyright (c) NevWare21 Solutions LLC and contributors. All rights reserved.",
    " * Licensed under the MIT license.",
    " */"
].join("\n");

function isSourceMapEnabled(options) {
    if (options) {
        return options.sourceMap !== false && options.sourcemap !== false;
    }

    return false;
}

function _doMinify(code, filename, options, chunkOptions) {
    var theCode = {};
    theCode[filename] = code;

    let theOptions = Object.assign({}, options);
    if (theOptions.hasOwnProperty("sourcemap")) {
        delete theOptions.sourcemap;
    }

    if (isSourceMapEnabled(options)) {
        theOptions.sourceMap = {
            filename: filename
        };
        if (filename) {
            theOptions.sourceMap.url = filename + ".map";
        }
    }

    var result = UglifyJs.minify(theCode, theOptions);

    if (result.error) {
        throw new Error(JSON.stringify(result.error));
    }

    var transform = {
        code: result.code
    };

    if (isSourceMapEnabled(options) && result.map) {
        transform.map = result.map;
    }

    return transform;
}

export function uglify3(options = {}) {

    return {
        name: "internal-rollup-uglify-js",
        renderChunk(code, chunk, chkOpt) {
            return _doMinify(code, chunk.filename, options, chkOpt);
        }
    }
}

const rollupConfigFactory = (srcPath, destPath, isMinified, path, format = "iife", postfix = "") => {
    let mainFields = [ "module", "main" ];
    if (destPath === "es6") {
        mainFields = [ "esnext", "module", "main" ];
    }

    const taskRollupConfig = {
        input: `./${srcPath}/index.js`,
        output: {
            file: `./${destPath}/${path}/${outputName}${postfix}.js`,
            banner: banner,
            format: format,
            name: "nevware21.tripwire",
            freeze: false,
            sourcemap: true
        },
        external: [ "fs", "path" ],
        plugins: [
            nodeResolve({
                module: true,
                browser: false,
                preferBuiltins: true,
                mainFields: mainFields
            }),
            commonjs(),
            cleanup({
                comments: [
                    /[#@]__/,
                    /^!/
                ]
            })
        ]
    };

    if (isMinified) {
        taskRollupConfig.output.file = `./${destPath}/${path}/${outputName}${postfix}.min.js`;
        if (format !== "esm") {
            taskRollupConfig.plugins.push(
                uglify3({
                    ie8: false,
                    toplevel: true,
                    compress: {
                        passes:3,
                        unsafe: true
                    },
                    output: {
                        preamble: banner,
                        webkit:true
                    }
                })
            );
        } else {
            taskRollupConfig.plugins.push(
                minify({
                    ie8: false,
                    toplevel: true,
                    compress: {
                        passes:3,
                        unsafe: true
                    },
                    output: {
                        preamble: banner,
                        webkit:true
                    }
                })
            );
        }
    }

    return taskRollupConfig;
};

const rollupConfigMainEntry = (srcPath, destPath, path, format = "umd") => {
    let mainFields = [ "module", "main" ];
    if (destPath === "es6") {
        mainFields = [ "esnext", "module", "main" ];
    }

    const taskRollupConfig = {
        input: `./${srcPath}/index.js`,
        output: {
            file: `./${destPath}/${path}/${outputName}.js`,
            banner: banner,
            format: format,
            name: "nevware21.tripwire",
            freeze: false,
            sourcemap: true,
            globals: {
                "@nevware21/ts-utils": "nevware21.ts-utils",
                "@nevware21/ts-async": "nevware21.ts-async",
                "tslib": "tslib"
            }
        },
        external: [ "fs", "path", "@nevware21/ts-utils", "@nevware21/ts-async", "tslib" ],
        plugins: [
            commonjs(),
            cleanup({
                comments: [
                    /[#@]__/,
                    /^!/,
                    "some",
                    "ts"
                ]
            })
        ]
    };

    return taskRollupConfig;
};

export default [
    rollupConfigMainEntry("build/es5/mod", "dist/es5", "main", "umd"),
    rollupConfigMainEntry("build/es6/mod", "dist/es6", "main", "umd"),
    rollupConfigMainEntry("build/es5/mod", "dist/es5", "mod", "es"),
    rollupConfigMainEntry("build/es6/mod", "dist/es6", "mod", "es"),

    // Self contained bundles (Used for testing -- will be removed in a future release)
    rollupConfigFactory("build/es5/mod", "dist/es5", false, "umd", "umd"),

    // ES5 Bundles
    rollupConfigFactory("build/es5/mod", "bundle/es5", false, "iife", "iife"),
    rollupConfigFactory("build/es5/mod", "bundle/es5", true, "iife", "iife"),
    rollupConfigFactory("build/es5/mod", "bundle/es5", false, "umd", "umd"),
    rollupConfigFactory("build/es5/mod", "bundle/es5", true, "umd", "umd"),

    // ES6 Bundles
    rollupConfigFactory("build/es6/mod", "bundle/es6", false, "iife", "iife"),
    rollupConfigFactory("build/es6/mod", "bundle/es6", true, "iife", "iife"),
    rollupConfigFactory("build/es6/mod", "bundle/es6", false, "umd", "umd"),
    rollupConfigFactory("build/es6/mod", "bundle/es6", true, "umd", "umd")
];
