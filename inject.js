'use strict'
var pull = require('pull-stream')
var keys = require('map-filter-reduce/keys')
var u = require('./util')
var Explain = require('./explain')
var Filter = require('./filter')

var isArray = Array.isArray
var isNumber = function (n) { return 'number' === typeof n }
var isObject = function (o) { return o && 'object' === typeof o && !isArray(o) }
function isFunction (f) { return 'function' == typeof f }

function clone (obj) {
  var o = {}
  for(var k in obj)
    o[k] = obj[k]
  return o
}

//sorted index.

//split this into TWO modules. flumeview-links and flumeview-query
module.exports = function (log, indexes) {
//  var log = opts.log
//  var indexes = opts.indexes
  //answer this query by reading the entire log.
  //not efficient, but still returns the correct answer
  function fullScan (log, opts) {
    return log.stream({
      values: true, seqs: false,
      //TODO test coverage for live/old - the tests arn't right for live when the log starts as empty
      old: (opts.old !== false),
      live: (opts.live === true || opts.old === false),
      reverse: opts.reverse
    })
  }

  function createFilter(source, opts) {
    return pull(
      source,
      isArray(opts.query) ? mfr(opts.query) : pull.through(),
      opts.limit && pull.take(opts.limit)
    )
  }

//  return function (log, name) {
//    if(!log.filename) return createMemoryIndex(log, name)
//
    var view = {
      read: function (opts) {
        var _opts = view.explain(opts)
        return Filter(_opts.createStream(_opts), opts)
      },
      explain: Explain(indexes, function (opts) {
        opts.seqs = false; opts.values = true
        return log.stream(opts)
      }),
      add: function (opts) {
        if(!(
          opts &&
          isFunction(opts.createStream) &&
          isArray(opts.index || opts.value)
        ))
          throw new Error('flumeview-query.add: expected {index, createStream}')
        opts.value = opts.index || opts.value
        indexes.push(opts)
      }
    }

    return view

//    var indexes = [].concat(view.indexes())

//    view.methods.explain = 'sync'
//    view.methods.add = 'sync'

//    view.explain = 
//
//   view.read = 
//
//    view.add = 

//    return view
//  }
}
