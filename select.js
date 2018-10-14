
//of several indexes available,
//select the one most suitable for a given query.

// select the index that matches the most exact fields in the query
// starting from the left, then moving on to range fields.

var Q = require('map-filter-reduce/util')
var u = require('./util')

function max (ary, score) {
  var j = -1, M = 0
  for(var i = 0; i < ary.length; i++) {
    var m = score(ary[i])
    if(m > M) {
      M = m; j = i
    }
  }
  return ary[j]
}

module.exports = function select (indexes, query, returnScores) {
  /*
    calculate scores for each index based on how well they match the query.
    an index field that is _exact_ gets 2 points,
    and an index field that is a range gets 1 point.
    points are added together, and squared at each step,
    because it's better to have range fields after exact fields.

    This is really crude and could be way smarter.
    for example, this doesn't go into how many records the index would return for a given query.
    (you could look that up with `approximateRange` though)
  */
  function getScore (k) {
    var v = u.get(k, query)
    return u.has(k, query) ? (
        Q.isExact(v) ? 2
      : Q.isRange(v) ? 1
      :                0
    ) : 0
  }

  function exact (k) {
    return u.has(k, query) && Q.isExact(u.get(k, query))
  }

  function range (k) {
    return u.has(k, query) && Q.isRange(u.get(k, query))
  }

  var scores = {}
  var index = max(indexes, function (index) {
    var score = 0, new_score = 0
    for(var i = 0; i < index.value.length; i++) {
      new_score = getScore(index.value[i])
      if(!new_score) return score //stop counting when one thing doesn't match
      score = score*score + new_score
      scores[index.key] = score
    }
    return score
  })

  //obviously an ugly hack, just doing this for now so that I do not have to update all the tests
  if(returnScores)
    return {index: index, scores: scores}
  else    return index
}

