// Tiny IndexedDB wrapper. Everything in the app is stored locally on the
// user's device: garment images (as Blobs), body spin frames and saved outfits.

const DB_NAME = 'digital-wardrobe'
const DB_VERSION = 1
export const STORES = {
  items: 'items', // wardrobe garments
  body: 'body', // 360 body capture (single record, id "me")
  outfits: 'outfits', // saved outfit combinations
}

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      Object.values(STORES).forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' })
          if (name === STORES.items) store.createIndex('category', 'category', { unique: false })
        }
      })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run(storeName, mode, operation) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        const request = operation(store)
        tx.oncomplete = () => resolve(request && request.result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
  )
}

export const db = {
  getAll: (store) => run(store, 'readonly', (s) => s.getAll()),
  get: (store, id) => run(store, 'readonly', (s) => s.get(id)),
  put: (store, value) => run(store, 'readwrite', (s) => s.put(value)),
  putMany: (store, values) =>
    run(store, 'readwrite', (s) => {
      values.forEach((v) => s.put(v))
      return null
    }),
  remove: (store, id) => run(store, 'readwrite', (s) => s.delete(id)),
  clear: (store) => run(store, 'readwrite', (s) => s.clear()),
}

export function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
