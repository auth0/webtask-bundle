'use strict';

const Compiler = require('./lib/compiler');
const Config = require('./lib/config');
const Rx = require('rxjs');


module.exports = {
    bundle,
};


function bundle(options) {
    if (typeof options !== 'object') {
        return Rx.Observable.throw(new Error('Options must be an object'));
    }

    if (!options.entry) {
        return Rx.Observable.throw(new Error('The `entry` option is required'));
    }

    if (!options.name) {
        options.name = 'webtask';
    }

    const webpackConfig = Config.create(options);

    return Rx.Observable.of(webpackConfig)
        .map(webpackConfig => ({
            webpackConfig,
            watch: !!options.watch,
        }))
        .mergeMap(Compiler.compile);
}
