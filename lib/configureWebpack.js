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
                        presets: [
                            // includes transform-async-to-generator that will transform async to 
                            // generator functions supported natively on node v4
                            require.resolve('babel-preset-es2017'),
                            require.resolve('babel-preset-es2016')
                        ],
                        // babel-preset-es2015 without transform-regenerator as
                        // we're going to use the native suport of node for generator functions
                        plugins: [
                            require.resolve('babel-plugin-check-es2015-constants'),
                            require.resolve('babel-plugin-transform-es2015-arrow-functions'),
                            require.resolve('babel-plugin-transform-es2015-block-scoping'), 
                            require.resolve('babel-plugin-transform-es2015-block-scoped-functions'), 
                            require.resolve('babel-plugin-transform-es2015-classes'), 
                            require.resolve('babel-plugin-transform-es2015-computed-properties'), 
                            require.resolve('babel-plugin-transform-es2015-destructuring'), 
                            require.resolve('babel-plugin-transform-es2015-duplicate-keys'),  
                            require.resolve('babel-plugin-transform-es2015-for-of'), 
                            require.resolve('babel-plugin-transform-es2015-function-name'), 
                            require.resolve('babel-plugin-transform-es2015-literals'),
                            require.resolve('babel-plugin-transform-es2015-modules-commonjs'),
                            require.resolve('babel-plugin-transform-es2015-object-super'),
                            require.resolve('babel-plugin-transform-es2015-parameters'),
                            require.resolve('babel-plugin-transform-es2015-shorthand-properties'),
                            require.resolve('babel-plugin-transform-es2015-spread'),
                            require.resolve('babel-plugin-transform-es2015-sticky-regex'),
                            require.resolve('babel-plugin-transform-es2015-template-literals'),
                            require.resolve('babel-plugin-transform-es2015-typeof-symbol'),
                            require.resolve('babel-plugin-transform-es2015-unicode-regex'),
                            require.resolve('babel-plugin-transform-object-rest-spread')
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
