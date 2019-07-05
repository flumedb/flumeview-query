
var tape = require('tape')
var pull = require('pull-stream')
var timestamp = require('monotonic-timestamp')
var Query = require('../')

function all (stream, cb) {
  pull(stream, pull.collect(cb))
}

var indexes = [
  { key: 'S', value: ['okay', 'timestamp'] },
]

var raw = []


module.exports = function (append, read, ready) { 

  tape('simple', function (t) {
//    var seekPath = path.join(osenv.tmpdir(), 'test_stream-view_seek')
//    rimraf.sync(seekPath)

//    var db = Flume(FlumeLog(path.join(seekPath, 'log.offset'), 1024, codec.json))
//              .use('query', Query(1, {indexes:indexes}))
//
//    var query = db.query
//
    t.test('init', function (t) {
      ready(t.end)
//      query.since.once(function (v) {
//        t.equal(v, -1)
//        t.end()
//
//      })
    })

    var live = []

    pull(
      read({query: [{
        $filter: {count: {$gt: 20}}
      }], limit: 10}),
      pull.drain(function (e) {
        live.push(e)
      })
    )
    var data = []
    for(var i = 0;i < 100;i ++)
      data.push({
        count: i, random: Math.random(), timestamp: timestamp(), okay: true
      })

    t.test('load', function (t) {
      append(data, function (err) {
        if(err) throw err
        t.end()
      })
    })

    function seek(limit, gte) {
      return read({query: [{
        $filter: { count: {$gte: gte}, okay:true}
      }], limit: limit})
    }

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

  })
}

module.exports.indexes = indexes

if(!module.parent) {
  require('./setup')('test-flumeview-query_exact', module.exports)
}

//require('./setup')('test-kappaview-query_exact', require('flumeview-query/test/exact'))
