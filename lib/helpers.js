'use strict';

var Path = require('path');
const Superagent = require('superagent');


const LIST_MODULES_URL = 'https://webtask.it.auth0.com/api/run/wt-tehsis-gmail_com-1?key=eyJhbGciOiJIUzI1NiIsImtpZCI6IjIifQ.eyJqdGkiOiJmZGZiOWU2MjQ0YjQ0YWYyYjc2YzAwNGU1NjgwOGIxNCIsImlhdCI6MTQzMDMyNjc4MiwiY2EiOlsiZDQ3ZDNiMzRkMmI3NGEwZDljYzgwOTg3OGQ3MWQ4Y2QiXSwiZGQiOjAsInVybCI6Imh0dHA6Ly90ZWhzaXMuZ2l0aHViLmlvL3dlYnRhc2tpby1jYW5pcmVxdWlyZS90YXNrcy9saXN0X21vZHVsZXMuanMiLCJ0ZW4iOiIvXnd0LXRlaHNpcy1nbWFpbF9jb20tWzAtMV0kLyJ9.MJqAB9mgs57tQTWtRuZRj6NCbzXxZcXCASYGISk3Q6c';
const BUILTIN = {
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


exports.getDirname         = getDirname;
exports.getPackageJsonPath = getPackageJsonPath;
exports.loadBuiltins       = loadBuiltins;


function getDirname (entry) {
    const segments = Path.dirname(Path.normalize(entry))
        .split(Path.sep)
        .filter(Boolean);
    
    while (segments.length) {
        try {
            const pathname = Path.sep + Path.join.apply(null, segments.concat(['package.json']));
            
            // When require doesn't throw, we break out of the loop
            require(pathname);

            break;
        } catch (__) { }
        
        segments.pop();
    }
    
    return segments.length
        ?   Path.resolve(Path.sep + Path.join.apply(null, segments))
        :   process.cwd();
}

function getPackageJsonPath(entry) {
    return Path.join(getDirname(entry), 'package.json');
}

function loadBuiltins(cb) {
    Superagent.get(LIST_MODULES_URL)
        .accept('json')
        .end(function (err, res) {
            if (err) return cb(err);
            
            if (!res.body || !Array.isArray(res.body.modules)) {
                return cb(new Error('Unexpected response format when requesting webtask modules'));
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
            
            return cb(null, modules);
        });
}
