# flumeview-query

A [flumeview](https://github.com/flumedb/flumedb) with [map-filter-reduce](https://github.com/dominictarr/map-filter-reduce) queries

## Motivation

This particular module was because I needed to index links in [secure-scuttlebutt](https://github.com/ssbc/secure-scuttlebutt)
in a flexible way.

## example

``` js
var db = Flume(log).use('links', FlumeQuery(null, indexes))
pull(
  db.links.read({query: query}),
  ...
)
```

## indexes

the indexes argument is an array of indexes that flumeview-query will be able to look at to
do a fast query.

## queries

This module uses [map-filter-reduce](https://github.com/dominictarr/map-filter-reduce) queries,
if the filter stage uses fields that are in a index, then `streamview-links`
can choose the best index and perform many queries very quickly.

see [map-filter-reduce](https://github.com/dominictarr/map-filter-reduce) for documentation of the syntax,
and [ssb-links](https://github.com/dominictarr/ssb-links) for example
queries, performed on top of [secure-scuttlebutt](https://github.com/ssbc/secure-scuttlebutt)


## License

MIT




