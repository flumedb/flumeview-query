var FlumeViewLevel = require('flumeview-level')
var u = require('./util')
var pull = require('pull-stream')

function clone (obj) {
  var o = {}
  for(var k in obj)
    o[k] = obj[k]
  return o
}


module.exports = function (version, opts) {
  var filter = opts.filter || function () { return true }
  var map = opts.map || function (item) { return item }
  var exact = opts.exact !== false
  var read
  return function (log, name) {
    var indexes = opts.indexes.map(function (e) {
      return {
        key: e.key,
        value: e.value,
        exact: 'boolean' === typeof e.exact ? e.exact : exact,
        createStream: function (opts) {
          opts = clone(opts)
          opts.lte.unshift(e.key)
          opts.gte.unshift(e.key)
          opts.keys = true; opts.values = true
          if(!(opts.lte[0] == e.key && opts.gte[0] == e.key))
            throw new Error('index key missing from options')
          return pull(
            read(opts),
            pull.map(function (data) {
              return data.sync ? data : map(data.value)
            })
          )
        }
      }
    })

    var view = FlumeViewLevel(version || 3, function (data, seq) {
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
        if(!index.exact) a.push(seq);
        A.push(a)
      })
      return A
    })(log, name)

    read = view.read

    view.methods.indexes = 'sync'
    view.indexes = function () { return indexes }

    return view
  }
}
