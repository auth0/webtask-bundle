var Chalk     = require('chalk');
var Fs         = require('fs');
var Helpers    = require('./helpers');
var Path       = require('path');
var Readline   = require('readline-sync');
var Rx         = require('rxjs');
var Semver     = require('semver');
var Superagent = require('superagent');
var Table      = require('cli-table');
var _          = require('lodash');

var LIST_MODULES_URL = 'https://webtask.it.auth0.com/api/run/wt-tehsis-gmail_com-1?key=eyJhbGciOiJIUzI1NiIsImtpZCI6IjIifQ.eyJqdGkiOiJmZGZiOWU2MjQ0YjQ0YWYyYjc2YzAwNGU1NjgwOGIxNCIsImlhdCI6MTQzMDMyNjc4MiwiY2EiOlsiZDQ3ZDNiMzRkMmI3NGEwZDljYzgwOTg3OGQ3MWQ4Y2QiXSwiZGQiOjAsInVybCI6Imh0dHA6Ly90ZWhzaXMuZ2l0aHViLmlvL3dlYnRhc2tpby1jYW5pcmVxdWlyZS90YXNrcy9saXN0X21vZHVsZXMuanMiLCJ0ZW4iOiIvXnd0LXRlaHNpcy1nbWFpbF9jb20tWzAtMV0kLyJ9.MJqAB9mgs57tQTWtRuZRj6NCbzXxZcXCASYGISk3Q6c';

module.exports.check = check;
module.exports.sync  = sync;

function checkVersion(local, webtask) {
    var flag = true;

    if (webtask !== '-' && webtask !== 'native') {
        flag = Semver.satisfies(webtask, local);
    }

    return flag;
}

function findByName (key) {
    return function (el) {
        return el.name === key;
    };
}

function format(str, length) {
    var strLength = str.length;

    for(var i = 0; i < (length-strLength); i++) {
        str = str + ' ';
    }

    return str;
}

function sync(options) {
    if (!options) options = {};
    
    return Rx.Observable.create(function (subscriber) {
        var pkg = Helpers.getPackageJsonPath(options.entry);

        try {
            Fs.statSync(pkg);
        }
        catch (err) {
            console.log(Chalk.red('\n-> "package.json" does not exists\n'));
            subscriber.error(err);
        }

        Superagent.get(LIST_MODULES_URL)
            .end(function (err, res) {
                if (err) {
                    console.log(Chalk.red('\n-> Error loading modules from webtask.io\n'));
                    subscriber.error(err);
                }

                var pkgJson   = JSON.parse(Fs.readFileSync(pkg).toString());
                var libraries = res.body;
                var pristine  = true;

                Object.keys(pkgJson.dependencies).forEach(function (key) {
                    var wtLib        = libraries.modules.filter(findByName(key)).reverse().pop();
                    var localVersion = pkgJson.dependencies[key];

                    if (wtLib && wtLib.version !== localVersion) {
                        if (options.interactive) {
                            var value = Readline.keyInYN(Chalk.blue('->') + ' Do you want to modify ' + Chalk.green(key) + ' from '+ Chalk.green('v' + localVersion) +' to ' + Chalk.green('v' + wtLib.version) + '?');

                            if (value) {
                                pkgJson.dependencies[key] = wtLib.version;
                                pristine = false;
                            }
                        } else {
                            console.log(Chalk.blue('->') + ' Updating %s from %s to %s', Chalk.green(format(key, 25)), Chalk.green(format(localVersion, 8)), Chalk.green(format(wtLib.version, 8)));
                            pkgJson.dependencies[key] = wtLib.version;
                            pristine = false;
                        }
                    }
                });
        
                if (!pristine) {
                    try {
                        console.log('\n-> Copying "package.json" to "package.json.orig"\n');
                        Fs.createReadStream(pkg).pipe(Fs.createWriteStream(Path.join(process.cwd(), 'package.json.orig')));
                    }
                    catch (err) {
                        console.log('\n-> Error trying to copy "package.json"\n'.red);
                        subscriber.error(err);
                    }
    
                    try {
                        Fs.writeFileSync(pkg, JSON.stringify(pkgJson, null, 2));
                        console.log(Chalk.green('\n-> "package.json" updated successfully\n'));
                    }
                    catch (err) {
                        console.log(err);
                        console.log(Chalk.red('\n-> Error updating "package.json"\n'));
                        subscriber.error(err);
                    }
                } else {
                    console.log(Chalk.green('\n-> All required packages are supported on the platform\n'));
                }
                
                subscriber.complete();
            });
    });
}

function check(options) {
    if (!options) options = {};
    
    return Rx.Observable.create(function (subscriber) {
        var pkg = Helpers.getPackageJsonPath(options.entry);

        var table = new Table({
            head: ['', 'Dependency', 'Range', 'Available version(s)'],
            colWidths: [3, 30, 14, 26],
            style : {compact : true, head: ['white']}
        });

        try {
            Fs.statSync(pkg);
        }
        catch (err) {
            console.log(Chalk.red('\n-> "package.json" does not exists\n'));
            subscriber.error(err);
        }

        Superagent.get(LIST_MODULES_URL)
            .end(function (err, res) {
                if (err) {
                    console.log(Chalk.red('\n-> Error loading modules from webtask.io\n'));
                    subscriber.error(err);
                }

                var libraries    = res.body;
                var pkgJson      = JSON.parse(Fs.readFileSync(pkg).toString());
                var dependencies = pkgJson.dependencies;
                var isCompliant  = true;

                if (dependencies) {
                    Object.keys(dependencies).forEach(function (key) {
                        var localRange = dependencies[key];
                        var cloudVersions = _(libraries.modules)
                            .filter(_.matchesProperty('name', key))
                            .map(_.property('version'))
                            .value();

                        var found = Semver.maxSatisfying(cloudVersions, localRange);
                        var color = !found ? Chalk.red : Chalk.green;
                        var diff = color('\u25A0');
                        var element = {};
                        var display = found || cloudVersions.join(', ') || '-';

                        element[diff] = [color(key), color(localRange), color(display)];

                        table.push(element);

                        isCompliant = isCompliant && !!found;
                    });

                    console.log();
                    console.log(table.toString());

                    if (isCompliant) {
                        console.log(Chalk.green('\n-> Your library is compliant with Webtask.io\n'));
                    } else {
                        console.log(Chalk.white('\n-> By requiring different versions than webtask.io you\'ll have heavier bundles.\n'));
                    }
                } else {
                    console.log(Chalk.yellow('\n-> "package.json" does not have dependencies to check\n'));
                }

                subscriber.complete();
            });
    });
}
