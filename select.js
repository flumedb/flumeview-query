
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

  function compare(a, b) {
    var l = Math.min(a.length, b.length)
    for(var i = 0; i < l; i++) {
      var k = a[i], j = b[i]

      var v = score(k), x = score(j)
      if(v != x) return v - x

      // else, loop to next item.
    }
    return 0
  }

  return max(indexes, compare)

}







