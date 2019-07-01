
var pull = require('pull-stream')
var tape = require('tape')

//var osenv = require('osenv')
//var path = require('path')
//var Flume = require('flumedb')
//var FlumeLog = require('flumelog-offset')
//var Query = require('../')
//var rimraf = require('rimraf')

//var codec = require('level-codec/lib/encodings')

function all (stream, cb) {
  pull(stream, pull.collect(cb))
}

var indexes = [
  { key: 'on', value: [['value', 'nest', 'okay'], ['value', 'nest', 'number']] },
  { key: 'no', value: [['value', 'nest', 'number'], ['value', 'nest', 'okay']] }
]

var data = [
  {key: 'foo', value: {nest: {okay: true, number: 1}}},
  {key: 'bar', value: {nest: {okay: false, number: 2}}}
]

module.exports = function (append, read, ready) {

  tape('simple', function (t) {
//    var linksPath = path.join(osenv.tmpdir(), 'test_stream-view_links')
//    rimraf.sync(linksPath)
//
//    var db = Flume(FlumeLog(path.join(linksPath, 'log.offset'), 1024, codec.json))
//              .use('links', Query(1, {indexes:indexes}))
//
//    var links = db.links
    var live = []
    pull(read({
      query: [{$filter: {value: {nest: {number: {$gt: 0}}} }}], live: true, sync: false
    }), pull.drain(live.push.bind(live)))

    t.test('init', function (t) {
      ready(t.end)
//      links.since.once(function (v) {
//        t.equal(v, -1)
//        t.end()
//
//      })
    })

    t.test('load', function (t) {
      append(data, function (err) {
        if(err) throw err
        t.end()
      })
    })

    t.test('dump', function (t) {
      all(read(), function (err, ary) {
        console.log('DUMP', ary)
        t.deepEqual(ary, data)
        t.end()
      })
    })

    t.test('query', function (t) {
      all(read({query: [{$filter:
        {value: {nest: {number: {$gte: 0, $lte:3}}}}
      }, {$map: 'value'}]}), function (err, ary) {
        if(err) throw err
        console.log(ary)
        t.deepEqual(ary, data.map(function (e) { return e.value }))
        t.end()
      })
    })


    t.test('exact', function (t) {
      all(read({query: [{$filter:
        {value: {nest: {number: 1}}}
      }]}), function (err, ary) {
        if(err) throw err
        console.log(ary)
        t.deepEqual(ary, [data[0]])
        t.end()
      })
    })

    t.test('live', function (t) {
      t.deepEqual(live, data)
      t.end()
    })

  })

}

module.exports.indexes = indexes

if(!module.parent) {
  require('./setup')('test-flumeview-query_nested', module.exports)
}
