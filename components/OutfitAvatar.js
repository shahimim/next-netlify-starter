import { useEffect, useState } from 'react'
import SpinViewer from './SpinViewer'
import { DEFAULT_ZONES, OUTFIT_ORDER } from '@lib/outfits'

/**
 * Shows the user's 360 body with the selected outfit's garments laid on top.
 * Garment overlays follow the rotation: full width when facing the camera,
 * squeezed and faded as the body turns away.
 */
export default function OutfitAvatar({ frames, outfit, zones, showGuides = false }) {
  const z = { ...DEFAULT_ZONES, ...(zones || {}) }
  const [urls, setUrls] = useState({})

  const items = outfit ? outfit.items : []
  useEffect(() => {
    const created = {}
    items.forEach((it) => {
      if (it.blob) created[it.id] = URL.createObjectURL(it.blob)
    })
    setUrls(created)
    return () => Object.values(created).forEach((u) => URL.revokeObjectURL(u))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfit && outfit.id])

  const renderOverlay = (angle) => {
    const rad = (angle * Math.PI) / 180
    const facing = Math.cos(rad) // 1 = front, -1 = back
    const squeeze = Math.max(0.18, Math.abs(facing))
    const opacity = facing > -0.2 ? 0.96 : 0.55
    const sorted = [...items].sort((a, b) => OUTFIT_ORDER.indexOf(a.category) - OUTFIT_ORDER.indexOf(b.category))
    return (
      <>
        {showGuides &&
          Object.entries(z).map(([cat, zone]) => (
            <div
              key={cat}
              className="zone-guide"
              style={{
                top: `${zone.top * 100}%`,
                height: `${zone.height * 100}%`,
                width: `${zone.width * 100}%`,
                left: `${50 - (zone.width * 100) / 2}%`,
              }}
            >
              <span>{cat}</span>
            </div>
          ))}
        {sorted.map((it) => {
          const zone = z[it.category] || z.top
          const src = urls[it.id]
          if (!src) return null
          return (
            <img
              key={it.id}
              src={src}
              alt={it.name}
              className="garment-overlay"
              style={{
                top: `${zone.top * 100}%`,
                height: `${zone.height * 100}%`,
                width: `${zone.width * 100}%`,
                left: `${50 - (zone.width * 100) / 2}%`,
                transform: `scaleX(${squeeze})`,
                opacity,
              }}
            />
          )
        })}
      </>
    )
  }

  return <SpinViewer frames={frames} renderOverlay={renderOverlay} autoSpin={false} />
}
