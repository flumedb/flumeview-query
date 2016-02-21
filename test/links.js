
var tape = require('tape')
var osenv = require('osenv')
var path = require('path')
var pull = require('pull-stream')
var Links = require('../')
var rimraf = require('rimraf')

function all (stream, cb) {
  pull(stream, pull.collect(cb))
}

tape('simple', function (t) {
  var linksPath = path.join(osenv.tmpdir(), 'test_stream-view_links')
  rimraf.sync(linksPath)

  function extract (data, onLink) {
    for(var k in data.value)
      onLink({source: data.key, dest: data.value[k], rel: k})
  }

  var data = [
    {key: 'START', value: {read: 'READY', error: 'ERROR', end: 'END'}, ts: 1},
    {key: 'READY', value: {
      read: 'START', error: "ERROR", end: "END"}, ts: 2
    },
    {key: 'ERROR', value: {}, ts: 3},
    {key: 'END', value: {error: 'END'}, ts: 4},
  ]

  var links = Links(linksPath, extract, 1)

  t.test('init', function (t) {
    links.init(function (err, since) {
      if(err) throw err
      t.notOk(since)
      t.end()
    })
  })

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
      t.equal(ary.length, 22)
      all(links.read({
        gte: ['DRS', 'START', 'read', ' '].join('!') + '!',
        lt: ['DRS', 'START', 'read', '~'].join('!') + '~'
      }), function (err, ary) {
        console.log(ary)
        t.end()
      })
    })
  })

  t.test('reinitialize', function (t) {
    links.close(function (err) {
      if(err) throw err
      links = Links(linksPath, extract, 2)
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
      links = Links(linksPath, extract, 2)
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
})


