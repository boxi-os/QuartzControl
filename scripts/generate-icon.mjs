// Pure-Node (no deps, no external assets), procedural generator for the QuartzControl app icon.
// Renders a macOS-style rounded-square gradient background with a faceted "quartz crystal" glyph,
// supersampled at 2048px and box-filter-downsampled to every size iconutil needs for a .icns, plus
// a couple of flat PNGs used elsewhere (BrowserWindow icon, Dock icon, README/screenshots).
// Re-run with `node scripts/generate-icon.mjs` after changing the glyph/palette below; it
// overwrites build/icon.icns, build/icon.png (1024) and build/icon-256.png. macOS-only (uses
// iconutil to build the .icns) - on other platforms it still writes the flat PNGs.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import zlib from 'zlib'

const MASTER = 2048
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const buildDir = join(root, 'build')
mkdirSync(buildDir, { recursive: true })

function makeImage(size) {
  return { size, data: new Float64Array(size * size * 4) } // premultiplied RGBA, 0..255 scale
}

function setPx(img, x, y, r, g, b, a /* 0..1 */) {
  if (x < 0 || y < 0 || x >= img.size || y >= img.size) return
  const i = (y * img.size + x) * 4
  const existing = img.data
  const srcA = a
  const outA = srcA + (existing[i + 3] / 255) * (1 - srcA)
  existing[i] = r * srcA + existing[i] * (1 - srcA)
  existing[i + 1] = g * srcA + existing[i + 1] * (1 - srcA)
  existing[i + 2] = b * srcA + existing[i + 2] * (1 - srcA)
  existing[i + 3] = outA * 255
}

function roundedRectMask(x, y, w, h, r) {
  const cx = Math.min(Math.max(x, r), w - r)
  const cy = Math.min(Math.max(y, r), h - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function drawBackground(img) {
  const size = img.size
  const margin = size * 0.04
  const w = size - margin * 2
  const h = size - margin * 2
  const radius = w * 0.225
  const c1 = [124, 108, 246] // #7C6CF6 soft violet, top-left
  const c2 = [61, 42, 158] // #3D2A9E deep indigo, bottom-right

  const SS = 3
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let coverage = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS - margin
          const y = py + (sy + 0.5) / SS - margin
          if (roundedRectMask(x, y, w, h, radius)) coverage++
        }
      }
      if (coverage === 0) continue
      const a = coverage / (SS * SS)
      const t = (px + py) / (2 * size)
      const r = lerp(c1[0], c2[0], t)
      const g = lerp(c1[1], c2[1], t)
      const b = lerp(c1[2], c2[2], t)
      setPx(img, px, py, r, g, b, a)
    }
  }
}

function drawGlow(img) {
  const size = img.size
  const cx = size / 2
  const cy = size * 0.52
  const maxR = size * 0.42
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const d = Math.hypot(px - cx, py - cy)
      if (d > maxR) continue
      const t = 1 - d / maxR
      const a = t * 0.22
      setPx(img, px, py, 255, 255, 255, a)
    }
  }
}

function polyBounds(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

function pointInPoly(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function fillPolygon(img, pts, color, alpha = 1) {
  const { minX, minY, maxX, maxY } = polyBounds(pts)
  const x0 = Math.max(0, Math.floor(minX))
  const x1 = Math.min(img.size - 1, Math.ceil(maxX))
  const y0 = Math.max(0, Math.floor(minY))
  const y1 = Math.min(img.size - 1, Math.ceil(maxY))
  const SS = 3
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      let coverage = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS
          const y = py + (sy + 0.5) / SS
          if (pointInPoly(x, y, pts)) coverage++
        }
      }
      if (coverage === 0) continue
      const a = (coverage / (SS * SS)) * alpha
      setPx(img, px, py, color[0], color[1], color[2], a)
    }
  }
}

function strokePolygon(img, pts, color, width, alpha = 1) {
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    strokeLine(img, x1, y1, x2, y2, color, width, alpha)
  }
}

