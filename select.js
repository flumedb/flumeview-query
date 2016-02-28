
//of several indexes available,
//select the one most suitable for a given query.

// select the index that matches the most exact fields in the query
// starting from the left, then moving on to range fields.

var Q = require('map-filter-reduce/util')

function max(array, compare) {
  return array.reduce(function (max, e) {
    return compare(e.value, max.value) > 0 ? e : max
  }, array[0])
}

module.exports = function select (indexes, query) {

  var exact = {}, range = {}

  //TODO: check if a _path_ is exact, so we have deep queries.
  for(var k in query) {
    if(Q.isExact(query[k])) exact[k] = query[k]
    else                    range[k] = query[k]
  }

  function compare(a, b) {
    var l = Math.min(a.length, b.length)
    for(var i = 0; i < l; i++) {
      var k = a[i], j = b[i]

      if     (exact[k]) { if(!exact[j]) return  1 }
      else if(exact[j])                 return -1
      else if(range[k]) { if(!range[j]) return  1 }
      else if(range[j])                 return -1

      // else, loop to next item.
    }
    return 0
  }

  return max(indexes, compare)

}

