import create from '@most/create'
import deepEqual from 'deep-equal'

export function makePouchDBDriver (PouchDB, dbName) {
  PouchDB.plugin(require('pouchdb-live-query'))

  const db = new PouchDB(dbName)

  var emitters = {}
  var errorEmitters = []
  var feed = db.changes({
    live: true,
    include_docs: true,
    since: 'now'
  })

  /* on every change: */
  feed.on('change', change => {
    var emit

    /* emit the changed doc to the listeners */
    emit = emitters[`get.${change.id}`]
    if (emit) emit(change.doc)

    /* emit the change itself */
    emit = emitters['changes']
    if (emit) emit(change)
  })

  feed.on('error', err => {
    for (let i = 0; i < errorEmitters.length; i++) {
      let emitError = errorEmitters[i]
      emitError(err)
    }
  })

  return function PouchDBDriver (op$) {
    var streams = {}

    var o = {
      DB: db,

      put (doc) {
        return {
          op: 'put',
          doc
        }
      },

      ensure (doc) {
        return {
          op: 'ensure',
          doc
        }
      },

      query (funName, options = {}) {
        let optstring = JSON.stringify(options)
        let stream = streams[`query.${funName}-${optstring}`] || create(add => {
          db.liveQuery(funName, options)
            .then(result => {
              add(result)

              result.on('change', add)
            })
        }).multicast()
        streams[`query.${funName}-${optstring}`] = stream

        return stream
          .multicast()
      },

      get (docid) {
        let stream = streams[`get.${docid}`] || create((add, _, error) => {
          emitters[`get.${docid}`] = add
          errorEmitters.push(error)
        })

        return stream
          .multicast()
      },

      changes () {
        let stream = streams['changes'] || create((add, _, error) => {
          emitters['changes'] = add
          errorEmitters.push(error)
        })
        return stream.multicast()
      }
    }

    op$.observe(op => {
      switch (op.op) {
        case 'put':
          db.put(op.doc) // changes will be emitted on the 'changes' listener above
          break
        case 'ensure':
          db.get(op.doc._id, (err, res) => {
            if (err) {
              db.put(op.doc)
            } else {
              let rev = res._rev
              delete res._rev
              if (deepEqual(op.doc, res)) {
                return
              } else {
                op.doc._rev = rev
                db.put(op.doc)
              }
            }
          })
          break
        case '~':
          break
      }
    })

    return o
  }
}
