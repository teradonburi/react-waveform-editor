export default class InlineWorker {

  constructor (func) {
    const WORKER_ENABLED = !!(global === global.window && global.URL && global.Blob && global.Worker)
    if (WORKER_ENABLED) {
      // get function implementation as string
      const functionBody = func.toString().trim().match(
        /^function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/
      )[1]

      this.worker = new global.Worker(global.URL.createObjectURL(
        new global.Blob([ functionBody ], { type: 'text/javascript' })
      ))
    }

    return this.worker
  }
}
