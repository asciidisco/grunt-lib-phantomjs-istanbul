/*
  Syntactic Sugar
 */
class PuppeteerConsoleLog {
  // 1:1 Interface with Puppeteer's ConsoleMessage, except that args hold any valid json rather than a Promise Handler
  constructor(
    type = "",
    text = "",
    args = [] //[JSON]
  ) {
    this.type = type
    this.text = text
    this.args = args
  }
}
class PuppeteerConsoleError extends Error {
  constructor(
    message
  ) {
    super(message)
  }
}

function defaultLog({
  param,
  options,
  ipc,
  socket
}) {
  ipc.server.emit(socket, `console`, param)
}

module.exports = {
  consoleOpt: {
    defaults: defaultLog
  },
  PuppeteerConsoleLog,
  PuppeteerConsoleError
}