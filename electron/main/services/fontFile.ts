import { brotliDecompressSync, inflateSync } from 'zlib'

// What a font file itself says about the cut it contains, so the generated @font-face does not
// have to guess and the user does not have to know.
//
// Hand-rolled, like the ZIP reader in zipArchive.ts and the PNG writer that used to live in
// build-icon.mjs: what is needed here is three numbers out of two tables, against a dependency
// (opentype.js, fontkit) that would be pulled in to read them. Everything below is the parts of
// the sfnt, WOFF and WOFF2 specs those three numbers touch, and nothing else.
//
// Every failure ends at `null`, never at a throw: a font this cannot read is still a font the
// browser can use, and importing it must not stop at a parse error. The caller then writes the
// rule it always wrote.

export interface FontFace {
  /** `400`, or `400 700` for the range of a variable font's wght axis. */
  weight: string
  /** Set only when the file says so; an upright font gets no declaration at all. */
  italic: boolean
}

// The 63 tags WOFF2 refers to by index instead of by name (spec, "Known Table Tags"). The order is
// the encoding, so this array may not be sorted or deduplicated.
const WOFF2_KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca',
  'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea',
  'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
  'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill'
]

// Decompression needs a ceiling, and the file's own numbers are not one: a WOFF2 says how long
// its tables are and a WOFF says how long each table was, and both numbers are written by whoever
// wrote the file. Measured before this was passed: an 863-byte WOFF2 whose brotli stream is 512
// MiB of zeroes took the main process from 72 to 1103 MiB of RSS and 879 ms, a ratio of about
// 620000:1, so a 7-KB file reaches 4 GiB - past which this does not end at `null` but at a killed
// main process, taking every window and the connection to the running dev servers with it. With
// the limit the same input throws ERR_BUFFER_TOO_LARGE after 7 ms, into the catch that was always
// there. The file's own length is used where it is smaller, because a file that lies low costs
// nothing to believe; the ceiling is what a browser would ever load as one face.
const MAX_TABLE_BYTES = 64 * 1024 * 1024

/** The largest font file worth reading: past this the parse is skipped, not attempted. */
export const MAX_FONT_FILE_BYTES = MAX_TABLE_BYTES

/** WOFF2's variable-length integer: seven bits per byte, high bit continues. */
function readBase128(buf: Buffer, pos: number): [number, number] {
  let value = 0
  for (let i = 0; i < 5; i++) {
    const byte = buf[pos + i]
    if (byte === undefined) throw new Error('truncated base128')
    value = value * 128 + (byte & 0x7f)
    if ((byte & 0x80) === 0) return [value, pos + i + 1]
  }
  throw new Error('base128 too long')
}

function readSfntTables(buf: Buffer): Map<string, Buffer> {
  const numTables = buf.readUInt16BE(4)
  const tables = new Map<string, Buffer>()
  for (let i = 0; i < numTables; i++) {
    const entry = 12 + i * 16
    const tag = buf.toString('latin1', entry, entry + 4)
    const offset = buf.readUInt32BE(entry + 8)
    const length = buf.readUInt32BE(entry + 12)
    if (offset + length <= buf.length) tables.set(tag, buf.subarray(offset, offset + length))
  }
  return tables
}

function readWoffTables(buf: Buffer): Map<string, Buffer> {
  const numTables = buf.readUInt16BE(12)
  const tables = new Map<string, Buffer>()
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20
    const tag = buf.toString('latin1', entry, entry + 4)
    const offset = buf.readUInt32BE(entry + 4)
    const compLength = buf.readUInt32BE(entry + 8)
    const origLength = buf.readUInt32BE(entry + 12)
    const raw = buf.subarray(offset, offset + compLength)
    const limit = Math.min(origLength, MAX_TABLE_BYTES)
    tables.set(tag, compLength === origLength ? raw : inflateSync(raw, { maxOutputLength: limit }))
  }
  return tables
}

