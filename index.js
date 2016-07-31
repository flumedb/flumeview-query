'use strict'
var level = require('level')
var pull = require('pull-stream')
var Write = require('pull-write')
var pl = require('pull-level')
var query = require('./query')
var select = require('./select')
var mfr = require('map-filter-reduce')
var keys = require('map-filter-reduce/keys')
var bytewise = require('bytewise')
var paramap = require('pull-paramap')
var explain = require('explain-error')
var u = require('./util')

var isArray = Array.isArray

//sorted index.


module.exports = function (path, indexes, links, version, codec, createLogStream) {
  codec = codec || require('bytewise')
  var db = level(path)

  if('string' !== typeof path)
    throw new Error('must provide path for leveldb instance')
  if(!Array.isArray(indexes))
    throw new Error('must provide an array of indexes')
  if('number' !== typeof version)
    throw new Error('must provide version number')

  if(!links)
    links = function (data, emit) { emit(data) }


  //always write metada to the lowest key,
  //so the indexes do not interfeer
  //we don't want to encode this with the codec,
  //because then we can't change the codec safely
  //(prehaps the encoding of META is also some indexed value in another codec?)
  var META = '\x00'

  return {
    init: function (cb) {
      db.get(META, function (err, value) {
        console.log('RELOAD INDEX:', value)
        if(value)
          try { value = JSON.parse(value) }
          catch (err) { return cb(null, 0) }

        if(err) //first time this was run
          cb(null, 0)
        //if the view has changed, rebuild entire index.
        //else, read current version.

        else if(version && value.version !== version) {
          db.close(function () {
            level.destroy(path, function (err) {
              if(err) return cb(err)
              db = level(path)
              cb(null, 0)
            })
          })
        }
        else
          cb(null, value.since || 0)
      })
    },
    write: function (cb) {
      return pull(
        Write(function (batch, cb) {
          db.batch(batch, cb)
        }, function (batch, data) {
          if(data.sync) return batch
          if(!batch)
            batch = [{
              key: META,
              value: {version: version, since: data.ts},
              valueEncoding: 'json',
              type: 'put'
            }]

          function push(ary) {
            batch.push({key: ary, keyEncoding: codec, value: ' ', type: 'put'})
          }

          links(data, function (link) {
            indexes.forEach(function (index) {
              var a = [index.key]
              for(var i = 0; i < index.value.length; i++) {
                var key = index.value[i]
                if(!u.has(key, link)) return
                a.push(u.get(key, link))
              }
              push(a)
            })
          })

          var ts = data.ts || data.timestamp
          if(ts) batch[0].value.since = ts
          return batch
        }, 100, cb)
      )
    },
    close: function (cb) {
      db.close(cb)
    },
    //get the raw indexes, for debugging.
    dump: function () {
      return pl.read(db, {keyEncoding: codec, gt: '\x00'})
    },
    //read all the messages out, via matching ranges.
    read: function (opts, get) {
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
      if(index.key === 'log') {
        //TODO: handle log properly.
        //insert log
        return pull(
          createLogStream(opts),
          isArray(opts.query) ? mfr(opts.query) : pull.through()
        )
      }


      var _opts = query(index, q)

      _opts.values = false
      _opts.keys = true
      _opts.keyEncoding = codec

      _opts.reverse = !!opts.reverse
      _opts.live = opts.live
      _opts.old = opts.old
      _opts.limit = opts.limit || -1

      // If a query uses a key not in the index
      // then we need to get that somehow.
      // if this is a key from the thing indexed,
      // it makes sense to look up that record.
      // how to do that might be different in a view.

      // just disable this for now.

      if(get)
        lookup = paramap(function (link, cb) {
          get(link.ts || link.timestamp, function (err, data) {
            if(err) return cb(explain(err, 'could not find matching timestamp for index:'+JSON.stringify(link)))
            link.key = data.key
            link.value = data.value
            cb(null, link)
          })
        })

      return pull(
        pl.read(db, _opts),
        //rehydrate the index to resemble the original object.
        pull.map(function (e) {
          if(e.sync) return e
          var o = {}
          for(var i = 0; i < index.value.length; i++)
            u.set(index.value[i], e[i+1], o)
          return o
        }),
        lookup,
        isArray(opts.query) ? mfr(opts.query) : pull.through()
      )
    }
  }
}

