var fs         = require('fs')
var Table      = require('cli-table');
var colors     = require('colors');
var path       = require('path');
var Superagent = require('superagent');
var readline   = require('readline-sync');
var helpers    = require('./helpers');
var semver     = require('semver');
var _          = require('lodash');
var Rx         = require('rxjs');

var LIST_MODULES_URL = 'https://webtask.it.auth0.com/api/run/wt-tehsis-gmail_com-1?key=eyJhbGciOiJIUzI1NiIsImtpZCI6IjIifQ.eyJqdGkiOiJmZGZiOWU2MjQ0YjQ0YWYyYjc2YzAwNGU1NjgwOGIxNCIsImlhdCI6MTQzMDMyNjc4MiwiY2EiOlsiZDQ3ZDNiMzRkMmI3NGEwZDljYzgwOTg3OGQ3MWQ4Y2QiXSwiZGQiOjAsInVybCI6Imh0dHA6Ly90ZWhzaXMuZ2l0aHViLmlvL3dlYnRhc2tpby1jYW5pcmVxdWlyZS90YXNrcy9saXN0X21vZHVsZXMuanMiLCJ0ZW4iOiIvXnd0LXRlaHNpcy1nbWFpbF9jb20tWzAtMV0kLyJ9.MJqAB9mgs57tQTWtRuZRj6NCbzXxZcXCASYGISk3Q6c';

module.exports.check = check;
module.exports.sync  = sync;

function checkVersion(local, webtask) {
    var flag = true;

    if (webtask !== '-') {
        flag = semver.ltr(webtask, local);
    }

    return flag;
}

function findByName (key) {
    return function (el) {
        return el.name === key;
    }
}

function findByNameAndVersion (key, localVersion) {
    return function (el) {
        return el.name === key &&  el.version === localVersion;
    }
}

function format(str, length) {
    var strLength = str.length;

    for(var i = 0; i < (length-strLength); i++) {
        str = str + ' ';
    }

    return str;
}

function sync(opt) {
    return Rx.Observable.create(function (subscriber) {
        var pkg = helpers.getPackageJsonPath(opt.entry);

        try {
            fs.statSync(pkg);
        }
        catch (err) {
            console.log('\n-> "package.json" does not exists\n'.red);
            subscriber.error(err);
        }

        try {
            console.log('\n-> Copying "package.json" to "package.json.orig"\n');
            fs.createReadStream(pkg).pipe(fs.createWriteStream(path.join(process.cwd(), 'package.json.orig')));
        }
        catch (err) {
            console.log('\n-> Error trying to copy "package.json"\n'.red);
            subscriber.error(err);
        }

        Superagent.get(LIST_MODULES_URL)
            .end(function (err, res) {
                if (err) {
                    console.log('\n-> Error loading modules from webtask.io\n'.red);
                    subscriber.error(err);
                }

                var package   = JSON.parse(fs.readFileSync(pkg).toString());
                var libraries = res.body;

                Object.keys(package.dependencies).forEach(function (key) {
                    var wtLib        = libraries.modules.filter(findByName(key)).reverse().pop();
                    var localVersion = package.dependencies[key];

                    if (wtLib && wtLib.version !== localVersion) {
                        if (opt.interactive) {
                            var value = readline.keyInYN('->'.blue + ' Do you want to modify ' + key.green + ' from '+ ('v' + localVersion).green +' to ' + ('v' + wtLib.version).green + '?');

                            if (value) {
                                package.dependencies[key] = wtLib.version;
                            }
                        } else {
                            console.log('->'.blue + ' Updating %s from %s to %s', format(key, 25).green, format(localVersion, 8).green, format(wtLib.version, 8).green);
                            package.dependencies[key] = wtLib.version;
                        }
                    }
                });

                try {
                    fs.writeFileSync(pkg, JSON.stringify(package, null, 2));
                    console.log('\n-> "package.json" updated successfully\n'.green);
                    subscriber.complete();
                }
                catch (err) {
                    console.log(err);
                    console.log('\n-> Error updating "package.json"\n'.red);
                    subscriber.error(err);
                }
            });
    });
}

function check(opt) {
    return Rx.Observable.create(function (subscriber) {
        var pkg = helpers.getPackageJsonPath(opt.entry);

        var table = new Table({
            head: ['', 'Dependency', 'Version', 'Available version'],
            colWidths: [3, 30, 20, 20],
            style : {compact : true, head: ['white']}
        });

        try {
            fs.statSync(pkg);
        }
        catch (err) {
            console.log('\n-> "package.json" does not exists\n'.red);
            subscriber.error(err);
        }

        Superagent.get(LIST_MODULES_URL)
            .end(function (err, res) {
                if (err) {
                    console.log('\n-> Error loading modules from webtask.io\n'.red);
                    subscriber.error(err);
                }

                var libraries    = res.body;
                var package      = JSON.parse(fs.readFileSync(pkg).toString());
                var dependencies = package.dependencies;
                var isCompliant  = true;

                if (dependencies) {
                    Object.keys(dependencies).forEach(function (key) {
                        var localVersion = dependencies[key];
                        var lib          = _.find(libraries.modules, _.matches({name: key, version: localVersion}));

                        lib = lib || _.find(libraries.modules, _.matchesProperty('name', key)) || {version: '-'};

                        var flag    = checkVersion(localVersion, lib.version);
                        var color   = flag ? 'red' : 'green';
                        var diff    = flag ? '\u25A0'.red : '\u25A0'.green;
                        var element = {};

                        element[diff] = [key[color], localVersion[color], lib.version[color]];

                        table.push(element);

                        isCompliant = isCompliant && !flag;
                    });

                    console.log();
                    console.log(table.toString());

                    if (isCompliant) {
                        console.log('\n-> Your library is compliant with Webtask.io\n'.green);
                    } else {
                        console.log('\n-> By requiring different versions than webtask.io you\'ll have heavier bundles.\n'.white);
                    }
                } else {
                    console.log('\n-> "package.json" does not have dependencies to check\n'.yellow)
                }

                subscriber.complete();
            });
    });
}
