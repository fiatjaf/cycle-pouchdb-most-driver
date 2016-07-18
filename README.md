This is a driver for all your [pure-most Cycle apps](https://github.com/cyclejs/most-run) (think [Motorcycle](https://github.com/motorcyclejs/core#merging-with-cyclejs)) that speak with [PouchDB](https://pouchdb.com/).

It returns streams from `.get`, `.query` and `.changes` methods for easy read access to PouchDB data, and accepts `.put`, `.remove` and `.ensure` operations for write.

### Install

```
npm install --save cycle-pouchdb-most-driver
```


### Use

```javascript
import most from 'most'
import PouchDB from 'pouchdb-browser'
import {makeDOMDriver} from '@motorcycle/dom'
import {makePouchDBDriver} from 'cycle-pouchdb-most-driver'
import Cycle from '@cycle/most-run'

Cycle.run(app, {
  DOM: makeDOMDriver('#container'),
  POUCHDB: makePouchDBDriver(PouchDB, 'my-db-name')
})

function app ({DOM, POUCHDB}) {
  let vtree$ = POUCHDB
    .query('my-ddoc/items-by-time', {descending: true, startkey: [{}], endkey: [null], include_docs: true})
    .map(res => res.rows.map(r => r.doc))
    .map(items =>
      h('ul', items.map(item =>
        h('li', {props: {id: item._id}}, item.name)
      ))
    )

  return {
    DOM: vtree$,
    POUCHDB: most.from([
      POUCHDB.ensure({
        '_id': '_design/my-ddoc',
        'views': {
          'items-by-time': {
            'map': `
              function (doc) {
                if (doc.type == 'item') {
                  emit([doc.year, doc.month, doc.day, doc.time], doc.value)
                }
              }
            `
          }
        }
      }),
      POUCHDB.put({_id: 'xyz', name: 'lalala', year: 2018, month: 2, day: 21, time: '14:44:23'})
      POUCHDB.put({_id: 'uyt', name: 'lololo', year: 2018, month: 2, day: 22, time: '10:01:36'})
    ])
  }
}
```
