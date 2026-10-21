import type { DeployDiffEntry, DeployResult, PublishTarget } from '@shared/ipc-contract'

export interface DeployContext {
  projectPath: string
  target: PublishTarget
  /** Absolute path to the build output being published. */
  buildDir: string
  /** The connection's decrypted secret, or null when the target needs none. */
  secret: string | null
  /**
   * The modes of the files and folders in `buildDir` are the ones wanted on the server, and an
   * upload sets them, on files that are already there too (sftp, ftp, rsync; the folder adapter
   * copies a file's mode with it and sets each folder it writes into). Only the relay's upload asks for this
   * (formsService). A site gets 0644 over SFTP; over FTP the server's umask decides, over rsync a
   * new file gets its local mode less that umask and an existing one keeps its own.
   */
  keepLocalModes?: boolean
  /**
   * The relay's folders below the target's own, top first, ending with the one it goes into: none
   * of them may be a symlink on the server (sftp, ftp, rsync).
   */
  relayFolders?: string[]
  emitProgress(processed: number, total: number, currentFile?: string): void
}

// Why `preview` is per adapter rather than one shared diffBuildOutput(): the adapters do not agree
// on what a diff even is. sftp/ftp/folder compare the build output against a local manifest of
// what this app last uploaded; rsync asks the remote itself via a dry run, which is a strictly
// better answer and needs no manifest; a webhook has nothing to compare at all. Flattening those
// into one function is what forced the old code to pretend a webhook was a file transfer.
export interface DeployAdapter {
  preview(ctx: DeployContext): Promise<DeployDiffEntry[]>
  run(ctx: DeployContext, excludePaths: string[]): Promise<DeployResult>
}
