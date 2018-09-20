var mfr = require('map-filter-reduce')
var pull = require('pull-stream')
var isArray = Array.isArray

module.exports = function createFilter(source, opts) {
  opts = opts || {}
  return pull(
    source,
    isArray(opts.query) ? mfr(opts.query) : pull.through(),
    opts.limit && pull.take(opts.limit)
  )
}
