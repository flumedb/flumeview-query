var Query = require('../')

module.exports = function (name, tests, memory) {
  var osenv = require('osenv')
  var path = require('path')
  var Flume = require('flumedb')
  var FlumelogMemory = require('flumelog-memory')
  var FlumeLogOffset = require('flumelog-offset')
  var rimraf = require('rimraf')
  var codec = require('level-codec/lib/encodings')

  var seekPath = path.join(osenv.tmpdir(), name)
  rimraf.sync(seekPath)
  var log = (
    memory
      ? FlumelogMemory()
      : FlumeLogOffset(path.join(seekPath, 'log.offset'), 1024, codec.json)
  )
  var db = Flume(log)
    .use('query', Query(1, { indexes: tests.indexes, exact: false }))

  tests(db.append, db.query.read, function (cb) {
    db.query.since.once(function () { cb() })
  })
}
