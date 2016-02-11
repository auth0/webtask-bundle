var Path = require('path');

function getDirname (entry) {
    var segments = Path.dirname(Path.normalize(entry))
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

    return segments.length
        ?   Path.resolve(Path.sep + Path.join.apply(null, segments))
        :   process.cwd();
}

function getPackageJsonPath(entry) {
    return Path.join(getDirname(entry), 'package.json');
}

module.exports.getDirname         = getDirname;
module.exports.getPackageJsonPath = getPackageJsonPath;
