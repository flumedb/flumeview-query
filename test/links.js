
var tape = require('tape')
var osenv = require('osenv')
var path = require('path')
var pull = require('pull-stream')
var Links = require('../')
var rimraf = require('rimraf')

function all (stream, cb) {
  pull(stream, pull.collect(cb))
}

var indexes = [
  { key: 'SRD', value: ['source', 'rel', 'dest', 'ts'] },
  { key: 'DRS', value: ['dest', 'rel', 'source', 'ts'] },
  { key: 'RDS', value: ['rel', 'dest', 'source', 'ts'] }
]


tape('simple', function (t) {
  var linksPath = path.join(osenv.tmpdir(), 'test_stream-view_links')
  rimraf.sync(linksPath)

  function extract (data, onLink) {
    for(var k in data.value)
      onLink({source: data.key, dest: data.value[k], rel: k, ts: data.ts})
  }

  var data = [
    {key: 'START', value: {read: 'READY', error: 'ERROR', end: 'END'}, ts: 1},
    {key: 'READY', value: {
      read: 'START', error: "ERROR", end: "END"}, ts: 2
    },
    {key: 'ERROR', value: {}, ts: 3},
    {key: 'END', value: {error: 'END'}, ts: 4},
  ]

  var links = Links(linksPath, indexes, extract, 1)

  t.test('init', function (t) {
    links.init(function (err, since) {
      if(err) throw err
      t.notOk(since)
      t.end()
    })
  })

  var live = []

  pull(
    links.read({query: [{$filter: {rel: {$prefix: 'e'}}}], live: true}),
    pull.drain(function (e) {
      console.log('LIVE', e)
      live.push(e)
    })
  )

  t.test('load', function (t) {
    pull(
      pull.values(data),
      links.write(function (err) {
        if(err) throw err
        t.end()
      })
    )
  })

  t.test('query', function (t) {
    all(links.read(), function (err, ary) {
      if(err) throw err
      console.log(ary)
//      t.equal(ary.length, 22)
      all(links.dump({
        gte: ['DRS', 'START', 'read', '!'],
        lt: ['DRS', 'START', 'read', '~', undefined]
      }), function (err, ary) {
        console.log(ary)
        t.end()
      })
    })
  })

  t.test('reinitialize', function (t) {
    links.close(function (err) {
      if(err) throw err
      console.log(indexes)
      links = Links(linksPath, indexes, extract, 2)
      links.init(function (err, since) {
        t.notOk(since)
        pull(
          pull.values(data),
          links.write(function (err) {
            all(links.read(), function (err, ary) {
              if(err) throw err
              console.log(ary)
              t.end()
            })
          })
        )
      })
    })
  })

  t.test('catchup', function (t) {
    links.close(function (err) {
      if(err) throw err
      links = Links(linksPath, indexes, extract, 2)
      links.init(function (err, since) {
        if(err) throw err
        t.equal(since, 4)
        t.end()
      })
    })
  })

  t.test('query', function (t) {
    all(links.read({query: {dest: 'ERROR'}}), function (err, ary) {
      if(err) throw err
      console.log(ary)
      t.end()
    })

  })

  t.test('live', function (t) {
    t.deepEqual(live, [{
      dest: 'ERROR', rel: 'error', source: 'START', ts: 1
    }, {
      dest: 'END', rel: 'end', source: 'START', ts: 1
    }, {
      dest: 'ERROR', rel: 'error', source: 'READY', ts: 2
    }, {
      dest: 'END', rel: 'end', source: 'READY', ts: 2
    }, {
      dest: 'END', rel: 'error', source: 'END', ts: 4
    }])

    t.end()
  })
})




