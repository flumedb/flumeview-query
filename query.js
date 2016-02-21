
var u = require('./util')
var select = require('./select')

function id (e) { return e }

module.exports = function (indexes, query, encode) {
  var index = select(indexes, query)

  encode = encode || id

  function bound (value, range, sentinel) {
    return (
      value == null    ? sentinel
    : u.isRange(value) ? range(value)
    :                    value
    )
  }

  function build (index, map) {
    var a = [index.key]
    for(var i = 0; i < index.value.length; i++)
      a.push(map(query[index.value[i]]))
    return encode(a)
  }

  return {
    gte: build(index, function (value) {
      return bound(value, u.lower, u.LO)
    }),
    lt: build(index, function (value) {
      return bound(value, u.upper, u.HI)
    })
    //reverse, limit, live?
  }

}









