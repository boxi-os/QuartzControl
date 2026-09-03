// Loaded with `-r` into every process the embedded runtime starts, before its script runs.
//
// Why this exists: yargs decides how much of argv to drop in hideBin() by asking
// isBundledElectronApp() - `process.versions.electron && !process.defaultApp` - and
// ELECTRON_RUN_AS_NODE satisfies both halves, so yargs drops one element instead of two and the
// script's own path arrives as the command name. Measured against quartz/bootstrap-cli.mjs under
// Electron 43.4.1: `hideBin` returned ["/path/to/bootstrap-cli.mjs", "build", "--serve"], so
// `quartz build --serve` parsed as a build of a file called bootstrap-cli.mjs. With this line it
// returns ["build", "--serve"], the same as a real Node.
//
// A lie towards any library that checks for Electron, not just yargs - which is why it lives in
// one file with this comment rather than being set in-line somewhere.
process.defaultApp = true
