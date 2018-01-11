/* jshint ignore:start */ // This is needed as es7 features are not supported in jshint as of Jan 01, 2018

const URL = require('url');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(pathString) {
  const url = URL.parse(pathString)

  return Promise.all(resolvePathPromises(url))
    .then(promises => {
      return promises.reduce((l, r) => l + r);
    })
}

/**
 * resolvePathPromises(Url: URL): [promises, strings]
 */
function resolvePathPromises(Url) {
  var queue = [];
  const protocol = Url.protocol ? "" : "file://" // if not a http call, then default to file system

  return [
    protocol,
    URL.format(Url)
  ];
}
