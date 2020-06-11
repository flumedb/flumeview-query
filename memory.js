var pull = require('pull-stream')
var Filter = require('./filter')

module.exports =  function createMemoryIndex (log, name) {
  function fullScan (log, opts) {
    return log.stream({
      values: true, seqs: false,
      //TODO test coverage for live/old - the tests arn't right for live when the log starts as empty
      old: (opts.old !== false),
      live: (opts.live === true || opts.old === false),
      reverse: opts.reverse
    })
  }

  console.error('flumeview-query:', name, 'in memory log or no indexes defined, will always use full scan, queries will likely be slow')
 return {
    since: log.since,
    get: log.get,
    methods: { get: 'async', read: 'source' },
    read: function (opts) {
      return Filter(fullScan(log, opts), opts)
    },
    createSink: function (cb) {return pull.onEnd(cb) },
    close: done => done(),
    destroy: done => done()
  }
}
