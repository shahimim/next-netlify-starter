// Client-side image processing: background removal, cropping, dominant colour
// extraction and frame extraction from a spin video. No server round-trips.

import { rgbToHex } from './color'

const MAX_EDGE = 1000

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

export function imageToCanvas(img, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
  const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale))
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  return canvas
}

export function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), type, quality)
  })
}

// Estimate the background colour by sampling the border of the photo.
function estimateBackground(data, w, h) {
  const samples = []
  const step = Math.max(1, Math.floor(Math.max(w, h) / 120))
  const push = (x, y) => {
    const i = (y * w + x) * 4
    samples.push([data[i], data[i + 1], data[i + 2]])
  }
  for (let x = 0; x < w; x += step) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y += step) {
    push(0, y)
    push(w - 1, y)
  }
  // Median per channel is robust against a hand or shadow in one corner.
  const median = (idx) => {
    const arr = samples.map((s) => s[idx]).sort((a, b) => a - b)
    return arr[Math.floor(arr.length / 2)]
  }
  return [median(0), median(1), median(2)]
}

/**
 * Removes a (roughly uniform) background by flood-filling from the edges.
 * Pixels connected to the border and close to the background colour become
 * transparent. `tolerance` is 0-100.
 */
export function removeBackground(canvas, tolerance = 32) {
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const bg = estimateBackground(data, w, h)
  const maxDist = (tolerance / 100) * 441.67 // max euclidean distance in RGB

  const visited = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let head = 0
  let tail = 0

  const close = (i) => {
    const dr = data[i * 4] - bg[0]
    const dg = data[i * 4 + 1] - bg[1]
    const db = data[i * 4 + 2] - bg[2]
    return Math.sqrt(dr * dr + dg * dg + db * db) <= maxDist
  }
  const seed = (i) => {
    if (!visited[i] && close(i)) {
      visited[i] = 1
      queue[tail++] = i
    }
  }
  for (let x = 0; x < w; x++) {
    seed(x)
    seed((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    seed(y * w)
    seed(y * w + w - 1)
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    const y = (i - x) / w
    if (x > 0) seed(i - 1)
    if (x < w - 1) seed(i + 1)
    if (y > 0) seed(i - w)
    if (y < h - 1) seed(i + w)
  }

  // Soft edge: fully clear the background, partially fade the 1px rim.
  for (let i = 0; i < w * h; i++) {
    if (visited[i]) data[i * 4 + 3] = 0
  }
  for (let i = 0; i < w * h; i++) {
    if (visited[i]) continue
    const x = i % w
    const y = (i - x) / w
    const touching =
      (x > 0 && visited[i - 1]) || (x < w - 1 && visited[i + 1]) || (y > 0 && visited[i - w]) || (y < h - 1 && visited[i + w])
    if (touching) data[i * 4 + 3] = Math.min(data[i * 4 + 3], 150)
  }
  ctx.putImageData(imageData, 0, 0)
  let removed = 0
  for (let i = 0; i < w * h; i++) removed += visited[i]
  return { background: rgbToHex(bg[0], bg[1], bg[2]), keptFraction: 1 - removed / (w * h) }
}

function cloneCanvas(src) {
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  c.getContext('2d').drawImage(src, 0, 0)
  return c
}

// Crop to the bounding box of non-transparent pixels with a small margin.
export function cropToContent(canvas, marginRatio = 0.04) {
  const w = canvas.width
  const h = canvas.height
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return canvas // nothing left, keep original
  const margin = Math.round(Math.max(w, h) * marginRatio)
  minX = Math.max(0, minX - margin)
  minY = Math.max(0, minY - margin)
  maxX = Math.min(w - 1, maxX + margin)
  maxY = Math.min(h - 1, maxY + margin)
  const out = document.createElement('canvas')
  out.width = maxX - minX + 1
  out.height = maxY - minY + 1
  out.getContext('2d').drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

// Most common colour among opaque pixels, after coarse quantisation.
export function dominantColor(canvas) {
  const w = canvas.width
  const h = canvas.height
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data
  const bins = new Map()
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 20000)))
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      if (data[i + 3] < 200) continue
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4)
      const b = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 }
      b.n++
      b.r += data[i]
      b.g += data[i + 1]
      b.b += data[i + 2]
      bins.set(key, b)
    }
  }
  let best = null
  bins.forEach((b) => {
    if (!best || b.n > best.n) best = b
  })
  if (!best) return '#888888'
  return rgbToHex(best.r / best.n, best.g / best.n, best.b / best.n)
}

