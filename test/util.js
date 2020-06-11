var tape = require('tape')
var u = require('../util')

var obj = {
  nest1: {nest2: {okay: true, number: 1}},
  truthy: 1,
  falsey: ''
}

var has = [
  ['nest1', 'nest2', 'okay'],
  'falsey',
  ['falsey']
]

var notHas = [
  ['nest1', 'nestX']
]

var get = [
  {key: ['nest1', 'nest2'], value: {okay: true, number: 1}},
  {key: 'falsey', value: ''}
]

tape('check has', function (t) {
  has.forEach(function (path) {
    t.ok(u.has(path, obj))
  })
  t.end()
})

tape('check !has', function (t) {
  notHas.forEach(function (path) {
    t.notOk(u.has(path, obj))
  })
  t.end()
})



tape('get', function (t) {
  get.forEach(function (opt) {
    t.deepEqual(u.get(opt.key, obj), opt.value)
  })
  t.end()
})
