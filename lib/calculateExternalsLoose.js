'use strict';

const Async = require('async');
const Helpers = require('./helpers');


module.exports = calculateExternalsLoose;

/**
 * Calculate externals
 * 
 * @param {Object} options - Options
 * @param {String} options.entry - Path to entry-point
 * @param {Object} options.modules - Listing of modules available on the platform
 */
function calculateExternalsLoose(entry, cb) {
    return Async.waterfall([
        (next) => Helpers.loadBuiltins(next),
        (modules, next) => buildContext(modules, next),
    ], cb);
}

function buildContext(modules, cb) {
    const context = {
        externals: {},
        bundled: {},
    };
    
    Object.keys(modules.native)
        .concat(Object.keys(modules.installed))
        .forEach(name => {
            context.externals[name] = true
            //support 'modulename@version' syntax
            if(modules.installed[name]) {
                modules.installed[name].forEach((version) => {
                    context.externals[name + '@' + version] = true;
                })
            }
        });
    
    Object.keys(modules.installed)
        .forEach(name => {
            modules.installed[name].forEach(version => {
                context.externals[`${name}@${version}`] = true;
            });
        });
    
    cb(null, context);
}