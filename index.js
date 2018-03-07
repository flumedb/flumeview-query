'use strict'
var pull = require('pull-stream')
var query = require('./query')
var select = require('./select')
var mfr = require('map-filter-reduce')
var keys = require('map-filter-reduce/keys')
var explain = require('explain-error')
var u = require('./util')

var FlumeViewLevel = require('flumeview-level')

var isArray = Array.isArray
var isNumber = function (n) { return 'number' === typeof n }
var isObject = function (o) { return o && 'object' === typeof o && !isArray(o) }


//sorted index.

//split this into TWO modules. flumeview-links and flumeview-query
module.exports = function (version, opts) {
  if(!isNumber(version)) throw new Error('flumeview-query:version expected as first arg')
  if(!isObject(opts)) throw new Error('flumeview-query: expected opts as second arg')
  var indexes = opts.indexes
  var filter = opts.filter || function () { return true }
  var map = opts.map
  var exact = opts.exact !== false

  var create = FlumeViewLevel(version || 1, function (data, seq) {
    if(!filter(data)) return []
    var A = []
    indexes.forEach(function (index) {
      var a = [index.key]
      for(var i = 0; i < index.value.length; i++) {
        var key = index.value[i]
        if(!u.has(key, data)) return []
        a.push(u.get(key, data))
      }
      if(!exact) a.push(seq);
      A.push(a)
    })
    return A
  })

  return function (log, name) {

    var index = create(log, name)
    var read = index.read

    index.read = function (opts) {

      opts = opts || {}
      var _opts = {}
      var q, k

      if(isArray(opts.query)) {
        q = opts.query[0].$filter || {}
      }
      else if(opts.query) {
        q = opts.query
      }
      else
        q = {}

      var index = select(indexes, q)
      var filter = isArray(opts.query) ? mfr(opts.query) : pull.through()
      if(!index) {
        return pull(
          log.stream({
            values: true, seqs: false, live: opts.live, reverse: opts.reverse
          }),
          filter,
          opts.limit ? pull.take(opts.limit) : undefined
        )
      }

      var _opts = query(index, q, exact)

      _opts.values = true
      _opts.keys = true

      _opts.reverse = !!opts.reverse
      _opts.live = opts.live
      _opts.old = opts.old
      _opts.sync = opts.sync

      return pull(
        read(_opts),
        pull.map(function (data) {
          if(data.sync) return data
          else return data.value
        }),
        pull.filter(),
        filter,
        opts.limit && pull.take(opts.limit)
      )

    }

    return index
  }
}






