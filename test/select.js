var u = require('map-filter-reduce/util')
var tape = require('tape')
var select = require('../select')
var indexes = [
  {key: 'SDR', value: ['source', 'dest', 'rel']},
  {key: 'DRS', value: ['dest', 'rel', 'source']},
  {key: 'RDS', value: ['rel', 'source', 'dest']},
]

var indexes2 = [
  { key: 'on', value: [['value', 'nest', 'okay'], ['value', 'nest', 'number']] },
  { key: 'no', value: [['value', 'nest', 'number'], ['value', 'nest', 'okay']] }
]

tape('source and dest are exact', function (t) {

  var query = select(indexes, {source: 'foo', dest: 'bar'})

  t.deepEqual(query, indexes[0])
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

tape('nested range', function (t) {
  var query = {value: {nest: {number: {$gte: 0, $lte:3}}}}

  t.deepEqual(
    select(indexes2, query),
    indexes2[1]
  )

  t.end()
})

