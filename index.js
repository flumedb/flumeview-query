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

//sorted index.


module.exports = function (indexes, links, version) {

  if(!links)
    links = function (data, emit) { emit(data) }

  var create = FlumeViewLevel(version || 1, function (data, seq) {

    var A = []

    links(data, function (link) {
      indexes.forEach(function (index) {
        var a = [index.key]
        for(var i = 0; i < index.value.length; i++) {
          var key = index.value[i]
          if(!u.has(key, link)) return
          a.push(u.get(key, link))
        }
        a.push(seq)
        A.push(a)
      })
    })

    return A

  })

  return function (log, name) {

    var index = create(log, name)

    var read = index.read

    index.read = function (opts) {

      var lookup
      opts = opts || {}
      var _opts = {}
      var q, k

      if(isArray(opts.query)) {
        q = opts.query[0].$filter || {}
//        k = keys(opts.query)
      }
      else if(opts.query) {
        q = opts.query
      }
      else
        q = {}

      var index = select(indexes, q)

      //just a hack. consider this disabled...
//      if(index.key === 'log') {
//        //TODO: handle log properly.
//        //insert log
//        return pull(
//          log.stream(opts),
//          isArray(opts.query) ? mfr(opts.query) : pull.through()
//        )
//      }


      var _opts = query(index, q)

      _opts.values = false
      _opts.keys = true
//      _opts.keyEncoding = codec

      _opts.reverse = !!opts.reverse
      _opts.live = opts.live
      _opts.old = opts.old
      _opts.sync = opts.sync
//      _opts.limit = opts.limit || -1

      return pull(
        read(_opts),
        //rehydrate the index to resemble the original object.
        pull.map(function (data) {
          console.log(data)
          if(data.sync) return data
          var o = {}
          for(var i = 0; i < index.value.length; i++)
            u.set(index.value[i], data.key[i+1], o)
          return o
        }),
        lookup,
        isArray(opts.query) ? mfr(opts.query) : pull.through(),
        opts.limit > 0 ? pull.take(opts.limit) : pull.through()
      )

    }

    return index
  }

}