// If the cut-out leaves less than this share of the photo, it ate the garment.
const MIN_KEPT = 0.03

/**
 * Full garment pipeline: downscale, remove background, crop, pick colour.
 * When the cut-out swallows the garment (light clothes on a light backdrop)
 * the tolerance is halved and retried; if that still fails the original
 * photo is kept and `bgFailed` is set so the UI can explain.
 * Returns { blob, color, width, height, bgFailed, toleranceUsed }.
 */
export async function processGarmentPhoto(file, { tolerance = 24, removeBg = true } = {}) {
  const img = await fileToImage(file)
  const original = imageToCanvas(img)
  let canvas = original
  let bgFailed = false
  let toleranceUsed = null
  if (removeBg) {
    let t = tolerance
    bgFailed = true
    for (let attempt = 0; attempt < 3 && t >= 3; attempt++) {
      const work = cloneCanvas(original)
      const { keptFraction } = removeBackground(work, t)
      if (keptFraction >= MIN_KEPT) {
        canvas = cropToContent(work)
        toleranceUsed = t
        bgFailed = false
        break
      }
      t = Math.round(t / 2)
    }
  }
  const color = dominantColor(canvas)
  const blob = await canvasToBlob(canvas, 'image/png')
  return { blob, color, width: canvas.width, height: canvas.height, bgFailed, toleranceUsed }
}

// Guess the garment category from its silhouette. Only a hint; user can fix it.
export function guessCategory(width, height) {
  const ratio = width / height
  if (ratio > 1.35) return 'shoes'
  if (ratio < 0.55) return 'bottom'
  if (ratio < 0.72) return 'dress'
  return 'top'
}

/**
 * Pull evenly spaced frames out of a video (a slow turn in front of the
 * camera). Returns an array of JPEG Blobs ordered by time.
 */
export function extractVideoFrames(file, count = 24, maxEdge = 720, onProgress) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    const frames = []
    let canvas
    let ctx

    const fail = (msg) => {
      URL.revokeObjectURL(url)
      reject(new Error(msg))
    }

    video.onerror = () => fail('Could not decode this video. Try a short MP4 or MOV.')
    video.onloadedmetadata = () => {
      const duration = video.duration
      if (!isFinite(duration) || duration <= 0) return fail('Video has no duration')
      const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight))
      canvas = document.createElement('canvas')
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      ctx = canvas.getContext('2d')
      let i = 0
      const next = () => {
        if (i >= count) {
          URL.revokeObjectURL(url)
          resolve(frames)
          return
        }
        // Avoid the very last ms of the clip, which some browsers refuse to seek to.
        video.currentTime = Math.min(duration - 0.05, (duration * i) / count + 0.02)
      }
      video.onseeked = async () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        try {
          frames.push(await canvasToBlob(canvas, 'image/jpeg', 0.85))
        } catch (e) {
          return fail(e.message)
        }
        i++
        if (onProgress) onProgress(i / count)
        next()
      }
      next()
    }
  })
}

// Normalise a set of photos (already in rotation order) to equally sized frames.
export async function photosToFrames(files, maxEdge = 720) {
  const frames = []
  for (const file of files) {
    const img = await fileToImage(file)
    const canvas = imageToCanvas(img, maxEdge)
    frames.push(await canvasToBlob(canvas, 'image/jpeg', 0.85))
  }
  return frames
}
