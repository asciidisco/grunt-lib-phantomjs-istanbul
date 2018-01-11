#! /usr/bin/env node

/* jshint ignore:start */ // This is needed as es7 features are not supported in jshint as of Jan 01, 2018

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const setup = require('./puppeteer-setup');
const args = require('./puppeteer-args').argv(process.argv, 3);

if (!args) {
  console.log("Usage: node run-qunit-chrome.js <URL> <timeout>");
  process.exit(1);
}

const [
  // tempFilePath, // the file that is used for communication
  tempFileDir,
  pageUrl,      // test page url path
  opts       // puppeteer options
] = args;
// const tempFile = path.resolve(tempFilePath);
const options = JSON.parse(opts || {});
const launchOptions = setup.launchOptions(options.puppeteer);
const viewportOptions = setup.viewPortOptions(options.viewport);

puppeteer
.launch(launchOptions)
.then(async browser => {
  const page = await browser.newPage();
  page.setViewport(viewportOptions);

  // Basic function to  write to the tmpfile that grunt polls against to pick up changes.
  var sendMessage = function(arg) {
    var args = Array.isArray(arg) ? arg : [].slice.call(arguments);
    fs.write(tempFile, JSON.stringify(args) + '\n', 'a');
  };

  //TODO need to ensure that this is working properly
  // This injects the script tags to the page prior to it this is injected into the frame,
  var scripts = Array.isArray(options.inject) ? options.inject : [options.inject];
  sendMessage('inject', options.inject);
  await scripts.forEach(async script => page.addScriptTag(script)); // TODO need to test if this works...

  // Attach to browser console log events, and log to node console
  await page.on('console', (...params) => {
    for (let i = 0; i < params.length; ++i) {
      console.log(`${params[i].text}`);
      sendMessage('console', params[i]); //TODO should I only log 'log' level
    }
      //Logs everything here indiscriminately, , the params object is constructed as such:
      /*
        ConsoleMessage(
          type: 'log' | 'error' | etc,
          text: 'the outpur of the console message'
          args: 'a list of the arguments'
        )
      */
  });

  var moduleErrors = [];
  var testErrors = [];
  var assertionErrors = [];

  await page.on('error', err => {
    console.error(err);
    console.error(err.stack);
    sendMessage('error.onError', err, err.stack, "node error"); // this logs an error thrown by node.
  });

  await page.on('pageerror', err => {
    sendMessage('error.onError', err);
  });

  await page.on('request', req => {
    sendMessage('requestIssued', req);
    //TODO - this is a really messy bit of code... will have to determine the best solution at a later point.
  });

  await page.on('requestfailed', req => {
    sendMessage('resourceFailed', req);
  });

  await page.on('requestfinished', req => {
    sendMessage('resourceFinished', req);
  });

  await page.on('response', res => {
    sendMessage('responseReceived', res);
  });

  await page.exposeFunction('harness_moduleDone', context => {
    if (context.failed) {
      var msg = "Module Failed: " + context.name + "\n" + testErrors.join("\n");
      moduleErrors.push(msg);
      testErrors = [];
    }
  });

  await page.exposeFunction('harness_testDone', context => {
    if (context.failed) {
      var msg = "  Test Failed: " + context.name + assertionErrors.join("    ");
      testErrors.push(msg);
      assertionErrors = [];
      process.stdout.write("F");
      sendMessage('F');
    } else {
      process.stdout.write(".");
      sendMessage('.');
    }
  });

  await page.exposeFunction('harness_log', context => {
    if (context.result) {
      return;
    } // If success don't log

    var msg = "\n    Assertion Failed:";
    if (context.message) {
      msg += " " + context.message;
    }

    if (context.expected) {
      msg += "\n      Expected: " + context.expected + ", Actual: " + context.actual;
    }

    assertionErrors.push(msg);
    sendMessage(msg);
  });

  await page.exposeFunction('harness_done', context => {
    console.log("\n");

    if (moduleErrors.length > 0) {
      for (var idx = 0; idx < moduleErrors.length; idx++) {
        console.error(moduleErrors[idx] + "\n");
      }
    }

    var stats = [
      "Time: " + context.runtime + "ms",
      "Total: " + context.total,
      "Passed: " + context.passed,
      "Failed: " + context.failed
    ];
    console.log(stats.join(", "));

    browser.close();
    if (context.failed > 0) {
      process.exit(1);
    } else {
      process.exit();
    }
  });


  //TODO ----------------------------------

  console.log(pageUrl);



  await page.goto("file://" + pageUrl);

  await page.evaluate(() => {
    QUnit.config.testTimeout = 10000;

    // Cannot pass the window.harness_blah methods directly, because they are
    // automatically defined as async methods, which QUnit does not support
    QUnit.moduleDone((context) => {
      window.harness_moduleDone(context);
    });
    QUnit.testDone((context) => {
      window.harness_testDone(context);
    });
    QUnit.log((context) => {
      window.harness_log(context);
    });
    QUnit.done((context) => {
      window.harness_done(context);
    });

    console.log("\nRunning: " + JSON.stringify(QUnit.urlParams) + "\n");
  });

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  await wait(timeout);

  console.error("Tests timed out");
  browser.close();
  process.exit(124);
})
.catch((error) => {
  console.error(error);
  process.exit(1);
});
