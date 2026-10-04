import { useEffect, useRef, useState } from 'react'

/**
 * 360° turntable viewer. Drag (or swipe) to rotate through `frames` (image
 * URLs captured while turning in place). `renderOverlay(angle)` can draw
 * content on top, e.g. garments laid over the body.
 */
export default function SpinViewer({ frames, autoSpin = false, renderOverlay, className = '', aspect = 3 / 4 }) {
  const [angle, setAngle] = useState(0) // 0..360
  const [dragging, setDragging] = useState(false)
  const [spinning, setSpinning] = useState(autoSpin)
  const drag = useRef(null)
  const box = useRef(null)

  const n = frames ? frames.length : 0
  const index = n ? Math.floor((((angle % 360) + 360) % 360) / 360 * n) % n : 0

  useEffect(() => {
    if (!spinning || dragging || n < 2) return undefined
    let raf
    let last = performance.now()
    const tick = (t) => {
      const dt = t - last
      last = t
      setAngle((a) => (a + dt * 0.04) % 360)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [spinning, dragging, n])

  const start = (x) => {
    drag.current = { x, angle }
    setDragging(true)
  }
  const move = (x) => {
    if (!drag.current || !box.current) return
    const width = box.current.clientWidth || 300
    const delta = ((x - drag.current.x) / width) * 360
    setAngle((drag.current.angle + delta + 360) % 360)
  }
  const end = () => {
    drag.current = null
    setDragging(false)
  }

  if (!n) {
    return (
      <div className={`spin empty ${className}`} style={{ aspectRatio: `${aspect}` }}>
        <div className="spin-placeholder">No body capture yet</div>
      </div>
    )
  }

  return (
    <div className={`spin ${dragging ? 'dragging' : ''} ${className}`}>
      <div
        ref={box}
        className="spin-stage"
        style={{ aspectRatio: `${aspect}` }}
        onMouseDown={(e) => start(e.clientX)}
        onMouseMove={(e) => move(e.clientX)}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => start(e.touches[0].clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
        onTouchEnd={end}
      >
        {/* Preload all frames; show only the current one for instant switching. */}
        {frames.map((src, i) => (
          <img key={i} src={src} alt="" draggable={false} className={`spin-frame ${i === index ? 'on' : ''}`} />
        ))}
        {renderOverlay ? <div className="spin-overlay">{renderOverlay(angle)}</div> : null}
      </div>
      <div className="spin-controls">
        <button type="button" className="chip" onClick={() => setSpinning((s) => !s)}>
          {spinning ? '⏸ Pause' : '▶ Spin'}
        </button>
        <input
          type="range"
          min="0"
          max="359"
          value={Math.round(angle)}
          onChange={(e) => {
            setSpinning(false)
            setAngle(Number(e.target.value))
          }}
          aria-label="Rotate"
        />
        <span className="muted small">{Math.round(angle)}°</span>
      </div>
    </div>
  )
}
