// Outfit combination engine. Works purely from garment metadata (category and
// dominant colour) so it runs instantly on-device.

import { hexToHsl, hueDistance, isNeutral } from './color'

export const CATEGORIES = [
  { id: 'top', label: 'Top', emoji: '👕' },
  { id: 'bottom', label: 'Bottom', emoji: '👖' },
  { id: 'dress', label: 'Dress', emoji: '👗' },
  { id: 'outerwear', label: 'Outerwear', emoji: '🧥' },
  { id: 'shoes', label: 'Shoes', emoji: '👟' },
  { id: 'accessory', label: 'Accessory', emoji: '🧢' },
]

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]))

// Where each category sits on the body, as fractions of the avatar's height /
// width. Users can tune these on the Body page.
export const DEFAULT_ZONES = {
  top: { top: 0.17, height: 0.34, width: 0.46 },
  dress: { top: 0.17, height: 0.62, width: 0.46 },
  outerwear: { top: 0.15, height: 0.4, width: 0.56 },
  bottom: { top: 0.47, height: 0.42, width: 0.38 },
  shoes: { top: 0.88, height: 0.11, width: 0.3 },
  accessory: { top: 0.02, height: 0.14, width: 0.24 },
}

export const OUTFIT_ORDER = ['shoes', 'bottom', 'dress', 'top', 'outerwear', 'accessory']

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)]
}

// Score colour harmony of a set of hex colours, 0..1 (higher is better).
export function colorHarmony(colors) {
  const chromatic = colors.filter((c) => !isNeutral(c)).map((c) => hexToHsl(c))
  const neutrals = colors.length - chromatic.length
  if (chromatic.length <= 1) return 0.9 + Math.min(0.1, neutrals * 0.03) // neutrals + one accent always works
  let score = 0
  let pairs = 0
  for (let i = 0; i < chromatic.length; i++) {
    for (let j = i + 1; j < chromatic.length; j++) {
      const d = hueDistance(chromatic[i].h, chromatic[j].h)
      let s
      if (d < 25) s = 0.85 // monochrome / tonal
      else if (d < 60) s = 0.75 // analogous
      else if (d > 150) s = 0.8 // complementary
      else if (d > 100 && d < 140) s = 0.65 // triadic-ish
      else s = 0.35 // awkward clash
      score += s
      pairs++
    }
  }
  const base = pairs ? score / pairs : 0.8
  // Too many strong colours at once is hard to pull off.
  const penalty = Math.max(0, chromatic.length - 2) * 0.12
  return Math.max(0.05, Math.min(1, base - penalty))
}

function describeHarmony(colors) {
  const chromatic = colors.filter((c) => !isNeutral(c))
  if (chromatic.length === 0) return 'All neutrals'
  if (chromatic.length === 1) return 'Neutrals with one accent'
  const hues = chromatic.map((c) => hexToHsl(c).h)
  const d = hueDistance(hues[0], hues[1])
  if (d < 25) return 'Tonal palette'
  if (d < 60) return 'Analogous colours'
  if (d > 150) return 'Complementary contrast'
  return 'Bold colour mix'
}

/**
 * Generate ranked outfit combinations.
 * @param items wardrobe items ({ id, category, color, ... })
 * @param options { count, seed, includeOuterwear: 'auto'|'always'|'never', includeAccessory }
 */
export function generateOutfits(items, options = {}) {
  const { count = 12, seed = Date.now(), includeOuterwear = 'auto', includeAccessory = 'auto' } = options
  const rnd = mulberry32(seed)
  const by = {}
  CATEGORIES.forEach((c) => (by[c.id] = []))
  items.forEach((it) => {
    if (by[it.category]) by[it.category].push(it)
  })

  const bases = []
  by.top.forEach((t) => by.bottom.forEach((b) => bases.push([t, b])))
  by.dress.forEach((d) => bases.push([d]))
  if (bases.length === 0) {
    // Not enough for a full outfit yet: show whatever single pieces exist.
    ;[...by.top, ...by.bottom].forEach((x) => bases.push([x]))
  }
  if (bases.length === 0) return []

  // Sample a manageable set of candidate outfits.
  const attempts = Math.min(600, Math.max(count * 8, bases.length * 3))
  const seen = new Set()
  const candidates = []
  for (let a = 0; a < attempts; a++) {
    const base = bases.length <= attempts ? bases[a % bases.length] : pick(bases, rnd)
    const parts = [...base]
    if (by.shoes.length) parts.push(pick(by.shoes, rnd))
    const wantOuter = includeOuterwear === 'always' || (includeOuterwear === 'auto' && rnd() < 0.45)
    if (wantOuter && by.outerwear.length) parts.push(pick(by.outerwear, rnd))
    const wantAcc = includeAccessory === 'always' || (includeAccessory === 'auto' && rnd() < 0.4)
    if (wantAcc && by.accessory.length) parts.push(pick(by.accessory, rnd))

    const key = parts
      .map((p) => p.id)
      .sort()
      .join('|')
    if (seen.has(key)) continue
    seen.add(key)

    const colors = parts.map((p) => p.color)
    const harmony = colorHarmony(colors)
    const favBoost = parts.filter((p) => p.favorite).length * 0.03
    const completeness = parts.length >= 3 ? 0.1 : 0
    const noise = rnd() * 0.08 // keep things fresh between shuffles
    const score = harmony + favBoost + completeness + noise
    candidates.push({
      id: key,
      items: parts.sort((x, y) => OUTFIT_ORDER.indexOf(x.category) - OUTFIT_ORDER.indexOf(y.category)),
      score,
      harmony,
      note: describeHarmony(colors),
    })
  }
  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, count)
}

// What is still missing before full outfits can be generated.
export function wardrobeGaps(items) {
  const has = (cat) => items.some((i) => i.category === cat)
  const gaps = []
  if (!has('top') && !has('dress')) gaps.push('a top or a dress')
  if (!has('bottom') && !has('dress')) gaps.push('a bottom')
  if (!has('shoes')) gaps.push('a pair of shoes')
  return gaps
}
