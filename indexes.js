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
  var indexes = opts.indexes

  return function (log, name) {
    indexes = indexes.map(function (e) {
      return {
        key: e.key,
        value: e.value,
        exact: exact,
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
        if(!index.exact) a.push(seq);
        A.push(a)
      })
      return A
    })(log, name)
    var read = view.read
    view.indexes = indexes

    return view
  }
}