function strokeLine(img, x1, y1, x2, y2, color, width, alpha) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const hw = width / 2
  const quad = [
    [x1 + nx * hw, y1 + ny * hw],
    [x2 + nx * hw, y2 + ny * hw],
    [x2 - nx * hw, y2 - ny * hw],
    [x1 - nx * hw, y1 - ny * hw]
  ]
  fillPolygon(img, quad, color, alpha)
}

// the "quartz crystal" glyph: a faceted hexagonal prism with a pointed top, plus a smaller
// companion crystal for a "cluster" feel, drawn as several polygons with slightly different
// shades to fake lighting.
function drawCrystal(img) {
  const size = img.size
  const cx = size * 0.5
  const topY = size * 0.235
  const shoulderY = size * 0.365
  const bottomY = size * 0.78
  const halfW = size * 0.175
  const midInsetL = size * 0.09
  const midInsetR = size * 0.065

  const silhouette = [
    [cx, topY],
    [cx + halfW, shoulderY],
    [cx + halfW * 0.62, bottomY],
    [cx - halfW * 0.62, bottomY],
    [cx - halfW, shoulderY]
  ]
  for (let i = 6; i >= 1; i--) {
    const off = i * (size * 0.004)
    const shadow = silhouette.map(([x, y]) => [x + off, y + off * 1.3])
    fillPolygon(img, shadow, [20, 12, 60], 0.03)
  }

  fillPolygon(
    img,
    [
      [cx, topY],
      [cx - halfW, shoulderY],
      [cx - halfW * 0.62, bottomY],
      [cx - midInsetL, shoulderY + (bottomY - shoulderY) * 0.5],
      [cx, bottomY * 0.86]
    ],
    [186, 178, 245],
    1
  )
  fillPolygon(
    img,
    [
      [cx, topY],
      [cx + halfW, shoulderY],
      [cx + halfW * 0.62, bottomY],
      [cx, bottomY * 0.86]
    ],
    [223, 218, 250],
    1
  )
  fillPolygon(
    img,
    [
      [cx, topY],
      [cx + midInsetR, shoulderY + (bottomY - shoulderY) * 0.42],
      [cx, bottomY * 0.9],
      [cx - midInsetL, shoulderY + (bottomY - shoulderY) * 0.5]
    ],
    [255, 255, 255],
    1
  )

  const edgeColor = [90, 70, 190]
  const lw = size * 0.006
  strokeLine(img, cx, topY, cx - halfW, shoulderY, edgeColor, lw, 0.55)
  strokeLine(img, cx, topY, cx + halfW, shoulderY, edgeColor, lw, 0.55)
  strokeLine(img, cx - halfW, shoulderY, cx - halfW * 0.62, bottomY, edgeColor, lw, 0.5)
  strokeLine(img, cx + halfW, shoulderY, cx + halfW * 0.62, bottomY, edgeColor, lw, 0.5)
  strokeLine(img, cx - halfW * 0.62, bottomY, cx + halfW * 0.62, bottomY, edgeColor, lw, 0.5)
  strokeLine(img, cx, topY, cx, bottomY * 0.9, edgeColor, lw * 0.8, 0.35)
  strokeLine(img, cx - midInsetL, shoulderY + (bottomY - shoulderY) * 0.5, cx, bottomY * 0.9, edgeColor, lw * 0.8, 0.3)
  strokeLine(img, cx + midInsetR, shoulderY + (bottomY - shoulderY) * 0.42, cx, bottomY * 0.9, edgeColor, lw * 0.8, 0.3)

  const scx = cx - size * 0.215
  const scy = size * 0.62
  const sTop = scy - size * 0.09
  const sBot = scy + size * 0.1
  const sHalf = size * 0.055
  fillPolygon(
    img,
    [
      [scx, sTop],
      [scx - sHalf, scy],
      [scx - sHalf * 0.55, sBot],
      [scx, scy + (sBot - scy) * 0.55]
    ],
    [200, 192, 247],
    0.95
  )
  fillPolygon(
    img,
    [
      [scx, sTop],
      [scx + sHalf, scy],
      [scx + sHalf * 0.55, sBot],
      [scx, scy + (sBot - scy) * 0.55]
    ],
    [236, 232, 253],
    0.95
  )
  strokePolygon(
    img,
    [
      [scx, sTop],
      [scx + sHalf, scy],
      [scx + sHalf * 0.55, sBot],
      [scx, sBot * 1.0],
      [scx - sHalf * 0.55, sBot],
      [scx - sHalf, scy]
    ],
    edgeColor,
    lw * 0.7,
    0.35
  )
}

