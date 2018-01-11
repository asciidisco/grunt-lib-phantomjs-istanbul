const {
  launch,
  viewport
} = require('./puppeteer-defaults');
const {
  consoleOpt,
  PuppeteerConsoleLog,
  PuppeteerConsoleError
} = require('./puppeteer-console');

// get values
// remove inject and evaluate
// iterate and assign
// handle inject and evaluate for their

//TODO need to handle a default logger in this path...
function handleOptions(options, data) {
  let result = setDefaults({
    launch: launch,
    viewport: viewport
    inject = {}
  }, options);

  result = overrideDefaults(result, data);
  result.inject = {
    script: handleInjections(result.inject.script, data.inject.script)
    style: handleInjections(result.inject.style, data.inject.style)
  }

  return result
}

function setDefaults(result, defaults) {
  let keys = Object.keys(options);

  keys = keys.forEach(key => {
    if (key !== "inject") {
      result[key] = defaults[key]
    }
  })

  return result
}

function overrideDefaults(result, data) {
  let keys = Object.keys(options);

   keys.forEach(key => {
      if (key !== "inject") {
        let value = data[key]

        if (typeof value === "object") {
          result[key] = Object.assign(result[key], value)
        }
        else {
          result[key] = value
        }
      }
    })
    return result
}

function handleInjections(defaults = {}, data = {}) {
  let entries = Object.entries(defaults).concat(Object.entries(data))
  let result = entries.map(entry => {
    const [
        key,
        path
    ]
    let o = {}
    o[key] = path

    return o
  }) //map to objects
  .reduce((l,r) => Object.assign(l,r)) // reduce to one object, overriding defaults with data

  Object.entries(result)
    .forEach(entry => {
      const [
        key,
        path
      ]
      result[key] = getScript(entry)
    })

  return result
}

function getScript(entry) {
  const [
    key,
    fnPath
  ] = entry

  return require(fnPath)
}

/*
  generateLogger({ logType : handlerFunction }})
  - Logger generator resolves most use cases of the logger.
  - Essentially the output of the logger is passed back as json to the receiving socket.
  - Puppeteer's api upon the console is here: https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-consolemessage
  - For additional information on the handler object https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-jshandle
  - Use https://developer.mozilla.org/en-US/docs/Tools/Web_Console to understand how this logging works in more detail.

  Gotchas:
  - The JSHandle@<type> is an object that is a Promise that can be handled in multiple ways. To use this

  pseudocode
    for each console message object

 */
/*
  ConsoleMessage
    - https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-consolemessage
    - type: string: the type of logger
    - text: string: the string representation of the object, non-primitives are marcated as JSHandle@<type>
    - args: [JSHandle<object>]: a object that holds Promises to retrieve each individual argument from the context

  JSHandle
    - https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-jshandle
    - contains functions that resolve promises that take a function may use the documents context
  */
function generateLogger({
  settings,
  ipc,
  socket
}) {
  ipc.server.emit(socket, "console", { type: 'log', text: "testing testing", args: [{a:1,b:true}] });

  return (...params) => {
    return Promise.all(
      // If json, resolve json before passing, if string pass string
      params.map(param => {
        return new Promise((resolve, reject) => {
          if (param.text.includes("JSHandle")) {
            Promise.all(param.args.map(promise => promise.jsonValue()))
              .then(args => {
                return resolve(
                  new PuppeteerConsoleLog({
                    type: param.type,
                    text: param.text,
                    args: args
                  })
                )
              })
              .catch(err => {
                return reject(Error("Puppeteer Logger Error: unable to resolve: " + text))
              })
          } else {
            return resolve(
              new PuppeteerConsoleLog({
                type: param.type,
                text: param.text
              })
            )
          }
        })
      })
    ).then(params => {
      // Handle the event emission by type
      params.map(param => {
        const {
          type, // logger types such as: log | error | warn | etc.
        } = param;

        ipc.server.emit(socket, `console`, param)

        //TODO this isn't complete yet for other than the default logger.
        // if (settings[type]) {
        //   // Handle traces in a different way but allow the trace functionality to be overridden, defaults
        //   const {
        //     handler = settings.defaults.handler,
        //     options = settings.defaults.options
        //   } = settings[type];
        //   return handler({
        //     param,
        //     options,
        //     ipc,
        //     socket
        //   })
        // } else {
        //   ipc.server.emit(socket, `console`, param)
        // }
      })
    }).catch(err => ipc.server.emit(socket, 'error', err));
  }
}

module.exports = {
  initFromArgv: function (argv) {
    JSON.parse(cliOptString || {});
  },
  handleOptions: handleOptions,
  generateLogger: generateLogger
};
