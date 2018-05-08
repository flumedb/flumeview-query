'use strict'
var pull = require('pull-stream')
var query = require('./query')
var select = require('./select')
var mfr = require('map-filter-reduce')
var keys = require('map-filter-reduce/keys')
var u = require('./util')
var Flatmap = require('pull-flatmap')
var FlumeViewLevel = require('flumeview-level')

var isArray = Array.isArray

//sorted index.

//split this into TWO modules. flumeview-links and flumeview-query
module.exports = function (indexes, links, version) {

  if(!links)
    links = function (data, emit) { emit(data) }

  function getIndexes (data, seq) {
    var A = []
    indexes.forEach(function (index) {
      var a = [index.key]
      for(var i = 0; i < index.value.length; i++) {
        var key = index.value[i]
        if(!u.has(key, data)) return
        a.push(u.get(key, data))
      }
      a.push(seq)
      A.push(a)
    })
    return A
  }

  var create = FlumeViewLevel(version || 1, function (value, seq) {
    var A = []
    links(value, function (value) {
      A = A.concat(getIndexes(value, seq))
    })
    return A
  })

  return function (log, name) {

    var index = create(log, name)
    var read = index.read

    index.read = function (opts) {

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

      var index = select(indexes, q)

      if(!index)
        return pull(
          log.stream({
            values: true, seqs: false, live: opts.live, limit: opts.limit, reverse: opts.reverse
          }),
          Flatmap(function (data) {
            var emit = []
            links(data, function (a) {
              emit.push(a)
            })
            return emit
          })
        )

      var _opts = query(index, q)

      _opts.values = true
      _opts.keys = true

      _opts.reverse = !!opts.reverse
      _opts.live = opts.live
      _opts.old = opts.old
      _opts.sync = opts.sync
      _opts.unlinkedValues = opts.unlinkedValues

      return pull(
        read(_opts),
        pull.map(function (data) {
          if(data.sync) return data
          var o = opts.unlinkedValues ? data.value : {}
          for(var i = 0; i < index.value.length; i++)
            u.set(index.value[i], data.key[i+1], o)
          return o
        }),
        isArray(opts.query) ? mfr(opts.query) : pull.through(),
        opts.limit ? pull.take(opts.limit) : pull.through()
      )
    }
    return index
  }
}


