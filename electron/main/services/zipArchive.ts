import { crc32, deflateRawSync, inflateRawSync } from 'zlib'
import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { mainT } from '../i18n'

/**
 * A minimal ZIP reader/writer, so a template package can be one file the user can hand to someone
 * else rather than a folder they have to zip themselves.
 *
 * Hand-rolled rather than added as a dependency for the same reason `scripts/generate-icon.mjs`
 * hand-rolls a PNG encoder: the format's subset we need is small and fully specified, while every
 * npm zip library brings a far larger surface than "store these ~50 files, read them back".
 * Deflate comes from Node's own zlib (`deflateRawSync` is exactly ZIP's method 8 - a raw deflate
 * stream with no zlib header), and `zlib.crc32` supplies the checksum ZIP requires; both are
 * present in Electron 33's Node 20.18.3 (verified).
 *
 * Deliberately *not* supported: ZIP64 (so a package is capped below 4 GB, checked on write rather
 * than silently truncating a size field), encryption, multi-disk archives, and directory entries -
 * a folder inside the archive is implied by the '/' in a file's name, which is what every
 * extractor does anyway.
 */

const LOCAL_SIG = 0x04034b50
const CENTRAL_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50

// Bit 11 tells the extractor the file name is UTF-8 rather than the legacy CP437, which is what
// makes a name like "teile/schriften/Ünicode.woff2" survive the round trip.
const FLAG_UTF8 = 0x0800
const METHOD_DEFLATE = 8
const METHOD_STORE = 0

// Four bytes is the whole size field, and there is no ZIP64 fallback here - refuse rather than
// write an archive whose sizes wrap around to something an extractor would read as valid.
const MAX_SIZE = 0xffffffff

export interface ZipEntry {
  name: string
  data: Buffer
}

// ZIP stores the modification time as an MS-DOS date/time pair: two-second resolution, no zone,
// and a year counted from 1980. A date outside that range is clamped rather than written as a
// negative year, which some extractors reject outright.
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107)
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  }
}

export function createZip(entries: ZipEntry[], modified = new Date()): Buffer {
  const { time, date } = dosDateTime(modified)
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf-8')
    const deflated = deflateRawSync(entry.data)
    // An already-compressed payload (a woff2, a png) routinely deflates to *more* than it was;
    // storing it uncompressed in that case is what ZIP's method 0 is for.
    const useDeflate = deflated.length < entry.data.length
    const body = useDeflate ? deflated : entry.data
    const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE

    if (entry.data.length > MAX_SIZE || body.length > MAX_SIZE) {
      throw new Error(mainT('zipEntryTooLarge', { name: entry.name }))
    }
    const checksum = crc32(entry.data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(LOCAL_SIG, 0)
    local.writeUInt16LE(20, 4) // version needed: 2.0, i.e. deflate
    local.writeUInt16LE(FLAG_UTF8, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28) // no extra field
    locals.push(local, name, body)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(CENTRAL_SIG, 0)
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(FLAG_UTF8, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30) // extra
    central.writeUInt16LE(0, 32) // comment
    central.writeUInt16LE(0, 34) // disk number start
    central.writeUInt16LE(0, 36) // internal attributes
    // External attributes carry the unix mode in the high 16 bits; 0o644 keeps an extracted file
    // readable and non-executable instead of inheriting whatever the extractor defaults to.
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)

    offset += local.length + name.length + body.length
  }

  const centralBuffer = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(EOCD_SIG, 0)
  eocd.writeUInt16LE(0, 4) // this disk
  eocd.writeUInt16LE(0, 6) // disk with central directory
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralBuffer.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...locals, centralBuffer, eocd])
}

/**
 * Reads via the central directory rather than by scanning for local headers, because only the
 * central directory is authoritative: a local header may carry zeroed sizes with the real ones in
 * a trailing data descriptor (flag bit 3), which streaming writers routinely produce and which a
 * header-scanning reader cannot follow.
 */
export function readZip(buffer: Buffer): Map<string, Buffer> {
  // The EOCD sits at the very end but is followed by a variable-length comment, so it has to be
  // searched for backwards. 22 + 65535 is the largest it can be.
  const minStart = Math.max(0, buffer.length - 22 - 0xffff)
  let eocd = -1
  for (let i = buffer.length - 22; i >= minStart; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) {
      eocd = i
      break
    }
  }
  if (eocd === -1) throw new Error(mainT('zipNotAPackage'))

  const count = buffer.readUInt16LE(eocd + 10)
  let cursor = buffer.readUInt32LE(eocd + 16)
  const files = new Map<string, Buffer>()

  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(cursor) !== CENTRAL_SIG) throw new Error(mainT('zipBadDirectory'))
    const method = buffer.readUInt16LE(cursor + 10)
    const expectedCrc = buffer.readUInt32LE(cursor + 16)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const uncompressedSize = buffer.readUInt32LE(cursor + 24)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const localOffset = buffer.readUInt32LE(cursor + 42)
    const name = buffer.toString('utf-8', cursor + 46, cursor + 46 + nameLength)
    cursor += 46 + nameLength + extraLength + commentLength

    // A directory entry (trailing '/') carries no payload - skip it rather than storing an empty
    // buffer under a name no caller will ever ask for.
    if (name.endsWith('/')) continue

    if (buffer.readUInt32LE(localOffset) !== LOCAL_SIG) throw new Error(mainT('zipBadHeader'))
    // The local header's own name/extra lengths are what locate the data, and its extra field is
    // routinely a different length from the central one (alignment padding), so they must be read
    // here rather than reused from above.
    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLength + localExtraLength
    const body = buffer.subarray(start, start + compressedSize)

    let data: Buffer
    if (method === METHOD_STORE) data = Buffer.from(body)
    else if (method === METHOD_DEFLATE) data = inflateRawSync(body)
    else throw new Error(mainT('zipUnsupportedMethod', { method }))

    if (data.length !== uncompressedSize || crc32(data) !== expectedCrc) {
      throw new Error(mainT('zipEntryCorrupt', { name }))
    }
    files.set(name, data)
  }

  return files
}

export async function writeZipFile(path: string, entries: ZipEntry[]): Promise<void> {
  await writeFile(path, createZip(entries))
}

export async function readZipFile(path: string): Promise<Map<string, Buffer>> {
  if (!existsSync(path)) throw new Error(mainT('zipFileMissing'))
  return readZip(await readFile(path))
}
