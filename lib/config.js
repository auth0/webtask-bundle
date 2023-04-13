'use strict';

const Path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    create,
};

function create(options) {
    const dependencies = options.dependencies || {};
    const isBareModuleRx = /^(?![./\\]|[a-zA-Z]:)/;
    const moduleSpecRx = /^((?:@[^/]+\/)?[^/]+)/;
    const useBabel = !options.disableTranspilation;

    const jsLoaders = [
        {
            options: {
                'module.webtask': '>webtaskApi',
            },
            loader: require.resolve('imports-loader'),
        },
    ];

    if (useBabel) {
        jsLoaders.push({
            options: {
                presets: [[require.resolve('@babel/preset-env'), {
                    targets: {
                        node: options.nodeVersion || '4',
                    },
                    useBuiltIns: 'usage',
                }]],
            },
            loader: require.resolve('babel-loader'),
        });
    }

    const config = {
        entry: {
            [options.name]: options.entry,
        },
        externals(context, request, cb) {
            if (!isBareModuleRx.test(request)) {
                // This is not a 'bare module' specifier. Include this.
                return cb();
            }

            const matches = request.match(moduleSpecRx);

            if (!matches) {
                // This isn't something our regex understands. Let's bundle it to be safe.
                return cb();
            }

            const moduleName = matches[1];

            if (!dependencies[moduleName]) {
                // The module isn't specified in dependencies so we need to bundle it.
                return cb();
            }

            return cb(null, `commonjs2 ${request}`);
        },
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
                    use: jsLoaders,
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
        plugins: options.minify ? [new UglifyJsPlugin({
            extractComments: {
                condition: 'all',
                banner: false,
            },
        })] : [],
        resolve: {
            modules: [Path.join(process.cwd(), 'node_modules')],
            mainFields: ['module', 'main'],
        },
        resolveLoader: {
            modules: [Path.join(__dirname, 'node_modules')],
            // moduleExtensions: ['', '.webpack-loader.js', '.web-loader.js', '.loader.js', '.js'],
            mainFields: ['webpackLoader', 'loader', 'module', 'main'],
        },
        mode: 'development',
        devtool: false,
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

    return config;
}
