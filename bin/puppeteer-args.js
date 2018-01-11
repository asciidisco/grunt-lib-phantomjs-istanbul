function parseArgv(argv, length) {
    var args = argv.slice(2);

    if (args.length === length) {
        return args;
    }
    else {
        return null;
    }
}

module.exports.argv = parseArgv;