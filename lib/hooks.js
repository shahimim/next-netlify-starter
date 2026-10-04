import { useEffect, useMemo, useState } from 'react'
import { db, STORES } from './db'

// Turn a Blob (or array of Blobs) into object URLs that are revoked on cleanup.
export function useObjectUrl(blob) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return undefined
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

export function useObjectUrls(blobs) {
  const list = useMemo(() => blobs || [], [blobs])
  const [urls, setUrls] = useState([])
  useEffect(() => {
    const created = list.map((b) => URL.createObjectURL(b))
    setUrls(created)
    return () => created.forEach((u) => URL.revokeObjectURL(u))
  }, [list])
  return urls
}

// Load the wardrobe from IndexedDB with a reload function.
export function useWardrobe() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const reload = () =>
    db
      .getAll(STORES.items)
      .then((rows) => setItems(rows.sort((a, b) => b.createdAt - a.createdAt)))
      .catch((e) => setError(e.message))
  useEffect(() => {
    reload()
  }, [])
  return { items, error, reload, setItems }
}

export function useBody() {
  const [body, setBody] = useState(undefined) // undefined = loading, null = none
  const reload = () =>
    db
      .get(STORES.body, 'me')
      .then((row) => setBody(row || null))
      .catch(() => setBody(null))
  useEffect(() => {
    reload()
  }, [])
  return { body, reload, setBody }
}
