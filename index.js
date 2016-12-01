'use strict';

const CalculateExternalsLoose = require('./lib/calculateExternalsLoose');
const CalculateExternalsStrict = require('./lib/calculateExternalsStrict');
const CompileBundle = require('./lib/compileBundle');
const ConfigureWebpack = require('./lib/configureWebpack');
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
    
    const calculateExternals$ = options.loose
        ?   Rx.Observable.bindNodeCallback(CalculateExternalsLoose)
        :   Rx.Observable.bindNodeCallback(CalculateExternalsStrict);
    
    return calculateExternals$(options.entry)
        .map(modules => ConfigureWebpack(Object.assign({}, options, { externals: modules.externals })))
        .map(webpackConfig => ({
            webpackConfig,
            watch: !!options.watch,
        }))
        .mergeMap(CompileBundle);
}