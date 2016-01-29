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
    'webtask-tools': ['1.2.0'],
    'zmq': ['2.13.0'],
};

module.exports.bundle = bundle;


function bundle(options) {
    options = _.defaults({}, options, {
        name: 'webtask',
    });
    
    if (!options.entry) return Rx.Observable.throw(new Error('The `entry` option is required'));
    
    return loadModules()
        .flatMap(calculateExternals)
        .map(configureWebpack)
        .flatMap(compileBundle);
    
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
                        installed: {},
                    });
                    
                    subscriber.next(modules);
                    subscriber.complete();
                });
            
        });
    }
    
    function calculateExternals(modules) {
        var dirs = Path.dirname(Path.normalize(options.entry))
            .split(Path.sep)
            .filter(Boolean)
            .reduce(function (acc, segment) {
                var parent = acc.length
                    ?   acc[acc.length - 1] 
                    :   '';
                
                return acc.concat([parent + Path.sep + segment]);
            }, []);
        
        
        return Rx.Observable.from(dirs.reverse())
            .map(readPackageJson)
            .filter(Boolean)
            .take(1)
            .map(compareToModules);
        
        function readPackageJson(dirname) {
            try {
                var pkgJson = require(Path.join(dirname, 'package.json'));
                 return pkgJson.dependencies;
            } catch (__) { }
            
            return null;
        }
        
        // Only mark modules as externals if the range required in the top-most
        // package.json dependencies field is satisfied by the first (default)
        // version on webtask.io
        function compareToModules(dependencies) {
            var context = {
                externals: modules.native,
                bundled: {},
            };
            
            Object.keys(dependencies).forEach(function (moduleName) {
                var available = modules.installed[moduleName];
                var spec = dependencies[moduleName];
                
                if (available && available.length && Semver.satisfies(available[0], spec)) {
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
            plugins: [
                new Webpack.optimize.DedupePlugin(),
            ],
            resolve: {
                modulesDirectories: ['node_modules'],
                root: __dirname,
                alias: {},
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
                    var code = memFs.readFileSync('/bundle.js', 'utf8');
                    
                    subscriber.next({
                        code: code,
                        generation: ++generation,
                        stats: stats.toJson(),
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