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

function clone (obj) {
  var o = {}
  for(var k in obj)
    o[k] = obj[k]
  return o
}

//sorted index.

//split this into TWO modules. flumeview-links and flumeview-query
module.exports = function (version, opts) {
  if(!isNumber(version)) throw new Error('flumeview-query:version expected as first arg')
  if(!isObject(opts)) throw new Error('flumeview-query: expected opts as second arg')
  var filter = opts.filter || function () { return true }
  var map = opts.map || function (item) { return item }
  var exact = opts.exact !== false

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

  function createMemoryIndex (log, name) {
    console.error('flumeview-query:', name, 'in memory log or no indexes defined, will always use full scan, queries will likely be slow')
   return {
      since: log.since,
      get: log.get,
      methods: { get: 'async', read: 'source'},
      read: function (opts) {
        return createFilter(fullScan(log, opts), opts)
      },
      createSink: function (cb) {return pull.onEnd(cb) }
    }
  }

  return function (log, name) {
    if(!log.filename || !opts.indexes.length) return createMemoryIndex(log, name)


    var indexes = opts.indexes.map(function (e) {
      return {
        key: e.key,
        value: e.value,
        createStream: function (opts) {
          opts = clone(opts)
          opts.lte.unshift(e.key)
          opts.gte.unshift(e.key)
          if(!(opts.lte[0] == e.key && opts.gte[0] == e.key))
            throw new Error('index key missing from options')
          return read(opts)
        }
      }
    })

    var view = FlumeViewLevel(version || 2, function (data, seq) {
      data = map(data)
      if (!filter(data)) return []
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
    })(log, name)



    var read = view.read
    view.methods.explain = 'sync'
    view.explain = function (opts) {

      opts = opts || {}
      var q, k, sort

      if(isArray(opts.query)) {
        q = opts.query[0].$filter || {}
        sort = opts.query[opts.query.length-1].$sort
      }
      else if(opts.query) {
        q = opts.query
      }
      else
        q = {}

      var index = sort ? u.findByPath(indexes, sort) : select(indexes, q)

      if(sort && !index) return pull.error(new Error('could not sort by:'+JSON.stringify(sort)))

      if(!index) return {scan: true}
      var _opts = query(index, q, exact)
      _opts.values = true
      _opts.keys = true
      _opts.reverse = !!opts.reverse
      //same default logic as pull-live
      _opts.old = (opts.old !== false)
      _opts.live = (opts.live === true || opts.old === false)
      _opts.createStream = index.createStream
      //TODO test coverage for live/old
      _opts.sync = opts.sync
      return _opts
    }

    view.read = function (opts) {
      var _opts = view.explain(opts = opts || {})
      return createFilter(_opts.scan
        ? fullScan(log, opts)
        : pull(
            _opts.createStream(_opts),
            pull.map(function (data) {
              return data.sync ? data : map(data.value)
            })
          ),
        opts
      )
    }
    return view
  }
}



