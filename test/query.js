var tape = require('tape')
var Q = require('map-filter-reduce/util')
var select = require('../select')
var query = require('../query')

var indexes = [
  {key: 'SDR', value: ['source', 'dest', 'rel']},
  {key: 'DRS', value: ['dest', 'rel', 'source']},
  {key: 'RDS', value: ['rel', 'source', 'dest']},
]

var indexes2 = [
  { key: 'on', value: [['value', 'nest', 'okay'], ['value', 'nest', 'number']] },
  { key: 'no', value: [['value', 'nest', 'number'], ['value', 'nest', 'okay']] }
]


function Query (q) {
  return query(select(indexes, q), q)
}

tape('source and dest are exact', function (t) {

  t.deepEqual(
    Query({source: 'foo', dest: 'bar'}),
    {
      gte: ['foo', 'bar', Q.LO, Q.LO],
      lte: ['foo', 'bar', Q.HI, Q.HI]
    }
  )

  t.end()
})

tape('dest exact, rel is range', function (t) {
  var query = select(indexes, {dest: 'bar', rel: {$prefix: 'a'}})

  t.deepEqual(query, indexes[1])
  t.end()
})

tape('range only', function (t) {
  t.deepEqual(select(indexes, {rel: {$prefix:'b'}}), indexes[2])
  t.end()
})

tape('all exact', function (t) {
  t.deepEqual(select(indexes, {source: 'foo', dest: 'bar', rel:'x' }), indexes[0])
  t.end()
})

tape('all ranges', function (t) {
  t.deepEqual(select(indexes, {source: {$prefix:'f'}, dest: {$prefix:'b'}}), indexes[0])
  t.end()
})

tape('all ranges except rel', function (t) {
  t.deepEqual(select(indexes, {source: {$prefix:'f'}, dest: {$prefix:'b'}, rel: 'x'}), indexes[2])
  t.end()
})


tape('select best index on partial nested queries', function (t) {
  t.deepEqual(select(indexes, {rel: {$prefix:'b'}}), indexes[2])
  t.end()
})

tape('query works on {$prefix} inside an array', function (t) {

    console.log(Q.upper(['hello', {$prefix: "ok"}]))
  t.deepEqual(
    query({key: 'RDS', value: ['rel', 'dest', 'source']}, {
      rel: ['mentions', {$prefix: "@"}]
    }),
    {"gte":
        [["mentions","@"],null, null, null],
      "lte":
        [["mentions","@\uffff"],undefined, undefined, undefined]
    }
  )

  t.end()
})

