var Glob = require('glob');
var MemoryFs = require('memory-fs');
var Path = require('path');
var Rx = require('rxjs');
var Semver = require('semver');
var Superagent = require('superagent');
var Webpack = require('webpack');
var _ = require('lodash');

var LIST_MODULES_URL = 'https://webtask.it.auth0.com/api/run/wt-tehsis-gmail_com-1?key=eyJhbGciOiJIUzI1NiIsImtpZCI6IjIifQ.eyJqdGkiOiJmZGZiOWU2MjQ0YjQ0YWYyYjc2YzAwNGU1NjgwOGIxNCIsImlhdCI6MTQzMDMyNjc4MiwiY2EiOlsiZDQ3ZDNiMzRkMmI3NGEwZDljYzgwOTg3OGQ3MWQ4Y2QiXSwiZGQiOjAsInVybCI6Imh0dHA6Ly90ZWhzaXMuZ2l0aHViLmlvL3dlYnRhc2tpby1jYW5pcmVxdWlyZS90YXNrcy9saXN0X21vZHVsZXMuanMiLCJ0ZW4iOiIvXnd0LXRlaHNpcy1nbWFpbF9jb20tWzAtMV0kLyJ9.MJqAB9mgs57tQTWtRuZRj6NCbzXxZcXCASYGISk3Q6c';
var BUILTIN = {
    'auth0-api-jwt-rsa-validation': ['0.0.1'],
    'auth0-authz-rules-api': ['1.0.3'],
    'auth0-oauth2-express': ['0.0.1'],
    'bunyan': ['1.5.1'],
    'cron-parser': ['1.0.1'],
    'detective': ['4.3.1'],
    'droplet': ['1.4.0'],
    'joi': ['6.10.0'],
    'jws': ['3.1.0'],
    'nodalytics': ['1.1.0'],
    'restify': ['2.8.5'],
    'sandboxjs': ['2.0.0'],
    'webtask-tools': ['1.3.0'],
    'zmq': ['2.13.0'],
};

module.exports.bundle = bundle;


