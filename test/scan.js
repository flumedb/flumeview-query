const test = require('./util/scan')
require('./util/setup')('test-flumeview-query_scan', test)

//  var osenv = require('osenv')
//  var path = require('path')
//  var Flume = require('flumedb')
//  var FlumeLog = require('flumelog-offset')
//  var rimraf = require('rimraf')
//  var codec = require('level-codec/lib/encodings')
//
//  var seekPath = path.join(osenv.tmpdir(), 'test_stream-view_seek')
//  rimraf.sync(seekPath)
//  var log = FlumeLog(path.join(seekPath, 'log.offset'), 1024, codec.json)
//  var db = Flume(log)
//            .use('query', Query(1, {indexes: indexes, exact: false}))
//
//  module.exports(db.append, db.query.read, function (cb) {
//    db.query.since.once(cb)
//  })
