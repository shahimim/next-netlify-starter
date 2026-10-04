import { useState } from 'react'
import Link from 'next/link'
import Layout from '@components/Layout'
import GarmentCard from '@components/GarmentCard'
import { db, STORES } from '@lib/db'
import { useWardrobe } from '@lib/hooks'
import { CATEGORIES } from '@lib/outfits'

export default function Wardrobe() {
  const { items, error, setItems } = useWardrobe()
  const [filter, setFilter] = useState('all')

  const onDelete = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from your wardrobe?`)) return
    await db.remove(STORES.items, item.id)
    setItems((list) => list.filter((i) => i.id !== item.id))
  }
  const onToggleFavorite = async (item) => {
    const next = { ...item, favorite: !item.favorite }
    await db.put(STORES.items, next)
    setItems((list) => list.map((i) => (i.id === item.id ? next : i)))
  }

  const visible = items ? (filter === 'all' ? items : items.filter((i) => i.category === filter)) : []
  const counts = {}
  ;(items || []).forEach((i) => (counts[i.category] = (counts[i.category] || 0) + 1))

  return (
    <Layout title="Wardrobe" wide>
      <div className="page-head">
        <div>
          <h1>Your wardrobe</h1>
          <p className="muted">{items ? `${items.length} piece${items.length === 1 ? '' : 's'}` : 'Loading…'}</p>
        </div>
        <Link href="/scan" className="btn primary">
          + Add
        </Link>
      </div>

      {error && <div className="card error">{error}</div>}

      <div className="chips">
        <button type="button" className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          All {items ? items.length : ''}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${filter === c.id ? 'on' : ''}`}
            onClick={() => setFilter(c.id)}
            disabled={!counts[c.id]}
          >
            {c.emoji} {c.label} {counts[c.id] || ''}
          </button>
        ))}
      </div>

      {items && items.length === 0 && (
        <div className="card empty-state">
          <h3>Nothing here yet</h3>
          <p className="muted">Scan a few tops, bottoms and shoes to unlock outfit combinations.</p>
          <Link href="/scan" className="btn primary">
            Scan your first piece
          </Link>
        </div>
      )}

      <div className="garment-grid">
        {visible.map((item) => (
          <GarmentCard key={item.id} item={item} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
        ))}
      </div>
    </Layout>
  )
}
