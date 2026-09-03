// Assembles the app icon from the exported PNGs in build/icon-source/ - it draws nothing itself.
// The artwork is an Affinity Designer document (the .af file is deliberately not versioned, see
// .gitignore; quartzcontrol-icon.svg is the versioned vector copy: a rounded gradient tile with the
// gear-and-crystal glyph embedded in it as a bitmap). Every size from 64 px up is exported from
// that document; 16 and 32 are derived here, see below.
//
// Run `npm run icon` after re-exporting. It overwrites build/icon.icns (the macOS bundle icon),
// build/icon.png (512 px: Linux package icon, BrowserWindow icon, macOS Dock icon),
// build/icon-256.png and src/assets/app-icon.png (the icon the start page shows). All four are
// checked in, and writing them from one command is the only thing that keeps them in sync - the
// renderer copy had been a stale duplicate of the previous icon for two weeks. The .icns step
// shells out to iconutil and is therefore macOS-only; on other platforms the flat PNGs are still
// written. No dependencies, in the same spirit as the generator this replaced.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import zlib from 'zlib'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const buildDir = join(root, 'build')
const sourceDir = join(buildDir, 'icon-source')

// Sizes the vector document is exported to. 16 and 32 are missing on purpose: measured against the
// Affinity exports at those sizes, a linear-light box average of the 1024 with a light unsharp pass
// reads better - the gear teeth stay separate and the crystal stays lighter than the gear instead
// of merging into one grey blob. Above 32 the export wins and is used as-is. Both are still soft;
// at 16 px this artwork is at the edge of what it can carry, and a genuinely legible 16 would mean
// a simplified glyph drawn in the vector document, not a better filter.
const EXPORTED = [64, 128, 256, 512, 1024]
const DERIVED = [16, 32]

const sourceFor = (size) => join(sourceDir, `icon-${size}.png`)

// --- PNG ---------------------------------------------------------------------------------------
// Hand-rolled, like the ZIP reader in electron/main/services/zipArchive.ts: what is needed here is
// one non-interlaced 8-bit RGBA image, which is a page of spec, against a dependency that would
// have to be installed to build an icon.

function decodePng(path) {
  const buf = readFileSync(path)
  let pos = 8
  let width, height, bitDepth, colorType, interlace
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') {
      idat.push(data)
    }
    pos += 12 + len
  }
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`${path}: expected a non-interlaced 8-bit RGBA PNG`)
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const out = Buffer.alloc(height * stride)
  let p = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[p++]
    const line = raw.subarray(p, p + stride)
    p += stride
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prior = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0
      const b = prior ? prior[x] : 0
      const c = prior && x >= 4 ? prior[x - 4] : 0
      let v = line[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const guess = a + b - c
        const pa = Math.abs(guess - a)
        const pb = Math.abs(guess - b)
        const pc = Math.abs(guess - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[x] = v & 255
    }
  }
  return { width, height, data: out }
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

function encodePng({ width, height, data }) {
  const stride = width * 4
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter type none
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

// --- downsampling ------------------------------------------------------------------------------

const toLinear = (v) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const toSrgb = (c) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(v * 255)))
}

// Averaging sRGB values directly darkens every mixed pixel - which is most of them at 16 px, where
// one output pixel covers 64x64 of the master. Averaging in linear light and converting back is
// what keeps the black gear from swallowing the crystal. 1024 divides evenly into both target
// sizes, so the box is exact and no interpolation is needed.
const UNSHARP = 0.5 // measured: 0.35 leaves it soft, 0.75 puts a blue fringe on the crystal at 16

function resample(master, size) {
  const f = master.width / size
  if (!Number.isInteger(f)) throw new Error(`${master.width} does not divide evenly into ${size}`)
  const lin = new Float64Array(master.width * master.height * 4)
  for (let i = 0; i < master.width * master.height; i++) {
    for (let k = 0; k < 3; k++) lin[i * 4 + k] = toLinear(master.data[i * 4 + k])
    lin[i * 4 + 3] = master.data[i * 4 + 3] / 255
  }
  const acc = new Float64Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < f; sy++) {
        for (let sx = 0; sx < f; sx++) {
          const s = ((y * f + sy) * master.width + x * f + sx) * 4
          const alpha = lin[s + 3]
          r += lin[s] * alpha
          g += lin[s + 1] * alpha
          b += lin[s + 2] * alpha
          a += alpha
        }
      }
      const i = (y * size + x) * 4
      acc[i] = a ? r / a : 0
      acc[i + 1] = a ? g / a : 0
      acc[i + 2] = a ? b / a : 0
      acc[i + 3] = a / (f * f)
    }
  }
  const before = Float64Array.from(acc)
  const at = (x, y, k) =>
    before[(Math.max(0, Math.min(size - 1, y)) * size + Math.max(0, Math.min(size - 1, x))) * 4 + k]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      for (let k = 0; k < 3; k++) {
        const blur = (at(x - 1, y, k) + at(x + 1, y, k) + at(x, y - 1, k) + at(x, y + 1, k)) / 4
        const sharpened = at(x, y, k) + UNSHARP * (at(x, y, k) - blur)
        acc[(y * size + x) * 4 + k] = Math.max(0, Math.min(1, sharpened))
      }
    }
  }
  const data = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    for (let k = 0; k < 3; k++) data[i * 4 + k] = toSrgb(acc[i * 4 + k])
    data[i * 4 + 3] = Math.round(acc[i * 4 + 3] * 255)
  }
  return { width: size, height: size, data }
}

// --- assembling ---------------------------------------------------------------------------------

function requireExport(size) {
  const path = sourceFor(size)
  if (!existsSync(path)) throw new Error(`missing export: ${path}`)
  // The IHDR is always the first chunk after the 8-byte signature. An export at the wrong size
  // would otherwise reach iconutil and be refused there by a message that does not name the file.
  const head = readFileSync(path).subarray(0, 24)
  if (head.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`not a PNG: ${path}`)
  const width = head.readUInt32BE(16)
  const height = head.readUInt32BE(20)
  if (width !== size || height !== size) {
    throw new Error(`${path} is ${width}x${height}, expected ${size}x${size}`)
  }
  return path
}

for (const size of EXPORTED) requireExport(size)
const master = decodePng(sourceFor(1024))
const derived = new Map(DERIVED.map((size) => [size, encodePng(resample(master, size))]))

// 512 rather than 1024 for icon.png: the Dock draws at most 256 px and the file travels inside the
// packaged app (see electron-builder.yml `files`). 256 is what the start page and the docs use.
copyFileSync(sourceFor(512), join(buildDir, 'icon.png'))
copyFileSync(sourceFor(256), join(buildDir, 'icon-256.png'))
copyFileSync(sourceFor(256), join(root, 'src/assets/app-icon.png'))
console.log('wrote build/icon.png, build/icon-256.png, src/assets/app-icon.png')

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
    const target = join(iconsetDir, filename)
    if (derived.has(size)) writeFileSync(target, derived.get(size))
    else copyFileSync(sourceFor(size), target)
  }

  execFileSync('iconutil', ['-c', 'icns', '-o', join(buildDir, 'icon.icns'), iconsetDir])
  rmSync(iconsetDir, { recursive: true })
  console.log(`wrote build/icon.icns (${DERIVED.join(' and ')} px downsampled from the 1024)`)
} else {
  console.log('skipping .icns (iconutil is macOS-only)')
}
