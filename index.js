var isNumber = function (n) { return 'number' === typeof n }
var isObject = function (o) { return o && 'object' === typeof o && !isArray(o) }
var isArray = Array.isArray

var Indexes = require('./indexes')
var Inject = require('./inject')

module.exports = function (version, opts) {
  if(!isNumber(version)) throw new Error('flumeview-query:version expected as first arg')
  if(!isObject(opts)) throw new Error('flumeview-query: expected opts as second arg')
  return function (log, name) {
    if(!log.filename) return require('./memory')(log, name)
    var _view = Indexes(version, opts)(log, name)
    var view = Inject(log, _view.indexes())

    view.methods = {
      read: 'source',
      add: 'sync',
      explain: 'sync'
    }

    view.createSink = _view.createSink
    view.since = _view.since
    view.destroy = _view.destroy
    return view
  }
}
