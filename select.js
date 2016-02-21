
//of several indexes available,
//select the one most suitable for a given query.

/*
A query can be on multiple fields.
and, a particular field can specify a range.
for example, to select all strings starting with "A"
  {prefix: 'A'}
which would become, in level land:
  {gte: 'A' lt: 'A\uffff'}

In any query, there are probably some fields which are ranges,
and hopefully some which are exact. Exact fields allow us
to efficiently utilize an ordered index.

if we have an index [A, B, C] and we have a query A=foo, B=10<=b<20
(note that leaving off C is implicitly C=*
then we can convert that to bounds of {gte: [foo, 10, LO], lt: [foo, 20, HI]}

(LO, and HI are minimum lower and maximum higher sentinel values)

to index things like links, we will probably have the various values
in multiple orders, say [A, B, C], [B, A, C], [A, C, B]

for our above query, ABC is the index can use most effectively.
since we have a range for B and C, but a narrower range for B than C,
if we used ACB we'd have to scan past all the possible C values.
because [foo, LO, 10] is lower than [foo, 10, LO]

hmm, in this particular case, we have a defined range for B but not C.
if we had two defined ranges, then they might not overlap, so which one
is bigger would depend on the particular distribution of those values.

okay, so we just ignore implicit ranges.

  1. get exact fields.
  2. look for indexes which match the most exact fields.
  3. if there is more than one suitable index,
     filter that list by the number of ranges.

*/
var u = require('./util')

module.exports = function select (indexes, query) {

  var exact = {}, range = {}

  for(var k in query) {
    if(u.isExact(query[k])) exact[k] = query[k]
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

  return indexes.reduce(function (max, e) {
    return compare(e.value, max.value) > 0 ? e : max
  }, indexes[0])

}


