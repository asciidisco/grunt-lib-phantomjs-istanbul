# grunt-lib-puppeteer-istanbul

> This is a fork of [grunt-lib-phantomjs-istanbul](https://github.com/asciidisco/grunt-lib-phantomjs-istanbul)
> which is a the fork of [grunt-lib-phantomjs](https://github.com/gruntjs/grunt-lib-phantomjs) repo
> modified for to replace phantomjs with puppeteer this is a change as phantomjs has been unsupported due to the release of puppeteer and is not supported on OSX High Sierra.

## Installation:

> Note: Puppeteer requires at least Node v6.4.0, but the examples below use async/await which is only supported in Node v7.6.0 or greater

## Libraries Utilized:
### [puppeteer](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md)
 - essentially a javascript api around chrome-drivers that allow for easy interoperability with a chromium browser.

### [node-ipc](https://www.npmjs.com/package/node-ipc)
 - a socket library that makes handing events much easier for child processes and abstracts out some of the esoteric aspects of socket ipc communication

## Inspired by:
### [electron/spectron](https://github.com/electron/spectron/)
 - a testing suite using chrome-drivers for electron applications

### [davidtaylorhq/qunit-puppeteer](https://github.com/davidtaylorhq/qunit-puppeteer/blob/master/bin/qunit-puppeteer.js)
 - a simple runner for qunit tests with puppeteer

---

Original Task by [The Grunt Contrib Team](http://gruntjs.com/)

Modified by [asciidisco](http://twitter.com/asciidisco)
then modified again by [lee-leonardo](https://github.com/lee-leonardo)