function bundle(options) {
    options = _.defaults({}, options, {
        name: 'webtask',
    });
    
    if (!options.entry) return Rx.Observable.throw(new Error('The `entry` option is required'));
    
    return loadModules()
        .mergeMap(calculateExternals)
        .map(configureWebpack)
        .mergeMap(compileBundle);
    
    function loadModules() {
        return Rx.Observable.create(function (subscriber) {
            Superagent.get(LIST_MODULES_URL)
                .accept('json')
                .end(function (err, res) {
                    if (err) return subscriber.error(err);
                    
                    if (!res.body || !Array.isArray(res.body.modules)) {
                        return subscriber.error(new Error('Unexpected response format when requesting webtask modules'));
                    }
                    
                    var modules = res.body.modules.reduce(function (acc, module) {
                        if (module.version === 'native') {
                            acc.native[module.name] = true;
                        } else {
                            if (!acc.installed[module.name]) {
                                acc.installed[module.name] = [];
                            }
                            
                            acc.installed[module.name].push(module.version);
                        }
                        
                        return acc;
                    }, {
                        native: {},
                        installed: BUILTIN,
                    });
                    
                    subscriber.next(modules);
                    subscriber.complete();
                });
            
        });
    }
    
    function calculateExternals(modules) {
        var segments = Path.dirname(Path.normalize(options.entry))
            .split(Path.sep)
            .filter(Boolean);
        
        while (segments.length) {
            try {
                var pathname = Path.sep + Path.join.apply(null, segments.concat(['package.json']));
                
                // When require doesn't throw, we break out of the loop
                require(pathname);

                break;
            } catch (__) { }
            
            segments.pop();
        }
        
        var dirname = segments.length
            ?   Path.resolve(Path.sep + Path.join.apply(null, segments))
            :   process.cwd();
        
        return listPackageJsonFiles(dirname)
            .flatMap(extractDependencies)
            .reduce(function (acc, dep) { return acc.concat([dep]); }, [])
            .map(compareToModules);
        
        function listPackageJsonFiles(dirname) {
            return Rx.Observable.create(function (subscriber) {
                var pathname = Path.join(dirname, 'package.json');
                
                try {
                    subscriber.next(pathname);
                    
                    return Glob('**/package.json', {
                        cwd: dirname,
                    }, function (err, matches) {
                        if (err) return subscriber.error(err);
                        
                        matches
                            .map(function (path) { return Path.join(dirname, path); })
                            .forEach(subscriber.next, subscriber);
                        
                        subscriber.complete();
                    });
                } catch (e) {
                    subscriber.error(e);
                }
            });
        }
        
        function extractDependencies(pathname) {
            return Rx.Observable.create(function (subscriber) {
                try {
                    // See if this succeeds (sync)
                    var dependencies = require(pathname).dependencies || {};
                    
                    Object.keys(dependencies).forEach(function (key) {
                        subscriber.next({ name: key, spec: dependencies[key] });
                    });
                    
                    subscriber.complete();
                } catch (e) {
                    subscriber.error(e);
                }
            });
        }
        
        // Only mark modules as externals if the range required in the top-most
        // package.json dependencies field is satisfied by the first (default)
        // version on webtask.io
        function compareToModules(dependencies) {
            var context = {
                externals: modules.native,
                bundled: {},
            };
            
            dependencies.forEach(function (dependency) {
                var moduleName = dependency.name;
                var spec = dependency.spec || '*';
                var available = modules.installed[moduleName];
                var defaultWebtaskVersion = available && available[0];
                
                if (defaultWebtaskVersion && (options.loose || Semver.satisfies(defaultWebtaskVersion, spec))) {
                    context.externals[moduleName] = true;
                } else {
                    context.bundled[moduleName] = {
                        available: available,
                        spec: spec,
                    };
                }
            });
            
            return context;
        }
    }
    
    function configureWebpack(context) {
        var config = {
            entry: _.set({}, options.name, options.entry),
            output: {
                path: '/',
                filename: 'bundle.js',
                publicPath: '/build/',
                library: true,
                libraryTarget: 'commonjs2',
            },
            externals: context.externals,
            module: {
                loaders: [
                    {
                        test: /\.jsx?$/,
                        exclude: /node_modules/,
                        loader: require.resolve('babel-loader'),
                        query: {
                            presets: [require.resolve('babel-preset-es2015')],
                            plugins: [require.resolve('babel-plugin-transform-runtime')],
                        },
                    }
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
            config.plugins.push(new Webpack.optimize.UglifyJsPlugin(_.defaults({}, options.minify)));
        }
        
        return config;
    }
    
    function compileBundle(config) {
        var memFs = new MemoryFs();
        var compiler = Webpack(config);
        var generation = 0;
        
        compiler.outputFileSystem = memFs;
        
        return Rx.Observable.create(function (subscriber) {
            if (options.watch) {
                var watcher = compiler.watch({}, onWatch);
                
                // Return an async disposer function
                return Rx.Observable.defer(function () {
                    return Rx.Observable.bindNodeCallback(watcher.close.bind(watcher));
                });
            } else {
                compiler.run(onRun);
            }
            
            function onGeneration(stats) {
                try {
                    var info = stats.toJson();
                    var code = stats.hasErrors()
                        ?   undefined
                        :   memFs.readFileSync('/bundle.js', 'utf8');
                    
                    subscriber.next({
                        code: code,
                        generation: ++generation,
                        stats: info,
                        config: config,
                    });
                } catch (e) {
                    subscriber.error(e);
                }
                
            }
            
            function onRun(err, stats) {
                if (err) {
                    console.warn(err.message);
                    
                    return subscriber.error(err);
                }
                
                onGeneration(stats);
                
                subscriber.complete();
            }
            
            function onWatch(err, stats) {
                if (err) {
                    console.warn(err.message);
                    
                    return subscriber.error(err);
                }
                
                onGeneration(stats);
            }
        });
    }
}