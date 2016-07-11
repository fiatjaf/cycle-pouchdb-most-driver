This is a driver for all your [pure-most Cycle apps](https://github.com/cyclejs/most-run) (think [Motorcycle](https://github.com/motorcyclejs/core#merging-with-cyclejs)) that speak with [PouchDB](https://pouchdb.com/).

It works with a kind of "subscriptions", not supporting all PouchDB features, however making it easy to deal with PouchDB from most streams.

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
  DOM: makeDOMDriver('#container', [
    require('snabbdom/modules/props'),
    require('snabbdom/modules/style')
  ]),
  POUCHDB: makePouchDBDriver(PouchDB)
})

function app ({DOM, POUCHDB}) {
  let vtree$ = POUCHDB
    .
    .map(items =>
      h('ul', items.map(item =>
        h('li', {props: {id: item.id}}, item.name)
      ))
    )

  return {
    DOM: vtree$,
    GRAPHQL: most.from([{
      query: 'fetchItems'
    }, {
      mutation: 'setItem',
      variables: {
        id: 123,
        name: 'an item',
        desc: 'this is an item'
      }
    }])
  }
}
```
