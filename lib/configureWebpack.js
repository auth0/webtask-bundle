'use strict';

const Path = require('path');
const Webpack = require('webpack');


module.exports = configureWebpack;


function configureWebpack(options) {
    const entry = {};
    
    entry[options.name] = options.entry;
    
    const config = {
        bail: true,
        entry: entry,
        output: {
            path: '/',
            filename: 'bundle.js',
            publicPath: '/build/',
            library: true,
            libraryTarget: 'commonjs2',
        },
        externals: options.externals,
        module: {
            loaders: [
                {
                    test: /\.jsx?$/,
                    exclude: /node_modules/,
                    loader: require.resolve('babel-loader'),
                    query: {
                        highlightCode: false,
                        babelrc: false,
                        presets: [require.resolve('babel-preset-latest')],
                        plugins: [
                            // uses the https://github.com/facebook/regenerator module to transform async and generator functions.
                            [require.resolve('babel-plugin-transform-regenerator'), {
                                asyncGenerators: true, // true by default
                                generators: true, // true by default

                                // Async functions are converted to generators by babel-preset-latest
                                async: false // true by default
                            }],
                            // Polyfills the runtime needed for async/await and generators
                            [require.resolve('babel-plugin-transform-runtime'), {
                                helpers: false,
                                polyfill: false,
                                regenerator: true,
                                // Resolve the Babel runtime relative to the config.
                                moduleName: Path.dirname(require.resolve('babel-runtime/package'))
                            }],
                            require.resolve('babel-plugin-transform-class-properties'),
                            [require.resolve('babel-plugin-transform-object-rest-spread'), {
                                useBuiltIns: true
                            }],
                        ]
                    },
                },
                {
                    test: /\.json$/,
                    loader: require.resolve('json-loader'),
                },
            ],
        },
        plugins: [
            new Webpack.optimize.DedupePlugin(),
        ],
        resolve: {
            modulesDirectories: ['node_modules'],
            fallback: Path.join(__dirname, 'node_modules'),
            root: [process.cwd(), __dirname],
            alias: {},
        },
        resolveLoaders: {
            modulesDirectories: ['node_modules'],
            root: __dirname,
            extensions: ['', '.webpack-loader.js', '.web-loader.js', '.loader.js', '.js'],
            packageMains: ['webpackLoader', 'webLoader', 'loader', 'main'],
        },
        node: {
            console: false,
            global: false,
            process: false,
            Buffer: false,
            __filename: false,
            __dirname: false,
        },
    };
    
    if (options.minify) {
        const minifyOptions = typeof options.minify === 'object'
            ?   options.minify
            :   {};
            
        config.plugins.push(new Webpack.optimize.UglifyJsPlugin(minifyOptions));
    }
    
    return config;
}
