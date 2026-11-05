import { randomBytes } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, rename, rm, stat, writeFile } from 'fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'path'
import type { DeployDiffEntry, DocumentFormat } from '@shared/ipc-contract'
import { mainT } from '../../i18n'
import { readBook } from '../bookService'
import { exportBook } from '../export/exportService'
import type { DeployAdapter, DeployContext } from './types'

/**
 * The document target: a book of the site exported as PDF, ePub and/or offline HTML into a folder
 * (export/exportService.ts does the export, this writes the files). It fits the page's model of a
 * target - preview, then run - with the files that will be written as the diff: `added` for a new
 * one, `changed` for one it replaces. There is no manifest and nothing is ever deleted; a file of
 * the same name is replaced, under a scratch name and a rename, so whatever watches the folder (a
 * cloud client, a web server) never sees half a PDF.
 */

function isInside(child: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function destination(ctx: DeployContext): { path: string; bookId: string; formats: DocumentFormat[] } {
  const d = ctx.target.destination
  if (d.type !== 'document') throw new Error(mainT('deployWrongType', { type: d.type }))
  // The same two refusals as the folder target: the folder must be neither in the build (the next
  // build would empty it) nor the project itself.
  if (isInside(d.path, ctx.buildDir) || isInside(ctx.buildDir, d.path)) throw new Error(mainT('folderOverlapsBuild', { dest: d.path, build: ctx.buildDir }))
  if (resolve(d.path) === resolve(ctx.projectPath)) throw new Error(mainT('folderIsProject'))
  return d
}

const EXT: Record<DocumentFormat, string> = { pdf: 'pdf', epub: 'epub', html: 'html' }

export const documentAdapter: DeployAdapter = {
  async preview(ctx) {
    const d = destination(ctx)
    return ['pdf', 'epub', 'html']
      .filter((f): f is DocumentFormat => d.formats.includes(f as DocumentFormat))
      .map((f): DeployDiffEntry => {
        const name = `${d.bookId}.${EXT[f]}`
        return { path: name, status: existsSync(join(d.path, name)) ? 'changed' : 'added' }
      })
  },

  async run(ctx) {
    const d = destination(ctx)
    const book = await readBook(ctx.projectPath, d.bookId)
    if (!book) return { success: false, output: mainT('exportBookMissing', { id: d.bookId }) }
    // The folder itself is created, the folders above it are not: on a disk or share that is not
    // connected that was a raw "EACCES: mkdir '/Volumes/…'" after the whole export, and under
    // Linux the files would land in the bare mount point (review of 2026-11-06, nebenbei 12).
    // Asked before the export, which can take minutes.
    if (!existsSync(d.path) && !existsSync(dirname(resolve(d.path)))) {
      return { success: false, output: mainT('exportFolderParentMissing', { path: d.path, parent: dirname(resolve(d.path)) }) }
    }
    const outcome = await exportBook({
      targetId: ctx.target.id,
      projectPath: ctx.projectPath,
      buildDir: ctx.buildDir,
      book,
      formats: d.formats,
      onProgress: (done, total, label) => ctx.emitProgress(done, total, label)
    })
    await mkdir(d.path).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'EEXIST') throw err
    })
    if (!(await stat(d.path)).isDirectory()) throw new Error(mainT('exportFolderNotFolder', { path: d.path }))
    const written: string[] = []
    for (const file of outcome.files) {
      const target = join(d.path, file.name)
      const scratch = `${target}.qc-${randomBytes(4).toString('hex')}`
      try {
        await writeFile(scratch, file.bytes)
        await rename(scratch, target)
      } catch (err) {
        await rm(scratch, { force: true })
        throw err
      }
      written.push(`→ ${target}`)
    }
    return { success: true, output: [...outcome.report, '', ...written].join('\n') }
  }
}
