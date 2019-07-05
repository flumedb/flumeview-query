var query = require('./query')
var select = require('./select')

var pull = require('pull-stream')
var isArray = Array.isArray

var u = require('./util')

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

    var r = sort && {index: u.findByPath(indexes, sort), scores: {}} || select(indexes, q, true)
    var index = r.index
    if(!index) return {
      scan: true,
      createStream: scan,
      reverse: !!opts.reverse,
      live: !!(opts.live === true || opts.old === false),
      old: opts.old !== false,
      sync: !!opts.sync,
      //also return the name of the index and the scores for indexes considered!
    }

    var _opts = query(index, q, index.exact)
    _opts.reverse = !!opts.reverse
    //same default logic as pull-live
    _opts.old = (opts.old !== false)
    _opts.live = (opts.live === true || opts.old === false)
    _opts.createStream = index.createStream
    //TODO test coverage for live/old
    _opts.sync = opts.sync
    _opts.index = index.key,
    _opts.scores = r.scores
    return _opts
  }
}
