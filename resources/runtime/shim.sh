#!/bin/sh
# Generated on every app start into <userData>/runtime/bin - do not edit the copy there, and do
# not expect it to survive: it holds an absolute path to the Electron binary, which inside an
# AppImage lives under a mount point that changes with each launch.
#
# This template is the single source of the shim: services/nodeRuntime.ts fills it in at runtime,
# scripts/check-runtime.mjs fills it in to measure the runtime outside the app. The placeholders
# arrive already shell-quoted; __SCRIPT__ is empty for the `node` shim.
ELECTRON_RUN_AS_NODE=1 exec __ELECTRON__ -r __LOADER__ __SCRIPT__ "$@"
