# streamview-links

A [streamview](https://github.com/dominictarr/streamview) index for links.

## Motivation

This particular module was because I needed to index links in [secure-scuttlebutt](https://github.com/ssbc/secure-scuttlebutt)
It also builds in 

## Example

``` js
var StreamviewLinks = require('streamview-links')
//directory where you want this index stored
var dirname = path.join(dbPath, 'links')

//a function that extracts links from an document.
//
function links (doc, emit) {
  //call emit for every link in the document.
  //`ts` is the sequence number of this document.
  // you could use other field names, but these are the names I used.
  emit({source: s, dest: d, rel: r, ts: ts})
}

//indexes to create. you could create more or less indexes than this.
//up to you.
var indexes = {
  'sdr': ['source', 'dest', 'rel', 'ts'],
  'rds': ['rel', 'dest', 'source', 'ts'],
  'drs': ['dest', 'rel', 'source', 'ts'],
}
//change the version number, and the view will rebuild on start up.
var version = 1
var svl = StreamviewLinks(dirname, indexes, links, version)

```
streamview-links is now setup. to connect to a database via it's log

``` js
svl.init(function (err, since) {
  pull(db.createLogStream({gt: since, live: true}), svl.write())
})

```

now you can query the database.
``` js
var pull = require('pull-stream')
//read 
pull(
  svl.read({
    query: [
      {$filter: {source: s, dest: d}},
      {$reduce: {$count: true}}
    ]
  }),
  pull.collect(cb)
)

```

## queries

This module uses [map-filter-reduce](https://github.com/dominictarr/map-filter-reduce) queries,
if the filter stage uses fields that are in a index, then `streamview-links`
can choose the best index and perform many queries very quickly.

see [map-filter-reduce](https://github.com/dominictarr/map-filter-reduce) for documentation of the syntax,
and [ssb-links](https://github.com/dominictarr/ssb-links) for example
queries, performed on top of [secure-scuttlebutt](https://github.com/ssbc/secure-scuttlebutt)


## License

MIT

