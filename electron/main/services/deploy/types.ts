import type { DeployDiffEntry, DeployResult, PublishTarget } from '@shared/ipc-contract'

export interface DeployContext {
  projectPath: string
  target: PublishTarget
  /** Absolute path to the build output being published. */
  buildDir: string
  /** The connection's decrypted secret, or null when the target needs none. */
  secret: string | null
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
