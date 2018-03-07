# flumeview-query

A [flumeview](https://github.com/flumedb/flumedb) with [map-filter-reduce](https://github.com/dominictarr/map-filter-reduce) queries

## Motivation

This particular module was because I needed to query things
in [secure-scuttlebutt](https://github.com/ssbc/secure-scuttlebutt)
in a flexible way. A previous exploration of this general
idea was [mynosql](https://www.npmjs.com/package/mynosql)
Yes the joke is that it's sql, but for no sql. SQL is actually
totally functional (just with weird names)

map, filter, reduce == select, where, group-by !

Except with none of those icky schemas that just get you down!
(anyway, with ssb we really _can't_ enforce schemas (because
of privacy oriented decentralization))

## example

``` js
var db = Flume(log).use('query', FlumeQuery(null, {indexes:indexes}))
pull(
  db.links.read({query: query}),
  ...
)
```

## indexes

the indexes argument is an array of indexes that flumeview-query will be able to look at to
do a fast query.

Indexes is an object with the a short name of the index. (this will
be stored with every record, so say 3 chars, is recommended)

for example, `ssb-query`'s indexes look like:

``` js
[
  {key: 'log', value: ['timestamp']},
  {key: 'clk', value: [['value', 'author'], ['value', 'sequence']] },
  {key: 'typ', value: [['value', 'content', 'type'], ['timestamp']] },
  {key: 'cha', value: [['value', 'content', 'channel'], ['timestamp']] },
  {key: 'aty', value: [['value', 'author'], ['value', 'content', 'type'], ['timestamp']]}
]
```

Indexes can be of a single field or multiple fields (which are called
"compound indexes"). each item in an index must be unique,
that is why the most of the indexes end in `timestamp`,
author:sequence is also unique in ssb, to that index doesn't need timestamp.
The uniqueness is not enforced by flumeview-query, it is the responsibilty of the index designer.

compound indexes optimize queries with multiple fields.
for example a query like: "all posts by @bob" which is
`{value: {author: @bob, content: {type: 'post'}}}`
uses the `clk` index.

If a query matches all fields in the index, the query will
return 1 item (or zero if there is no record with those values)

properties in the index are used from left to right,
a query for "messages from @bob received since yesterday"
`{author: @bob, timestamp: {$gt: yesterday}}` cannot
use author and timestamp fields in `aty` as it leaves a gap in the `value.content.type` field,
this query with these indexes would use part of a compound index,
(clk, because it matches first) read all the messages by `@bob`
and filter out the records matching the other query parameter
(`timestamp: {$gt: yesterday}`) This is called a "partial scan".
A partial scan is clearly less efficient than matched index,
but not as bad as a full scan (which reads the entire database!)

queries with compound indexes will end up sorted by the last
index matched. Theirfor, put the fields you expect to be exact
first!

## queries

This module uses [map-filter-reduce](https://github.com/dominictarr/map-filter-reduce) queries,
if the filter stage uses fields that are in a index, then `streamview-links`
can choose the best index and perform many queries very quickly.

see [map-filter-reduce](https://github.com/dominictarr/map-filter-reduce) for documentation of the syntax,
and [ssb-links](https://github.com/dominictarr/ssb-links) for example
queries, performed on top of [secure-scuttlebutt](https://github.com/ssbc/secure-scuttlebutt)

## api : flumedb.use("query", FlumeViewQuery(version, opts))

`version` must be an number. When you update any options,
change the version and the index will rebuild.
`opts` is the options. in particular `{indexes: [...]}` is mandatory.

here we use the name "query", you can use any name.

### flumedb.query.read({query:MFR_query, limit, reverse, live, old})

perform the query! limit, reverse, live, old are stardard as 
with other flume streams.

### flumedb.explain ({query:MFR_query, limit, reverse, live, old}) => obj

figure out what indexes are best to use to perform a query,
but do not actually run the query! If a query is slow or
doesn't seem to be working right, this method can be used
to understand what is really going on. If the return value is

`{scan: true}` that means no indexes are being used.
If an index is selected, that should mean it's more efficient,
but it might still be filtering the output.

## License

MIT

