import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Layout from '@components/Layout'
import OutfitAvatar from '@components/OutfitAvatar'
import GarmentCard from '@components/GarmentCard'
import { db, STORES } from '@lib/db'
import { useBody, useObjectUrls, useWardrobe } from '@lib/hooks'
import { generateOutfits, wardrobeGaps } from '@lib/outfits'

export default function Outfits() {
  const { items } = useWardrobe()
  const { body } = useBody()
  const [seed, setSeed] = useState(1)
  const [outerwear, setOuterwear] = useState('auto')
  const [selectedId, setSelectedId] = useState(null)
  const [saved, setSaved] = useState([])
  const [tab, setTab] = useState('suggested')

  const frames = useObjectUrls(body ? body.frames : null)

  useEffect(() => {
    db.getAll(STORES.outfits).then((rows) => setSaved(rows.sort((a, b) => b.createdAt - a.createdAt))).catch(() => {})
  }, [])

  const suggestions = useMemo(
    () => (items ? generateOutfits(items, { count: 12, seed, includeOuterwear: outerwear }) : []),
    [items, seed, outerwear]
  )

  // Saved outfits only store item ids; hydrate them from the current wardrobe.
  const savedHydrated = useMemo(() => {
    if (!items) return []
    const byId = Object.fromEntries(items.map((i) => [i.id, i]))
    return saved
      .map((o) => ({ ...o, items: o.itemIds.map((id) => byId[id]).filter(Boolean) }))
      .filter((o) => o.items.length > 0)
  }, [saved, items])

  const list = tab === 'suggested' ? suggestions : savedHydrated
  const selected = list.find((o) => o.id === selectedId) || list[0] || null
  const isSaved = (o) => saved.some((s) => s.key === o.id)

  const toggleSave = async (o) => {
    const existing = saved.find((s) => s.key === o.id)
    if (existing) {
      await db.remove(STORES.outfits, existing.id)
      setSaved((s) => s.filter((x) => x.id !== existing.id))
    } else {
      const row = { id: 'o' + Date.now().toString(36), key: o.id, itemIds: o.items.map((i) => i.id), note: o.note, createdAt: Date.now() }
      await db.put(STORES.outfits, row)
      setSaved((s) => [row, ...s])
    }
  }

  const gaps = items ? wardrobeGaps(items) : []

  return (
    <Layout title="Outfits" wide>
      <div className="page-head">
        <div>
          <h1>Outfit combinations</h1>
          <p className="muted">Colour-matched looks built from your wardrobe, previewed on your 360° body.</p>
        </div>
        <div className="row">
          <select value={outerwear} onChange={(e) => setOuterwear(e.target.value)} aria-label="Outerwear">
            <option value="auto">Outerwear: sometimes</option>
            <option value="always">Outerwear: always</option>
            <option value="never">Outerwear: never</option>
          </select>
          <button type="button" className="btn primary" onClick={() => setSeed((s) => s + 1)}>
            🔀 Shuffle
          </button>
        </div>
      </div>

      {items && gaps.length > 0 && (
        <div className="card note">
          For complete outfits you still need {gaps.join(', ')}.{' '}
          <Link href="/scan" className="link">
            Scan more →
          </Link>
        </div>
      )}
      {body === null && (
        <div className="card note">
          No 360° body yet, so outfits show as flat lays.{' '}
          <Link href="/body" className="link">
            Capture your body →
          </Link>
        </div>
      )}

      <div className="chips">
        <button type="button" className={`chip ${tab === 'suggested' ? 'on' : ''}`} onClick={() => setTab('suggested')}>
          Suggested {suggestions.length}
        </button>
        <button type="button" className={`chip ${tab === 'saved' ? 'on' : ''}`} onClick={() => setTab('saved')}>
          ♥ Saved {savedHydrated.length}
        </button>
      </div>

      {items && items.length === 0 && (
        <div className="card empty-state">
          <h3>Your wardrobe is empty</h3>
          <Link href="/scan" className="btn primary">
            Scan clothes
          </Link>
        </div>
      )}

      {list.length > 0 && (
        <div className="outfit-layout">
          <section className="card avatar-panel">
            {body ? (
              <OutfitAvatar frames={frames} outfit={selected} zones={body.zones} />
            ) : (
              <FlatLay outfit={selected} />
            )}
            {selected && (
              <div className="outfit-summary">
                <div>
                  <strong>{selected.note}</strong>
                  <div className="muted small">{selected.items.map((i) => i.name).join(' · ')}</div>
                </div>
                <button type="button" className={`btn ${isSaved(selected) ? '' : 'ghost'}`} onClick={() => toggleSave(selected)}>
                  {isSaved(selected) ? '♥ Saved' : '♡ Save'}
                </button>
              </div>
            )}
          </section>

          <section className="outfit-list">
            {list.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`outfit-card card ${selected && selected.id === o.id ? 'on' : ''}`}
                onClick={() => setSelectedId(o.id)}
              >
                <div className="outfit-thumbs">
                  {o.items.map((i) => (
                    <GarmentCard key={i.id} item={i} compact />
                  ))}
                </div>
                <div className="outfit-card-meta">
                  <span className="small">{o.note}</span>
                  <span className="palette">
                    {o.items.map((i) => (
                      <i key={i.id} style={{ background: i.color }} />
                    ))}
                  </span>
                </div>
              </button>
            ))}
          </section>
        </div>
      )}
      {tab === 'saved' && items && savedHydrated.length === 0 && (
        <div className="card empty-state">
          <h3>No saved outfits</h3>
          <p className="muted">Tap ♡ Save on a look you like.</p>
        </div>
      )}
    </Layout>
  )
}

function FlatLay({ outfit }) {
  if (!outfit) return null
  return (
    <div className="flatlay">
      {outfit.items.map((i) => (
        <GarmentCard key={i.id} item={i} compact />
      ))}
    </div>
  )
}
