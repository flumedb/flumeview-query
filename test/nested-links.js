
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
  { key: 'on', value: [['value', 'nest', 'okay'], ['value', 'nest', 'number']] },
  { key: 'no', value: [['value', 'nest', 'number'], ['value', 'nest', 'okay']] }
]


tape('simple', function (t) {
  var linksPath = path.join(osenv.tmpdir(), 'test_stream-view_links')
  rimraf.sync(linksPath)

  var data = [
    {key: 'foo', value: {nest: {okay: true, number: 1}}},
    {key: 'bar', value: {nest: {okay: false, number: 2}}}
  ]

  var links = Links(linksPath, indexes, null, 1)

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
      pull.through(console.log),
      links.write(function (err) {
        if(err) throw err
        t.end()
      })
    )
  })


  t.test('dump', function (t) {
    all(links.dump(), function (err, ary) {
      console.log(ary)
      t.end()
    })
  })

  t.test('query', function (t) {
    all(links.read({query: [{$filter:
      {value: {nest: {number: {$gte: 0, $lte:3}}}}
    }, {$map: 'value'}]}), function (err, ary) {
      if(err) throw err
      t.deepEqual(ary, data.map(function (e) { return e.value }))
      t.end()
    })
  })
})



