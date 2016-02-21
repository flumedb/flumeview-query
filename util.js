
function isString(s) {
  return 'string' === typeof s
}

function isObject (o) {
  return 'object' == typeof o && o
}

var isArray = Array.isArray


//is range

var isExact = exports.isExact = function (query) {
  return !exports.isRange(query)
}

exports.isRange = function (query) {
  if(isString(query)) return false
  if(isArray(query)) return false
  if(isObject(query)) {
    if(isExact(query.prefix)) return true
    //TODO: handle ltgt ranges? (or will prefix be enough?)
    else return false
  }
}

exports.LO = null
exports.HI = undefined

exports.lower = function (range) {
  return range.prefix
}

exports.upper = function (range) {
  return range.prefix + '\uffff'
}
