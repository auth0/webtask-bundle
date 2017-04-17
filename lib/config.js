'use strict';

const Path = require('path');
const Webpack = require('webpack');


module.exports = {
    create,
};


function create(options) {
    const config = {
        entry: {
            [options.name]: options.entry,
        },
        externals: Object.keys(options.dependencies || {}).reduce((externals, id) => {
            externals[id] = { commonjs2: id };

            return externals;
        }, {}),
        bail: false, // https://github.com/webpack/webpack/issues/3324 (while closed, issue remains when bail: true)
        output: {
            path: '/',
            filename: 'bundle.js',
            publicPath: '/build/',
            library: 'webtask',
            libraryTarget: 'commonjs2',
        },
        module: {
            rules: [
                {
                    resource: {
                        test: /\.jsx?$/,
                        exclude: /node_modules/,
                    },
                    use: [
                        {
                            options: {
                                'module.webtask': '>webtaskApi',
                            },
                            loader: require.resolve('imports-loader'),
                        },
                        {
                            options: {
                                presets: [[require.resolve('babel-preset-env'), {
                                    targets: {
                                        node: 4,
                                        uglify: !!options.minify,
                                    },
                                }]],
                            },
                            loader: require.resolve('babel-loader'),
                        },
                    ],
                },
                {
                    issuer: {
                        exclude: /node_modules/,
                    },
                    resource: {
                        not: [/\.jsx?$/],
                    },
                    use: {
                        loader: require.resolve('raw-loader'),
                    },
                },
            ],
        },
        plugins: [],
        resolve: {
            modules: [Path.join(process.cwd(), 'node_modules')],
            mainFields: ['module', 'main'],
        },
        resolveLoader: {
            modules: [Path.join(__dirname, 'node_modules')],
            // moduleExtensions: ['', '.webpack-loader.js', '.web-loader.js', '.loader.js', '.js'],
            mainFields: ['webpackLoader', 'loader', 'module', 'main'],
        },
        node: {
            console: false,
            global: false,
            process: false,
            Buffer: false,
            __filename: false,
            __dirname: false,
            setImmediate: false,
        },
        performance: {
            hints: false,
        },
        target: 'node',
    };

    if (options.minify) {
        const minifyOptions = typeof options.minify === 'object'
            ?   options.minify
            :   {};

        config.plugins.push(new Webpack.optimize.UglifyJsPlugin(minifyOptions));
    }

    return config;
}
