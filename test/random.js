
var test = require('tape')
var osenv = require('osenv')
var path = require('path')
var pull = require('pull-stream')
var Flume = require('flumedb')
var FlumeLog = require('flumelog-offset')
var Query = require('../')
var rimraf = require('rimraf')
var timestamp = require('monotonic-timestamp')
var MFR = require('map-filter-reduce')

var codec = require('level-codec/lib/encodings')

function all (stream, cb) {
  pull(stream, pull.collect(cb))
}

var indexes = [
  { key: 'i', value: ['index'] },
  { key: 'r', value: ['random'] },
  { key: 't', value: ['timestamp'] },
  { key: 'ir', value: [['index'], ['random']] },
  { key: 'rt', value: [['random'], ['timestamp']] },
  { key: 'ti', value: [['timestamp'], ['index']] },
  { key: 'ri', value: [['random'], ['index']] },
  { key: 'tr', value: [['timestamp'], ['random'], ] },
  { key: 'it', value: [['index'], ['timestamp']] },
]

var raw = []


var dbPath = path.join(osenv.tmpdir(), 'test_stream-view_random')
rimraf.sync(dbPath)

var db = Flume(FlumeLog(path.join(dbPath, 'log.offset'), 1024, codec.json))
          .use('query', Query(1, {indexes: indexes}))

var query = db.query

test('preinit', function (t) {
  query.since.once(function (v) {
    t.equal(v, -1)
    t.end()

  })
})

var data = []
test('init', function (t) {
  for(var i = 0; i < 100; i++)
    data.push({
      index: i, random: Math.random(), timestamp: timestamp()
    })

  db.append(data, function (err, seq) {
    if(err) throw err
    console.log(seq)
    t.end()
  })
})

function randomQuery (data) {
  var exact = [
    {index: data.index},
    {random: data.random},
    {timestamp: data.timestamp}
  ]

  var ranges = [
    {index: {$gt: data.index}},
    {index: {$gte: data.index}},
    {index: {$lt: data.index}},
    {index: {$lte: data.index}},

    {random: {$gt: data.random}},
    {random: {$gte: data.random}},
    {random: {$lt: data.random}},
    {random: {$lte: data.random}},

    {random: {$gt: Math.random()}},
    {random: {$gte: Math.random()}},
    {random: {$lt: Math.random()}},
    {random: {$lte: Math.random()}},


    {timestamp: {$gt: data.timestamp}},
    {timestamp: {$gte: data.timestamp}},
    {timestamp: {$lt: data.timestamp}},
    {timestamp: {$lte: data.timestamp}},
  ]

  var join = []
  ranges.forEach(function (r) {
    exact.forEach(function (x) {
      var o = {}
      for(var k in x)
        o[k] = x[k]
      for(var k in r)
        o[k] = r[k]

      if(Object.keys(o).length > 1)
        join.push(o)
    })
  })

  var a = ranges.concat(exact).concat(join)

  return [{$filter:a[~~(Math.random()*a.length)]}]
}

function cmp (a, b) {
  for(var k in a)
    if(a[k] != b[k]) return a[k] < b[k] ? -1 : 1
  for(var k in b)
    if(a[k] != b[k]) return a[k] < b[k] ? 1 : -1
  return 0
}

function randomTest (n) {
  test('random:'+n, function (t) {
    var item = data[~~(Math.random()*data.length)]
    var q = randomQuery(item)
    console.log("TEST", q[0].$filter)
    pull(
      db.stream({values: true, seqs: false}),
      MFR(q),
      pull.collect(function (err, ary) {
        pull(
          db.query.read({query: q}),
          pull.collect(function (err, _ary) {
            t.equal(_ary.length, ary.length)
            if(_ary.length != ary.length)
              throw new Error('expected length:'+ary.length+', but got:'+_ary.length)
            t.deepEqual(_ary.sort(cmp), ary.sort(cmp))
            t.end()
          })
        )

      })
    )
  })
}

for(var i = 0; i < 1000; i++)
  randomTest(i)

