
var tape = require('tape')
var osenv = require('osenv')
var path = require('path')
var pull = require('pull-stream')
var Flume = require('flumedb')
var FlumeLog = require('flumelog-offset')
var Query = require('../')
var rimraf = require('rimraf')

var codec = require('level-codec/lib/encodings')

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

tape('simple', function (t) {
  var linksPath = path.join(osenv.tmpdir(), 'test_stream-view_links')
  rimraf.sync(linksPath)

  var db = Flume(FlumeLog(path.join(linksPath, 'log.offset'), 1024, codec.json))
            .use('links', Query(indexes))

  var links = db.links

  t.test('init', function (t) {
    links.since.once(function (v) {
      t.equal(v, -1)
      t.end()

    })
  })

  t.test('load', function (t) {
    console.log(data)
    db.append(data, function (err) {
      if(err) throw err
      t.end()
    })
  })

  t.test('dump', function (t) {
    all(links.read(), function (err, ary) {
      console.log('DUMP', ary)
      t.deepEqual(ary, data)
      t.end()
    })
  })

  t.test('query', function (t) {
    all(links.read({query: [{$filter:
      {value: {nest: {number: {$gte: 0, $lte:3}}}}
    }, {$map: 'value'}]}), function (err, ary) {
      if(err) throw err
      console.log(ary)
      t.deepEqual(ary, data.map(function (e) { return e.value }))
      t.end()
    })
  })


  t.test('exact', function (t) {
    all(links.read({query: [{$filter:
      {value: {nest: {number: 1}}}
    }]}), function (err, ary) {
      if(err) throw err
      console.log(ary)
      t.deepEqual(ary, [data[0]])
      t.end()
    })
  })

})



