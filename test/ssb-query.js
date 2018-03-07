var test = require('tape')
var indexes = [
  {key: 'clk', value: [['value', 'author'], ['value', 'sequence']] },
  {key: 'typ', value: [['value', 'content', 'type'], ['timestamp']] },
//  {key: 'hsh', value: ['key']},
  {key: 'cha', value: [['value', 'content', 'channel'], ['timestamp']] },
  {key: 'aty', value: [['value', 'author'], ['value', 'content', 'type'], ['timestamp']]}
]

var select = require('../select')
var query = require('../query')
var posts_later_than_time = {
  "value": {
      "content": { "type": "post" },
//      "author": "@hxGxqPrplLjRG2vtjQL87abX4QKqeLgCwQpS730nNwE=.ed25519"
  },
  "timestamp": {"$gt": 1516596815720}
}

test('simple', function (t) {

  var q = posts_later_than_time
  t.deepEqual(select(indexes, q), indexes[1])

  t.deepEqual(query(select(indexes, q), q, true), {
    gte: ['typ', 'post', 1516596815720],
    lte: ['typ', 'post', undefined]
  })
  t.end()
})

test('from random', function (t) {
  var indexes = [
    { key: 'i', value: ['index'] },
    { key: 'r', value: ['random'] },
    { key: 't', value: ['timestamp'] },
  ]
  var q = { index: { '$lt': 52 } }
    t.deepEqual(select(indexes, q), indexes[0])

  t.deepEqual(query(select(indexes, q), q, true), {
    gte: ['i', null],
    lte: ['i', 52]
  })

  t.end()

})