// box-filter downsample (premultiplied) from `img` (factor divides evenly) to `outSize`
function downsample(img, outSize) {
  const inSize = img.size
  const factor = inSize / outSize
  if (!Number.isInteger(factor)) throw new Error('non-integer factor')
  const out = makeImage(outSize)
  for (let oy = 0; oy < outSize; oy++) {
    for (let ox = 0; ox < outSize; ox++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const ix = ox * factor + sx
          const iy = oy * factor + sy
          const i = (iy * inSize + ix) * 4
          r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; a += img.data[i + 3]
        }
      }
      const n = factor * factor
      const oi = (oy * outSize + ox) * 4
      out.data[oi] = r / n
      out.data[oi + 1] = g / n
      out.data[oi + 2] = b / n
      out.data[oi + 3] = a / n
    }
  }
  return out
}

function clamp8(v) {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function ihdr(w, h) {
  const b = Buffer.alloc(13)
  b.writeUInt32BE(w, 0)
  b.writeUInt32BE(h, 4)
  b[8] = 8 // bit depth
  b[9] = 6 // color type RGBA
  b[10] = 0
  b[11] = 0
  b[12] = 0
  return b
}

let crcTable = null
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function toPngBuffer(img) {
  const size = img.size
  const raw = Buffer.alloc(size * (1 + size * 4))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0 // filter type none
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const a = img.data[i + 3]
      const alpha01 = a / 255
      let r = 0, g = 0, b = 0
      if (alpha01 > 0.0001) {
        r = img.data[i] / alpha01
        g = img.data[i + 1] / alpha01
        b = img.data[i + 2] / alpha01
      }
      raw[o++] = clamp8(r)
      raw[o++] = clamp8(g)
      raw[o++] = clamp8(b)
      raw[o++] = clamp8(a)
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr(size, size)),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

// --- build
const master = makeImage(MASTER)
drawBackground(master)
drawGlow(master)
drawCrystal(master)

const sizes = [16, 32, 64, 128, 256, 512, 1024]
const bySize = new Map()
for (const s of sizes) bySize.set(s, downsample(master, s))

writeFileSync(join(buildDir, 'icon.png'), toPngBuffer(bySize.get(512)))
writeFileSync(join(buildDir, 'icon-256.png'), toPngBuffer(bySize.get(256)))
console.log('wrote build/icon.png, build/icon-256.png')

if (process.platform === 'darwin') {
  const iconsetDir = join(buildDir, 'QuartzControl.iconset')
  if (existsSync(iconsetDir)) rmSync(iconsetDir, { recursive: true })
  mkdirSync(iconsetDir, { recursive: true })

  const iconsetSpecs = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024]
  ]
  for (const [filename, size] of iconsetSpecs) {
    writeFileSync(join(iconsetDir, filename), toPngBuffer(bySize.get(size)))
  }

  execFileSync('iconutil', ['-c', 'icns', '-o', join(buildDir, 'icon.icns'), iconsetDir])
  rmSync(iconsetDir, { recursive: true })
  console.log('wrote build/icon.icns')
} else {
  console.log('skipping .icns (iconutil is macOS-only)')
}
