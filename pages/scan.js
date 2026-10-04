import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@components/Layout'
import { db, STORES, uid } from '@lib/db'
import { describeColor } from '@lib/color'
import { guessCategory, processGarmentPhoto } from '@lib/image'
import { CATEGORIES } from '@lib/outfits'

// A photo that has been processed but not yet saved to the wardrobe.
function makeDraft(file) {
  return {
    key: uid('d'),
    file,
    status: 'processing',
    tolerance: 24,
    removeBg: true,
    result: null,
    url: null,
    name: '',
    category: 'top',
    error: null,
  }
}

export default function Scan() {
  const router = useRouter()
  const [drafts, setDrafts] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const cameraRef = useRef(null)
  const fileRef = useRef(null)

  // Revoke preview URLs when leaving the page.
  useEffect(() => () => drafts.forEach((d) => d.url && URL.revokeObjectURL(d.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key, patch) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...(typeof patch === 'function' ? patch(d) : patch) } : d)))

  const process = async (draft) => {
    update(draft.key, { status: 'processing', error: null })
    try {
      const result = await processGarmentPhoto(draft.file, { tolerance: draft.tolerance, removeBg: draft.removeBg })
      const url = URL.createObjectURL(result.blob)
      update(draft.key, (d) => {
        if (d.url) URL.revokeObjectURL(d.url)
        const category = d.name ? d.category : guessCategory(result.width, result.height)
        const name = d.name || `${capitalize(describeColor(result.color))} ${labelFor(category).toLowerCase()}`
        return { status: 'ready', result, url, category, name }
      })
    } catch (e) {
      update(draft.key, { status: 'error', error: e.message })
    }
  }

  const onFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    const fresh = files.map(makeDraft)
    setDrafts((ds) => [...fresh, ...ds])
    fresh.forEach(process)
  }

  const remove = (key) =>
    setDrafts((ds) => {
      const d = ds.find((x) => x.key === key)
      if (d && d.url) URL.revokeObjectURL(d.url)
      return ds.filter((x) => x.key !== key)
    })

  const saveAll = async () => {
    const ready = drafts.filter((d) => d.status === 'ready')
    if (!ready.length) return
    setSaving(true)
    try {
      const rows = ready.map((d) => ({
        id: uid('g'),
        name: d.name.trim() || 'Untitled',
        category: d.category,
        color: d.result.color,
        width: d.result.width,
        height: d.result.height,
        blob: d.result.blob,
        favorite: false,
        createdAt: Date.now(),
      }))
      await db.putMany(STORES.items, rows)
      ready.forEach((d) => d.url && URL.revokeObjectURL(d.url))
      setDrafts((ds) => ds.filter((d) => d.status !== 'ready'))
      setSavedCount((c) => c + rows.length)
    } finally {
      setSaving(false)
    }
  }

  const readyCount = drafts.filter((d) => d.status === 'ready').length

  return (
    <Layout title="Scan">
      <div className="page-head">
        <div>
          <h1>Scan your wardrobe</h1>
          <p className="muted">
            Lay each garment flat on a plain background that contrasts with it (dark clothes on light, light clothes on
            dark). Even light gives the cleanest cut-out.
          </p>
        </div>
      </div>

      <div className="upload-row">
        <button type="button" className="btn primary big" onClick={() => cameraRef.current && cameraRef.current.click()}>
          📷 Take photo
        </button>
        <button type="button" className="btn big" onClick={() => fileRef.current && fileRef.current.click()}>
          🖼 Upload photos
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onFiles(e.dataTransfer.files)
        }}
      >
        Drop garment photos here
      </div>

      {savedCount > 0 && drafts.length === 0 && (
        <div className="card success">
          Saved {savedCount} item{savedCount === 1 ? '' : 's'} to your wardrobe.{' '}
          <button type="button" className="link" onClick={() => router.push('/wardrobe')}>
            View wardrobe →
          </button>
        </div>
      )}

      {drafts.length > 0 && (
        <>
          <div className="sticky-actions">
            <span className="muted">
              {readyCount} of {drafts.length} ready
            </span>
            <button type="button" className="btn primary" disabled={!readyCount || saving} onClick={saveAll}>
              {saving ? 'Saving…' : `Add ${readyCount} to wardrobe`}
            </button>
          </div>
          <div className="draft-grid">
            {drafts.map((d) => (
              <DraftCard key={d.key} draft={d} onChange={(patch) => update(d.key, patch)} onReprocess={() => process(d)} onRemove={() => remove(d.key)} />
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}

function DraftCard({ draft, onChange, onReprocess, onRemove }) {
  const [tolerance, setTolerance] = useState(draft.tolerance)
  return (
    <div className="card draft">
      <div className="draft-preview checker">
        {draft.status === 'processing' && <div className="spinner" />}
        {draft.url && <img src={draft.url} alt="" />}
        {draft.status === 'error' && <div className="error">{draft.error}</div>}
        {draft.result && <span className="swatch" style={{ background: draft.result.color }} />}
      </div>
      <div className="draft-fields">
        {draft.result && draft.result.bgFailed && (
          <p className="small warn">
            Couldn&apos;t separate this piece from its background, so the full photo was kept. Try a contrasting
            backdrop, or lower the cut-out strength and re-process.
          </p>
        )}
        {draft.result && !draft.result.bgFailed && draft.result.toleranceUsed !== null && draft.result.toleranceUsed !== draft.tolerance && (
          <p className="small muted">Cut-out strength was reduced to {draft.result.toleranceUsed} to keep the garment.</p>
        )}
        <label>
          Name
          <input value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Navy linen shirt" />
        </label>
        <label>
          Category
          <select value={draft.category} onChange={(e) => onChange({ category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="range-label">
          <span>
            Background cut-out <span className="muted small">{tolerance}</span>
          </span>
          <input
            type="range"
            min="5"
            max="80"
            value={tolerance}
            disabled={!draft.removeBg}
            onChange={(e) => setTolerance(Number(e.target.value))}
            onMouseUp={() => {
              onChange({ tolerance })
              setTimeout(onReprocess, 0)
            }}
            onTouchEnd={() => {
              onChange({ tolerance })
              setTimeout(onReprocess, 0)
            }}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.removeBg}
            onChange={(e) => {
              onChange({ removeBg: e.target.checked })
              setTimeout(onReprocess, 0)
            }}
          />
          Remove background
        </label>
        <div className="row">
          <button type="button" className="btn small" onClick={onReprocess} disabled={draft.status === 'processing'}>
            Re-process
          </button>
          <button type="button" className="btn small ghost" onClick={onRemove}>
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}

function labelFor(cat) {
  const c = CATEGORIES.find((x) => x.id === cat)
  return c ? c.label : cat
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
