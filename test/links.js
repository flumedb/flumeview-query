
var tape = require('tape')
var osenv = require('osenv')
var path = require('path')
var pull = require('pull-stream')
var Flume = require('flumedb')
var FlumeLog = require('flumelog-offset')
var Links = require('../links')
var rimraf = require('rimraf')

var codec = require('level-codec/lib/encodings')

function all (stream, cb) {
  pull(stream, pull.collect(cb))
}

var indexes = [
  { key: 'SRD', value: ['source', 'rel', 'dest'] },
  { key: 'DRS', value: ['dest', 'rel', 'source'] },
  { key: 'RDS', value: ['rel', 'dest', 'source'] }
]

var data = [
  {key: 'START', value: {read: 'READY', error: 'ERROR', end: 'END'}},
  {key: 'READY', value: {
    read: 'START', error: "ERROR", end: "END"}
  },
  {key: 'ERROR', value: {}},
  {key: 'END', value: {error: 'END'}},
]

var raw = []

function extract (data, onLink) {
  for(var k in data.value)
    onLink({source: data.key, dest: data.value[k], rel: k})
}

data.forEach(function (e) {
  extract(e, function (v) { raw.push(v) })
})

tape('simple', function (t) {
  var linksPath = path.join(osenv.tmpdir(), 'test_stream-view_links')
  rimraf.sync(linksPath)

  var db = Flume(FlumeLog(path.join(linksPath, 'log.offset'), 1024, codec.json))
            .use('links', Links(indexes, extract))

  var links = db.links

  t.test('init', function (t) {
    links.since.once(function (v) {
      t.equal(v, -1)
      t.end()

    })
  })

  var live = []

  pull(
    links.read({query: [{$filter: {rel: {$prefix: 'e'}}}], live: true, sync: false}),
    pull.drain(function (e) {
      console.log('LIVE', e)
      live.push(e)
    })
  )

  t.test('load', function (t) {
    console.log(data)
    db.append(data, function (err) {
      if(err) throw err
      t.end()
    })
  })

  t.test('query', function (t) {
    all(links.read(), function (err, ary) {
      if(err) throw err
      console.log(ary)
//      t.equal(ary.length, 22)
      t.end()
    })
  })

  t.test('query', function (t) {
    all(links.read({query: {dest: 'ERROR'}}), function (err, ary) {
      if(err) throw err
      console.log(ary)
      t.end()
    })

  })

  t.test('specify index', function (t) {
    all(links.read({index: 'DRS'}), function (err, ary) {
      if(err) throw err
      t.deepEqual(ary, [ 
        { rel: 'end', dest: 'END', source: 'READY' },
        { rel: 'end', dest: 'END', source: 'START' },
        { rel: 'error', dest: 'END', source: 'END' },
        { rel: 'error', dest: 'ERROR', source: 'READY' },
        { rel: 'error', dest: 'ERROR', source: 'START' },
        { rel: 'read', dest: 'READY', source: 'START' },
        { rel: 'read', dest: 'START', source: 'READY' } 
      ])
      t.end()
    })

  })

  t.test('live', function (t) {
    t.deepEqual(live, raw.filter(function (e) { return e.rel[0] == 'e' }))
//[{
//      dest: 'ERROR', rel: 'error', source: 'START'
//    }, {
//      dest: 'END', rel: 'end', source: 'START'
//    }, {
//      dest: 'ERROR', rel: 'error', source: 'READY'
//    }, {
//      dest: 'END', rel: 'end', source: 'READY'
//    }, {
//      dest: 'END', rel: 'error', source: 'END'
//    }])

    t.end()
  })
})















