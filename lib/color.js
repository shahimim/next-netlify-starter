// Colour helpers used for garment tagging and outfit scoring.

export function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
  }
  return { h, s, l }
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHsl(r, g, b)
}

// A colour is "neutral" when it has little saturation or is very dark / light.
export function isNeutral(hex) {
  const { s, l } = hexToHsl(hex)
  return s < 0.18 || l < 0.14 || l > 0.9
}

export function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// Human friendly name for a hex colour, used as the default garment label.
export function describeColor(hex) {
  const { h, s, l } = hexToHsl(hex)
  if (l < 0.12) return 'black'
  if (l > 0.92 && s < 0.2) return 'white'
  if (s < 0.12) return l < 0.35 ? 'charcoal' : l < 0.65 ? 'grey' : 'light grey'
  if (s < 0.45 && l > 0.6 && h > 20 && h < 70) return 'beige'
  if (s < 0.35 && l < 0.4) return h > 15 && h < 55 ? 'brown' : 'dark ' + hueName(h)
  if (l > 0.78) return 'pastel ' + hueName(h)
  return hueName(h)
}

function hueName(h) {
  if (h < 12 || h >= 345) return 'red'
  if (h < 38) return 'orange'
  if (h < 65) return 'yellow'
  if (h < 160) return 'green'
  if (h < 200) return 'teal'
  if (h < 255) return 'blue'
  if (h < 290) return 'purple'
  return 'pink'
}
