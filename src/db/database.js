import { openDB } from 'idb'

/**
 * IndexedDB layer. The app keeps a full in-memory copy of the data (in the
 * store reducer) and this module is responsible for durability:
 *
 *   - loadAll()           rehydrate everything on boot
 *   - put / remove        called on every single mutation
 *   - replaceAll()        used by JSON import (restore from backup)
 *
 * If IndexedDB is unavailable (rare: private-mode edge cases, ancient
 * browsers) we fall back to a localStorage shim with the same interface.
 */

const DB_NAME = 'finch'
const DB_VERSION = 1
export const STORE_NAMES = ['expenses', 'recurring', 'categories', 'goals', 'settings']

let dbPromise = null
let usingFallback = false

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of STORE_NAMES) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' })
          }
        }
      },
    })
  }
  return dbPromise
}

/* ---------- localStorage fallback (same shape, used only if idb fails) ---------- */

const LS_PREFIX = 'finch:'

const fallback = {
  async loadAll() {
    const result = {}
    for (const name of STORE_NAMES) {
      try {
        result[name] = JSON.parse(localStorage.getItem(LS_PREFIX + name)) ?? []
      } catch {
        result[name] = []
      }
    }
    return result
  },
  _write(storeName, items) {
    localStorage.setItem(LS_PREFIX + storeName, JSON.stringify(items))
  },
  async put(storeName, record) {
    const items = (await this.loadAll())[storeName]
    const i = items.findIndex((x) => x.id === record.id)
    if (i >= 0) items[i] = record
    else items.push(record)
    this._write(storeName, items)
  },
  async remove(storeName, id) {
    const items = (await this.loadAll())[storeName].filter((x) => x.id !== id)
    this._write(storeName, items)
  },
  async replaceAll(data) {
    for (const name of STORE_NAMES) {
      this._write(name, data[name] ?? [])
    }
  },
}

/* ---------- public API ---------- */

export async function loadAll() {
  try {
    const db = await getDB()
    const result = {}
    for (const name of STORE_NAMES) {
      result[name] = await db.getAll(name)
    }
    return result
  } catch (err) {
    console.warn('IndexedDB unavailable, falling back to localStorage', err)
    usingFallback = true
    return fallback.loadAll()
  }
}

export async function put(storeName, record) {
  if (usingFallback) return fallback.put(storeName, record)
  const db = await getDB()
  await db.put(storeName, record)
}

export async function putMany(storeName, records) {
  if (usingFallback) {
    for (const r of records) await fallback.put(storeName, r)
    return
  }
  const db = await getDB()
  const tx = db.transaction(storeName, 'readwrite')
  await Promise.all([...records.map((r) => tx.store.put(r)), tx.done])
}

export async function remove(storeName, id) {
  if (usingFallback) return fallback.remove(storeName, id)
  const db = await getDB()
  await db.delete(storeName, id)
}

export async function removeMany(storeName, ids) {
  if (usingFallback) {
    for (const id of ids) await fallback.remove(storeName, id)
    return
  }
  const db = await getDB()
  const tx = db.transaction(storeName, 'readwrite')
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done])
}

/** Wipe every store and write the given data — used by backup restore. */
export async function replaceAll(data) {
  if (usingFallback) return fallback.replaceAll(data)
  const db = await getDB()
  const tx = db.transaction(STORE_NAMES, 'readwrite')
  for (const name of STORE_NAMES) {
    tx.objectStore(name).clear()
    for (const record of data[name] ?? []) {
      tx.objectStore(name).put(record)
    }
  }
  await tx.done
}

export function isUsingFallback() {
  return usingFallback
}
