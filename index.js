var MemoryFs = require('memory-fs');
var Superagent = require('superagent');
var Rx = require('rxjs');
var Webpack = require('webpack');
var _ = require('lodash');

var LIST_MODULES_URL = 'https://webtask.it.auth0.com/api/run/wt-tehsis-gmail_com-1?key=eyJhbGciOiJIUzI1NiIsImtpZCI6IjIifQ.eyJqdGkiOiJmZGZiOWU2MjQ0YjQ0YWYyYjc2YzAwNGU1NjgwOGIxNCIsImlhdCI6MTQzMDMyNjc4MiwiY2EiOlsiZDQ3ZDNiMzRkMmI3NGEwZDljYzgwOTg3OGQ3MWQ4Y2QiXSwiZGQiOjAsInVybCI6Imh0dHA6Ly90ZWhzaXMuZ2l0aHViLmlvL3dlYnRhc2tpby1jYW5pcmVxdWlyZS90YXNrcy9saXN0X21vZHVsZXMuanMiLCJ0ZW4iOiIvXnd0LXRlaHNpcy1nbWFpbF9jb20tWzAtMV0kLyJ9.MJqAB9mgs57tQTWtRuZRj6NCbzXxZcXCASYGISk3Q6c';


module.exports.bundle = bundle;


function bundle(options) {
    options = _.defaults({}, options, {
        name: 'webtask',
    });
    
    if (!options.entry) return Rx.Observable.throw(new Error('The `entry` option is required'));
    
    return loadModules()
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
                    
                    subscriber.next(res.body.modules);
                    subscriber.complete();
                });
            
        });
    }
    
    function configureWebpack(modules) {
        var config = {
            entry: _.set({}, options.name, options.entry),
            output: {
                path: '/',
                filename: 'bundle.js',
                publicPath: '/build/',
                library: true,
                libraryTarget: 'commonjs2',
            },
            externals: _(modules).reduce(function (acc, module) {
                return _.set(acc, module.name, true);
            }, {
                // Not provisioned via verquire
                'auth0-api-jwt-rsa-validation': true,
                'auth0-authz-rules-api': true,
                'auth0-oauth2-express': true,
                'auth0-sandbox-ext': true,
                'detective': true,
                'sandboxjs': true,
                'webtask-tools': true,
            }),
            plugins: [
                new Webpack.optimize.DedupePlugin(),
            ],
            resolve: {
                modulesDirectories: ['node_modules'],
                root: __dirname,
                alias: {},
            },
            node: false,
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