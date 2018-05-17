'use strict'
var pull = require('pull-stream')
var query = require('./query')
var select = require('./select')
var mfr = require('map-filter-reduce')
var keys = require('map-filter-reduce/keys')
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

  function fullScan (log, opts) {
    return pull(
      log.stream({
        values: true, seqs: false,
        //TODO test coverage for live/old - the tests arn't right for live when the log starts as empty
        old: (opts.old !== false),
        live: (opts.live === true || opts.old === false),
        reverse: opts.reverse
      }),
      opts.filter !== false && isArray(opts.query) && mfr(opts.query),
      opts.limit && pull.take(opts.limit)
    )
  }

  function createMemoryIndex (log, name) {
    console.error('flumeview-query:', name, 'in memory log or no indexes defined, will always use full scan, queries will likely be slow')
   return {
      since: log.since,
      get: log.get,
      methods: { get: 'async', read: 'source'},
      read: function (opts) {
        var filter = isArray(opts.query) ? mfr(opts.query) : pull.through()
        return pull(fullScan(log, opts), filter)
      },
      createSink: function (cb) {return pull.onEnd(cb) }
    }
  }

  var create = FlumeViewLevel(version || 2, function (data, seq) {
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
    if(!log.filename || !indexes.length) return createMemoryIndex(log, name)

    var view = create(log, name)
    var read = view.read
    view.methods.explain = 'sync'
    view.explain = function (opts) {

      opts = opts || {}
      var q, k

      if(isArray(opts.query)) {
        q = opts.query[0].$filter || {}
      }
      else if(opts.query) {
        q = opts.query
      }
      else
        q = {}

      var index = opts.index
        ? u.findByPath(indexes, opts.index)
        : select(indexes, q)

      if(!index) return {scan: true}
      var _opts = query(index, q, exact)
      _opts.values = true
      _opts.keys = true
      _opts.reverse = !!opts.reverse
      //same default logic as pull-live
      _opts.old = (opts.old !== false)
      _opts.live = (opts.live === true || opts.old === false)

      //TODO test coverage for live/old
      _opts.sync = opts.sync
      return _opts
    }

    view.read = function (opts) {
      var _opts = view.explain(opts = opts || {})
      return pull(
        (_opts.scan
        ? fullScan(log, opts)
        : pull(
            read(_opts),
            pull.map(function (data) {
              return data.sync ? data : data.value
            })
          )
        ),
        opts.filter !== false && isArray(opts.query) && mfr(opts.query),
        opts.limit && pull.take(opts.limit)
      )
    }
    return view
  }
}

