var query = require('./query')
var select = require('./select')

var pull = require('pull-stream')
var isArray = Array.isArray


module.exports = function (indexes, scan) {
  return function explain (opts) {
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

    if(!index) return {
      scan: true,
      createStream: scan,
      reverse: !!opts.reverse,
      live: !!(opts.live === true || opts.old === false),
      old: opts.old !== false,
      sync: !!opts.sync
    }

    var _opts = query(index, q, index.exact)
    _opts.reverse = !!opts.reverse
    //same default logic as pull-live
    _opts.old = (opts.old !== false)
    _opts.live = (opts.live === true || opts.old === false)
    _opts.createStream = index.createStream
    //TODO test coverage for live/old
    _opts.sync = opts.sync
    return _opts
  }
}

