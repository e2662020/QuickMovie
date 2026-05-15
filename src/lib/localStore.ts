const DB_NAME = 'quickmovie-offline'
const DB_VERSION = 1

export interface LocalStoreItem {
  id: string
  type: string
  data: unknown
  updatedAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('items')) {
          const store = db.createObjectStore('items', { keyPath: 'id' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
          store.createIndex('type_id', ['type', 'id'], { unique: true })
        }
      }

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result)
      }

      request.onerror = () => {
        dbPromise = null
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onblocked = () => {
        dbPromise = null
        reject(new Error('IndexedDB open blocked'))
      }
    } catch (err) {
      dbPromise = null
      reject(err)
    }
  })

  return dbPromise
}

function getObjectStore(mode: IDBTransactionMode): Promise<{
  store: IDBObjectStore
  done: Promise<void>
}> {
  return new Promise((resolve, reject) => {
    openDB()
      .then((db) => {
        try {
          const transaction = db.transaction('items', mode)
          const store = transaction.objectStore('items')

          const done = new Promise<void>((res, rej) => {
            transaction.oncomplete = () => res()
            transaction.onerror = () => rej(transaction.error)
            transaction.onabort = () => rej(transaction.error)
          })

          resolve({ store, done })
        } catch (err) {
          reject(err)
        }
      })
      .catch(reject)
  })
}

export const localStore = {
  async init(): Promise<IDBDatabase> {
    return openDB()
  },

  async get(type: string, id: string): Promise<LocalStoreItem | null> {
    try {
      const { store, done } = await getObjectStore('readonly')
      const result = await new Promise<LocalStoreItem | undefined>((resolve, reject) => {
        const req = store.get(id)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      await done
      if (!result) return null
      if (result.type !== type) return null
      return result
    } catch (err) {
      console.warn(`[localStore] get error for type="${type}" id="${id}":`, err)
      return null
    }
  },

  async getAll(type: string): Promise<LocalStoreItem[]> {
    try {
      const { store, done } = await getObjectStore('readonly')
      const index = store.index('type')
      const results = await new Promise<LocalStoreItem[]>((resolve, reject) => {
        const req = index.getAll(type)
        req.onsuccess = () => resolve(req.result ?? [])
        req.onerror = () => reject(req.error)
      })
      await done
      return results
    } catch (err) {
      console.warn(`[localStore] getAll error for type="${type}":`, err)
      return []
    }
  },

  async put(type: string, id: string, data: unknown): Promise<void> {
    try {
      const { store, done } = await getObjectStore('readwrite')
      const item: LocalStoreItem = {
        id,
        type,
        data,
        updatedAt: Date.now(),
      }
      await new Promise<void>((resolve, reject) => {
        const req = store.put(item)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
      await done
    } catch (err) {
      console.warn(`[localStore] put error for type="${type}" id="${id}":`, err)
    }
  },

  async delete(type: string, id: string): Promise<void> {
    try {
      const { store, done } = await getObjectStore('readwrite')
      const existing = await new Promise<LocalStoreItem | undefined>((resolve, reject) => {
        const req = store.get(id)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      if (existing && existing.type === type) {
        await new Promise<void>((resolve, reject) => {
          const req = store.delete(id)
          req.onsuccess = () => resolve()
          req.onerror = () => reject(req.error)
        })
      }
      await done
    } catch (err) {
      console.warn(`[localStore] delete error for type="${type}" id="${id}":`, err)
    }
  },

  async clear(): Promise<void> {
    try {
      const { store, done } = await getObjectStore('readwrite')
      await new Promise<void>((resolve, reject) => {
        const req = store.clear()
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
      await done
    } catch (err) {
      console.warn('[localStore] clear error:', err)
    }
  },
}
