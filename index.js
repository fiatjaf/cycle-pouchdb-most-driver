import create from '@most/create'
import deepEqual from 'deep-equal'

export function makePouchDBDriver (PouchDB) {
  return function PouchDBDriver (op$) {
    const pouches = {}

    var emitters = {}
    var streams = {}

    var o = {
      open (dbName) {
        return {
          op: 'open',
          dbName
        }
      },

      db (dbName) {
        let db = pouches[db]

        return {
          put (doc) {
            return {
              op: 'put',
              doc,
              dbName
            }
          },

          ensure (doc) {
            return {
              op: 'ensure',
              doc,
              dbName
            }
          },

          query (funName, options = {}) {
            let optstring = JSON.stringify(options)
            let stream = streams[`${dbName}.query.${funName}-${optstring}`]
            if (!stream) {
              stream = create(add => {
                add.funName = funName // a hack to give the changes listener below
                add.options = options // access to the query paramenters.

                emitters[`${dbName}.query`] = emitters[`${dbName}.query`] || []
                emitters[`${dbName}.query`].push(add)
              })
            }

            return stream
              .multicast()
          },

          get (docid) {
            let stream = streams[`${dbName}.get.${docid}`] || create(add => {
              emitters[`${dbName}.get.${docid}`] = add
            })

            return stream
              .multicast()
          },

          changes () {
            let stream = streams[`${dbName}.changes`] || create(add => {
              emitters[`${dbName}.changes`] = add
            })
            return stream.multicast()
          }
        }
      }
    }

    op$.observe(op => {
      let dbName = op.dbName
      let db = pouches[dbName]
      switch (op.op) {
        case 'open':
          db = new PouchDB(dbName)
          let feed = db.changes({
            live: true,
            include_docs: true,
            since: 'now'
          })
          pouches[dbName] = db

          /* on every change: */
          feed.on('change', change => {
            var emit

            /* redo all the queries and emit the results */
            emitters[`${dbName}.query`].forEach(emit => {
              db.query(emit.funName, emit.options, (err, res) => {
                if (err) return emit(err)
                emit(res)
              })
            })

            /* emit the changed doc to the listeners */
            emit = emitters[`${dbName}.get.${change.id}`]
            if (emit) {
              emit(change.doc)
            }

            /* emit the change itself */
            emit = emitters[`${dbName}.changes`]
            if (emit) {
              emit(change)
            }
          })

          /* on feed start listen dispatch a fake event */
          setTimeout(() => feed.emit('change', {}), 1)

          break
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
