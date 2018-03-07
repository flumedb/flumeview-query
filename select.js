
//of several indexes available,
//select the one most suitable for a given query.

// select the index that matches the most exact fields in the query
// starting from the left, then moving on to range fields.

var Q = require('map-filter-reduce/util')
var u = require('./util')
function max(array, compare) {
  return array.reduce(function (max, e) {
    return compare(e.value, max.value) > 0 ? e : max
  }, array[0])
}

function _max (ary, score) {
  var j = -1, M = 0
  for(var i = 0; i < ary.length; i++) {
    var m = score(ary[i])
    if(m > M) {
      M = m; j = i
    }
  }
  return ary[j]
}

module.exports = function select (indexes, query) {

  function score (k) {
    var v = u.get(k, query)
    return u.has(k, query) ? (
        Q.isExact(v) ? 3
      : Q.isRange(v) ? 2
      :                1
    ) : 0
  }

  function exact (k) {
    return u.has(k, query) && Q.isExact(u.get(k, query))
  }

  function range (k) {
    return u.has(k, query) && Q.isRange(u.get(k, query))
  }

  return _max(indexes, function (index) {
    var s = 0, _s
    for(var i = 0; i < index.value.length; i++) {
      _s = score(index.value[i])
      if(!_s) return s //stop counting when one thing doesn't match
      s = s*s + _s
    }
    return s
  })
}






