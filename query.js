var Q = require('map-filter-reduce/util')
var select = require('./select')
var get = require('./util').get

function id (e) { return e }

module.exports = function (index, query, exact) {

  function bound (value, range, sentinel) {
    return (
      value == null    ? sentinel
    : Q.isRange(value) ? range(value)
    :                    value
    )
  }

  function build (index, map, b) {
    var a = [index.key]
    for(var i = 0; i < index.value.length; i++)
      a.push(map(get(index.value[i], query)))
    if(!exact) a.push(b)
    return a
  }

  return {
    gte: build(index, function (value) {
      return bound(value, Q.lower, Q.LO)
    }, Q.LO),
    lte: build(index, function (value) {
      return bound(value, Q.upper, Q.HI)
    }, Q.HI)
    //reverse, limit, live?
  }

}


