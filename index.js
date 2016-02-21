var level = require('level')
var pull = require('pull-stream')
var Write = require('pull-write')
var pl = require('pull-level')
var query = require('./query')

var bytewise = require('bytewise')

var u = require('./util')
//sorted index.

module.exports = function (path, links, version) {

  var db = level(path)

  var indexes = [
    { key: 'SRD', value: ['source', 'rel', 'dest'] },
    { key: 'DRS', value: ['dest', 'rel', 'source'] },
    { key: 'RDS', value: ['rel', 'dest', 'source'] }
  ]

  return {
    init: function (cb) {
      db.get('~meta~', function (err, value) {
        if(value)
          try { value = JSON.parse(value) }
          catch (err) { return cb(null, 0) }

        if(err) //first time this was run
          cb(null, 0)
          
        //if the view has changed, rebuild entire index.
        //else, read current version.
        else if(version && value.version !== version)
          level.destroy(path, function (err) {
            if(err) return cb(err)
            db = level(path)
            cb(null, 0)
          })
        else
          cb(null, value.since || 0)
      })
    },
    write: function (cb) {
      return pull(
        Write(function (batch, cb) {
          db.batch(batch, cb)
        }, function (batch, data) {
          if(!batch)
            batch = [{
              key: '~meta~',
              value: {version: version, since: data.ts},
              valueEncoding: 'json',
              type: 'put'
            }]
          function push(ary) {
            batch.push({key: bytewise.encode(ary).toString('hex'), value: ' ', type: 'put'})
          }
          links(data, function (link) {
//            push([">", link.source, link.rel, link.dest, data.key])
//            push(["<", link.dest, link.rel, link.source, data.key])

            //get all relations between two nodes
            push(["SDR", link.source, link.dest, link.rel, data.ts])
            //get all relations to a dest
            push(["DRS", link.dest, link.rel, link.source, data.ts])
            //get all relations from a source
            push(["SRD", link.source, link.rel, link.dest, data.ts])
            //could also have DSR, SRD, RSD
            //if we expect the user to know two parameters
            //we only need 3 (say SD SR DR)
            //if they want a known and a range, then they need 3
            //only rel makes sense as a range though.
            //DRS, SRD, SDR
          })
          batch[0].value.since = data.ts
          return batch
        }, 100, cb)
      )
    },
    close: function (cb) {
      db.close(cb)
    },
    read: function (opts) {
      if(!opts) return pl.read(db)
      if(!opts.query) return pl.read(db, opts)

      console.log(indexes, opts)
      var opts = query(indexes, opts.query, function (e) {
        return bytewise.encode(e).toString('hex')
      })
      console.log(opts)
      opts.values = false
      opts.keys = true
      return pull(
        pl.read(db, opts),
        pull.map(function (e) {
          return bytewise.decode(new Buffer(e,'hex'))
        })
      )
    }
  }
}





