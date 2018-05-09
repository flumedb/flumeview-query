
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
  { key: 'S', value: ['okay'] },
]

var raw = []


tape('simple', function (t) {
  var seekPath = path.join(osenv.tmpdir(), 'test_stream-view_seek')
  rimraf.sync(seekPath)

  var db = Flume(FlumeLog(path.join(seekPath, 'log.offset'), 1024, codec.json))
            .use('query', Query(1, {indexes: indexes, exact: false}))

  var query = db.query

  t.test('init', function (t) {
    query.since.once(function (v) {
      t.equal(v, -1)
      t.end()

    })
  })

  var live = []

  pull(
    query.read({query: [{
      $filter: {count: {$gt: 20}}
    }], limit: 10}),
    pull.drain(function (e) {
      live.push(e)
    })
  )
  var data = []
  for(var i = 0;i < 100;i ++)
    data.push({
      count: i, random: Math.random(), timestamp: Date.now(), okay: true,
      mixed: Math.random() > 0.5 ? {} : 'hello!'
    })

  var load1 = [], end1

  pull(query.read({old: false}), pull.drain(function (msg) {
    load1.push(msg)
  }, function () {
    //KNOWN BUG: stream ends immediately with empty database
//    throw new Error('stream1 ended')
  }))

  t.test('load1', function (t) {
    db.append(data.slice(0, 50), function (err) {
      if(err) throw err
      setTimeout(function () {
        //note, live stream doesn't fill at same time as callback.
        //it should be eventual though
  //      t.deepEqual(load1, data.slice(0, 50))
        t.end()
      }, 100)
    })
  })

  t.test('load2', function (t) {
    var load2 = []
    pull(query.read({old: false}), pull.drain(function (msg) {
      load2.push(msg)
    }, function () {
      throw new Error('stream 2 ended')
    }))
    db.append(data.slice(50), function (err) {
      if(err) throw err
      //setTimeout(function () {
//        t.deepEqual(load1, data)
//        console.log("EOAAONETHOANTEHOASTEHSA")
        t.equal(load2.length, 50, 'LOAD 2 length')
          t.deepEqual(load2, data.slice(50, 100), 'LOAD 2')
        t.end()
      //}, 100)
    })
  })

  function seek(limit, gte) {
    return query.read({query: [{
      $filter: { count: {$gte: gte}, okay:true}
    }], limit: limit})
  }
  return
  t.test('query, seek', function (t) {
    all(seek(10, 10), function (err, ary) {
      if(err) throw err
      console.log(ary)
      t.equal(ary.length, 10, 'LIMIT')
      ary.forEach(function (e, i) {
        t.equal(e.count, i+ 10)
      })

      all(seek(10, 20), function (err, ary) {
        if(err) throw err
        console.log(ary)
        t.equal(ary.length, 10, 'LIMIT')
        ary.forEach(function (e, i) {
          t.equal(e.count, i+ 20)
        })
        t.end()
      })
    })
  })

  t.test('query for strings', function (t) {

    all(query.read({query: [{
      $filter: { mixed: {$is: 'string'}}
    }]}), function (err, ary) {
      if(err) throw err
      t.ok(ary.length)
      ary.forEach(function (e) {
        t.equal(e.mixed, 'hello!')
      })
      t.end()
    })
  })
})