// The tables of a WOFF2 arrive as one brotli stream, concatenated in directory order, so reaching
// any of them means adding up the lengths of everything before it. Which length that is depends on
// whether the table was transformed - and the rule is inverted for glyf and loca, which are the
// two the format actually transforms: there version 0 *is* the transform and 3 is "null", while
// for every other table 0 means untransformed. Neither OS/2 nor fvar is ever transformed; they
// still have to be found behind tables that are.
function readWoff2Tables(buf: Buffer): Map<string, Buffer> {
  const numTables = buf.readUInt16BE(12)
  let pos = 48
  const directory: Array<{ tag: string; length: number }> = []
  for (let i = 0; i < numTables; i++) {
    const flags = buf[pos++]
    const known = flags & 0x3f
    let tag: string
    if (known === 0x3f) {
      tag = buf.toString('latin1', pos, pos + 4)
      pos += 4
    } else {
      tag = WOFF2_KNOWN_TAGS[known] ?? `?${known}`
    }
    const version = (flags >> 6) & 0x03
    let length: number
    ;[length, pos] = readBase128(buf, pos)
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0
    if (transformed) [length, pos] = readBase128(buf, pos)
    directory.push({ tag, length })
  }
  // The directory has just said how long the stream unpacks to - transformed tables carry their
  // transformed length, which is the one that lands in the stream - so the sum is the expected
  // size, and anything past it is a lie worth stopping at.
  const expected = directory.reduce((sum, { length }) => sum + length, 0)
  const decompressed = brotliDecompressSync(buf.subarray(pos), {
    maxOutputLength: Math.min(expected, MAX_TABLE_BYTES)
  })
  const tables = new Map<string, Buffer>()
  let offset = 0
  for (const { tag, length } of directory) {
    if (offset + length <= decompressed.length) tables.set(tag, decompressed.subarray(offset, offset + length))
    offset += length
  }
  return tables
}

function readTables(buf: Buffer): Map<string, Buffer> {
  const signature = buf.toString('latin1', 0, 4)
  if (signature === 'wOF2') return readWoff2Tables(buf)
  if (signature === 'wOFF') return readWoffTables(buf)
  return readSfntTables(buf)
}

/**
 * The weight and slant of a font file, or null when the file cannot be read as one.
 *
 * A variable font's wght axis wins over the static weight, because that is the range a browser can
 * actually use: without it the whole axis is unreachable and every bold cut is synthesised from
 * the 400 the browser assumes.
 */
export function readFontFace(data: Buffer): FontFace | null {
  try {
    const tables = readTables(data)
    const os2 = tables.get('OS/2')
    const head = tables.get('head')
    const fvar = tables.get('fvar')

    let weight: string | null = null
    if (fvar && fvar.length >= 16) {
      const axesOffset = fvar.readUInt16BE(4)
      const axisCount = fvar.readUInt16BE(8)
      const axisSize = fvar.readUInt16BE(10)
      for (let i = 0; i < axisCount; i++) {
        const axis = axesOffset + i * axisSize
        if (axis + 20 > fvar.length) break
        if (fvar.toString('latin1', axis, axis + 4) !== 'wght') continue
        // Fixed 16.16, and the values a wght axis carries are whole numbers in practice; rounding
        // keeps `400 700` out of `399.99902 700`.
        const min = Math.round(fvar.readInt32BE(axis + 4) / 65536)
        const max = Math.round(fvar.readInt32BE(axis + 12) / 65536)
        if (min > 0 && max >= min) weight = min === max ? String(min) : `${min} ${max}`
        break
      }
    }
    if (weight === null && os2 && os2.length >= 6) {
      const usWeightClass = os2.readUInt16BE(4)
      if (usWeightClass >= 1 && usWeightClass <= 1000) weight = String(usWeightClass)
    }

    // Two places say it and they disagree in the wild, so either is enough: OS/2's fsSelection bit
    // 0 and head's macStyle bit 1.
    const italicByOs2 = os2 && os2.length >= 64 ? (os2.readUInt16BE(62) & 0x01) !== 0 : false
    const italicByHead = head && head.length >= 46 ? (head.readUInt16BE(44) & 0x02) !== 0 : false

    if (weight === null) return null
    return { weight, italic: italicByOs2 || italicByHead }
  } catch {
    return null
  }
}
