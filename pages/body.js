import { useEffect, useRef, useState } from 'react'
import Layout from '@components/Layout'
import SpinViewer from '@components/SpinViewer'
import OutfitAvatar from '@components/OutfitAvatar'
import { db, STORES } from '@lib/db'
import { useBody, useObjectUrls, useWardrobe } from '@lib/hooks'
import { extractVideoFrames, photosToFrames } from '@lib/image'
import { DEFAULT_ZONES } from '@lib/outfits'

const FRAME_COUNT = 24

export default function Body() {
  const { body, setBody } = useBody()
  const { items } = useWardrobe()
  const [pending, setPending] = useState(null) // frames waiting to be saved
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [zones, setZones] = useState(DEFAULT_ZONES)
  const [showGuides, setShowGuides] = useState(true)
  const videoRef = useRef(null)
  const photosRef = useRef(null)

  useEffect(() => {
    if (body && body.zones) setZones({ ...DEFAULT_ZONES, ...body.zones })
  }, [body])

  const savedUrls = useObjectUrls(body ? body.frames : null)
  const pendingUrls = useObjectUrls(pending)

  const fromVideo = async (file) => {
    if (!file) return
    setBusy(true)
    setError(null)
    setProgress(0)
    try {
      const frames = await extractVideoFrames(file, FRAME_COUNT, 720, setProgress)
      setPending(frames)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const fromPhotos = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (files.length < 4) {
      setError('Upload at least 4 photos taken while turning in place (8 or more looks smoother).')
      return
    }
    setBusy(true)
    setError(null)
    try {
      files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      setPending(await photosToFrames(files))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    const record = { id: 'me', frames: pending, zones, createdAt: Date.now() }
    await db.put(STORES.body, record)
    setBody(record)
    setPending(null)
  }

  const saveZones = async () => {
    if (!body) return
    const record = { ...body, zones }
    await db.put(STORES.body, record)
    setBody(record)
  }

  const clear = async () => {
    if (!window.confirm('Delete your 360° capture?')) return
    await db.remove(STORES.body, 'me')
    setBody(null)
  }

  // A sample outfit to preview the fit zones against real garments.
  const sample = items && items.length ? sampleOutfit(items) : null

  return (
    <Layout title="Body">
      <div className="page-head">
        <div>
          <h1>Your 360° body</h1>
          <p className="muted">
            Stand in good light, prop your phone at chest height, and film one slow full turn (about 6 seconds). Or
            upload a series of photos taken as you turn.
          </p>
        </div>
      </div>

      <div className="upload-row">
        <button type="button" className="btn primary big" onClick={() => videoRef.current && videoRef.current.click()} disabled={busy}>
          🎥 {busy ? `Processing ${Math.round(progress * 100)}%` : 'Record / upload a turn video'}
        </button>
        <button type="button" className="btn big" onClick={() => photosRef.current && photosRef.current.click()} disabled={busy}>
          🖼 Upload photo series
        </button>
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          capture="user"
          hidden
          onChange={(e) => {
            fromVideo(e.target.files[0])
            e.target.value = ''
          }}
        />
        <input
          ref={photosRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            fromPhotos(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {error && <div className="card error">{error}</div>}

      {pending && (
        <section className="card">
          <h3>Preview your capture</h3>
          <p className="muted small">Drag to rotate. If the turn looks off, re-record and try again.</p>
          <SpinViewer frames={pendingUrls} autoSpin />
          <div className="row end">
            <button type="button" className="btn ghost" onClick={() => setPending(null)}>
              Discard
            </button>
            <button type="button" className="btn primary" onClick={save}>
              Use this as my body
            </button>
          </div>
        </section>
      )}

      {!pending && body === null && (
        <div className="card empty-state">
          <h3>No capture yet</h3>
          <p className="muted">
            Your 360° body is what outfits get shown on. Tip: wear fitted, plain clothing so garments layer cleanly.
          </p>
        </div>
      )}

      {!pending && body && (
        <>
          <section className="card">
            <div className="row between">
              <h3>Your 360° avatar</h3>
              <button type="button" className="btn small ghost" onClick={clear}>
                Delete
              </button>
            </div>
            {sample ? (
              <OutfitAvatar frames={savedUrls} outfit={sample} zones={zones} showGuides={showGuides} />
            ) : (
              <SpinViewer frames={savedUrls} autoSpin />
            )}
          </section>

          <section className="card">
            <div className="row between">
              <h3>Fit zones</h3>
              <label className="check">
                <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} /> Show guides
              </label>
            </div>
            <p className="muted small">
              Adjust where each garment type sits so clothes land on the right part of your body.
            </p>
            {['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'].map((cat) => (
              <ZoneEditor key={cat} cat={cat} zone={zones[cat]} onChange={(z) => setZones((all) => ({ ...all, [cat]: z }))} />
            ))}
            <div className="row end">
              <button type="button" className="btn ghost" onClick={() => setZones(DEFAULT_ZONES)}>
                Reset
              </button>
              <button type="button" className="btn primary" onClick={saveZones}>
                Save zones
              </button>
            </div>
          </section>
        </>
      )}
    </Layout>
  )
}

function ZoneEditor({ cat, zone, onChange }) {
  const field = (key, min, max) => (
    <label className="range-label small">
      <span>
        {key} <span className="muted">{Math.round(zone[key] * 100)}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={Math.round(zone[key] * 100)}
        onChange={(e) => onChange({ ...zone, [key]: Number(e.target.value) / 100 })}
      />
    </label>
  )
  return (
    <div className="zone-editor">
      <strong>{cat}</strong>
      <div className="zone-fields">
        {field('top', 0, 95)}
        {field('height', 5, 90)}
        {field('width', 10, 90)}
      </div>
    </div>
  )
}

function sampleOutfit(items) {
  const first = (cat) => items.find((i) => i.category === cat)
  const parts = [first('top') || first('dress'), first('bottom'), first('shoes'), first('outerwear'), first('accessory')].filter(Boolean)
  return { id: 'sample-' + parts.map((p) => p.id).join('-'), items: parts }
}
