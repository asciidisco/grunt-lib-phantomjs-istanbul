#! /usr/bin/env node

/* jshint ignore:start */ // This is needed as es7 features are not supported in jshint as of Jan 01, 2018
/*
  // from cli
  options: {
    isHttp: boolean // determines whether or not to use puppeteer.launch (https or file)
    isSocket: boolean // puppeteer.connect (connect to socket)
    puppeteer: {}, // same as launch https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions
    viewport: {}, // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetviewportviewport
    console: {}, // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#event-console
    expose: {}, // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageexposefunctionname-puppeteerfunction
    inject: {
      scripts: {} // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddscripttagoptions
      styles: {}, // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddstyletagoptions
    },
    evaluate: {} // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageevaluatepagefunction-args
  }

  // from
  data: {
    launch: {}, // puppeteer from above
    viewport: {},
    console: {},
    expose: {},
    inject: {
      scripts: {}
      styles: {},
    },
    evaluate: {}
  }
*/

const ipc = require('node-ipc');
const puppeteer = require('puppeteer');

const setup = require('./puppeteer-setup');
const args = require('./puppeteer-args').argv(process.argv, 1);

if (!args) {
  console.log("Usage: node run-qunit-chrome.js options");
  process.exit(1);
}

// TODO add support for cli not just json str
// TODO maybe use the data object to pass information rather relying on the cli too much.
// TODO maybe abstract out this into two parts?
var connected = false;
const [
  opts // puppeteer options
] = args;

ipc.config.id = 'producer'; //TODO make this editable by the cli or json
ipc.config.retry = 1500;
ipc.config.maxConnections = 1;

ipc.serve(() => {
  ipc.server.on('test.page', (data, socket) => {
    connected = true;
    ipc.log("received data: ".log, data);

    const options = setup.handleOptions(JSON.parse(opts || {}), data)

    puppeteer
      .launch(options.launch)
      .then(async browser => {
        // Setup
        const page = await browser.newPage();
        var moduleErrors = [];
        var testErrors = [];
        var assertionErrors = [];

        await page.on('console', setup.generateLogger({
          settings: options.console,
          ipc: ipc,
          socket: socket
        }));

        if (options.expose) {
          let entries = Object.entries(options.expose);
          let len = entries.length;
          for (let i = 0; i < len; i++) {
            let [
              fnName, // the function will be exposed on the window object
              fnPath // the path will be where node will pick up the fn and stick into the window obj
            ] = entries[i]

            await page.exposeFunction(domName, require(fnPath))
          }
        }

        // TODO do I need ot add the scripts before or after the page is navigated to? It'll be better if I can do it before....
        await page.goto(data.url);
        /*
          options.inject {
            //Doc: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddscripttagoptions
            script: { url, path, content },
            //Doc: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddstyletagoptions
            style: { url, path, content }
          }
        */
        if (options.inject) {
          if (options.inject.script) {
            if (Array.isArray(options.inject.script)) {
              let len = options.inject.script.length;
              for (let i = 0; i < len; i++) {
                await page.addScriptTag(options.inject.script[i]);
              }
            } else {
              await page.addScriptTag(options.inject.script);
            }
          }
          if (options.inject.style) {
            if (Array.isArray(options.inject.script)) {
              let len = options.inject.script.length;
              for (let i = 0; i < len; i++) {
                await page.addStyleTag(options.inject.style[i]);
              }
            } else {
              await page.addStyleTag(options.inject.style);
            }
          }
        }

        /* TODO -> help out with developing the evaluate section a bit more... all fn need to be paths to functions.
          // Work on three different options:
            1. an array that is a string represenation of a function for Function() emit result to test
            2. emit to grunt to test.
            3. a script that can be injected into the dom, this resolves itself
            4. a script that will evaluate based on a specific context
        */
        /*
          // Result will emit to the key.
          options.evaluate: {
            //Doc: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageevaluatepagefunction-args
            key: { pageFunction, ..args }
          }
        */

        // TODO need to work on making this an async queue rather than synchronous as is now.
        if (options.evaluate) {
          const entries = Object.entries(options.evaluate);
          let i = 0;
          const len = entries.length;
          for (let i = 0; i < len; i++) {
            const [
              eventName,
              fn
            ] = entries[i];

            const result = await page.evaluate(fn);
            ipc.emit(key, {
              result: JSON.parse(result)
            });
          }
        }

        function wait(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        await wait(ipc.config.retry);

        console.error("Tests timed out");
        ipc.server.emit(socket, 'test.timeout');
        browser.close();
      })
      .catch(err => {
        ipc.server.emit(socket, 'error', err);
        process.exit(1);
      });
  });
  //TODO this might not be necessary until we need a semaphore version.
  ipc.server.on('test.end', (data, socket) => {
    ipc.server.stop();
    process.exit(0);
  });
  ipc.server.on('socket.disconnected', (data, socket) => {
    ipc.log("DISCONNECTED\n\n");

    //TODO this needs to be moved.
    ipc.server.stop();
    process.exit(0);
  });
})

ipc.server.start();

//TODO is this necessary if I fixed this?
setTimeout(() => {
  if (!connected) {
    ipc.log("stopping server due to lack of connection");
    ipc.server.stop();
    process.exit(0);
  }
}, 10000);
