var test = require('tape')
var charwise = require('charwise')
//old ssb-query indexes
var indexes = [
  {key: 'clk', value: [['value', 'author'], ['value', 'sequence']] },
  {key: 'typ', value: [['value', 'content', 'type'], ['timestamp']] },
  {key: 'cha', value: [['value', 'content', 'channel'], ['timestamp']] },
  {key: 'aty', value: [['value', 'author'], ['value', 'content', 'type'], ['timestamp']]}
]


//more indexes keep on being added to ssb-query...
var newIndexes = [
  {key: 'log', value: ['timestamp']}, //duplicate of an ssb index
  {key: 'vtt', value: [ ['value', 'timestamp'], ['timestamp']]},
  {key: 'clk', value: [['value', 'author'], ['value', 'sequence']] }, //duplicate
  {key: 'typ', value: [['value', 'content', 'type'], ['timestamp']] }, //messages by type
  {key: 'tya', value: [['value', 'content', 'type'], ['value', 'timestamp']] },
  {key: 'cha', value: [['value', 'content', 'channel'], ['timestamp']] },
  {key: 'aty', value: [['value', 'author'], ['value', 'content', 'type'], ['timestamp']]},
  {key: 'ata', value: [['value', 'author'], ['value', 'content', 'type'], ['value', 'timestamp']]},
  {key: 'art', value: [['value', 'content', 'root'], ['value', 'timestamp']]},
  {key: 'lor', value: [['rts']]}
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

var encrypted_content_after_time = {
  "value": {
      "content": { "$is": "string"},
  },
  "timestamp": {"$gt": 1516596815720}
}

var encrypted_content_after_time_by_author = {
  "value": {
      "content": { "$is": "string"},
      "author": "@bob",
  },
  "timestamp": {"$gt": 1516596815720}
}



test('simple', function (t) {

  var q = posts_later_than_time
  t.deepEqual(select(indexes, q), indexes[1])

  t.deepEqual(query(select(indexes, q), q, true), {
    gte: ['post', 1516596815720],
    lte: ['post', undefined]
  })
  t.end()
})

test('right hand match not selected 1', function (t) {

  var q = encrypted_content_after_time
  t.deepEqual(select(indexes, q), undefined)

  t.end()
})


test('right hand match not selected 2', function (t) {

  var q = encrypted_content_after_time_by_author
  t.deepEqual(select(indexes, q), indexes[0])

  t.deepEqual(query(select(indexes, q), q, true), {
    gte: ['@bob', null],
    lte: ['@bob', undefined]
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
    gte: [ null],
    lte: [52]
  })

  t.end()

})

test('$ne should not be passed to an index', function (t) {
  var q = {
      value: {
        timestamp: {$gt: 0 },
        author: { $ne: '@ye+QM09iPcDJD6YvQYjoQc7sLF/IFhmNbEqgdzQo3lQ=.ed25519' },
        content: { type: 'post' }
      }
    }
  var result = select(newIndexes, q, true)
  var opts = query(result.index, q, true)
  charwise.encode(opts.gte) //would throw if {$ne: ...} was returned
  console.log(result)
  t.end()
})

test('value.content.type', function (t) {
  var q = {
      value: {
        content: { type: 'address' }
      }
    }
  var result = select(newIndexes, q, true)
  var opts = query(result.index, q, true)
  console.log(opts)
  t.end()
})
