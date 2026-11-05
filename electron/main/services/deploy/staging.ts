import { existsSync } from 'fs'
import { copyFile, link, mkdir, readdir, rm, stat } from 'fs/promises'
import { join } from 'path'
import type { DocumentFormat, PublishTarget } from '@shared/ipc-contract'
import { mainT } from '../../i18n'
import { quartzGuiDir } from '../projectDirs'
import * as publishTargetsService from '../publishTargetsService'

/**
 * A website target that takes documents along: the build plus the files of the document targets it
 * names, under `downloads/`, as one folder every adapter can treat as the build.
 *
 * Not written into the build folder itself: that folder has a writer (Quartz, and the dev server
 * while it runs), and the next build would empty it again. The staging folder is
 * `.quartz-gui/staging/<targetId>`, made fresh for every preview and every run: the build's files
 * as hard links (no bytes copied; a plain copy where the build lies on another volume), the
 * documents as copies. Every adapter then sees one folder, so the diff, the manifest, rsync's
 * dry run and the git branch all include the documents without knowing about them - and when the
 * documents are switched off, a target that deletes removed files deletes them on the server too.
 *
 * The documents are the files their target last wrote. Older than the build means they were made
 * from a site that has changed since; the run says so rather than export again on its own.
 */

export const DOWNLOADS_DIR = 'downloads'
const EXT: Record<DocumentFormat, string> = { pdf: 'pdf', epub: 'epub', html: 'html' }

export interface Staging {
  dir: string
  /** Sentences for the run's output: a document missing, one older than the build. */
  notes: string[]
  remove(): Promise<void>
}

async function mirror(from: string, to: string): Promise<void> {
  await mkdir(to, { recursive: true })
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = join(from, entry.name)
    const dst = join(to, entry.name)
    if (entry.isDirectory()) await mirror(src, dst)
    else if (entry.isFile()) {
      try {
        await link(src, dst)
      } catch {
        await copyFile(src, dst)
      }
    }
    // A symlink in the build is not followed: Quartz writes none, and one that is there was put
    // there by something else - the adapters skip links in the build as well (manifest walk).
  }
}

export async function stageWithDocuments(projectPath: string, target: PublishTarget, buildDir: string): Promise<Staging | null> {
  const ids = target.withDocuments ?? []
  if (ids.length === 0) return null
  const dir = quartzGuiDir(projectPath, 'staging', target.id)
  await rm(dir, { recursive: true, force: true })
  await mirror(buildDir, dir)
  const notes: string[] = []
  const builtAt = (await stat(join(buildDir, 'index.html')).catch(() => null))?.mtimeMs ?? 0
  for (const id of ids) {
    const doc = await publishTargetsService.getTarget(projectPath, id)
    if (!doc || doc.destination.type !== 'document') {
      notes.push(mainT('stagingDocumentTargetMissing'))
      continue
    }
    const d = doc.destination
    for (const format of d.formats) {
      const name = `${d.bookId}.${EXT[format]}`
      const file = join(d.path, name)
      const info = await stat(file).catch(() => null)
      if (!info?.isFile()) {
        notes.push(mainT('stagingDocumentMissing', { name, target: doc.name }))
        continue
      }
      if (info.mtimeMs < builtAt) notes.push(mainT('stagingDocumentOlder', { name, target: doc.name }))
      const dest = join(dir, DOWNLOADS_DIR, name)
      if (existsSync(dest)) notes.push(mainT('stagingDocumentReplaces', { path: `${DOWNLOADS_DIR}/${name}` }))
      await mkdir(join(dir, DOWNLOADS_DIR), { recursive: true })
      await rm(dest, { force: true })
      await copyFile(file, dest)
    }
  }
  return { dir, notes, remove: () => rm(dir, { recursive: true, force: true }) }
}
