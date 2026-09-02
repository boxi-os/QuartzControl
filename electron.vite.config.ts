import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('shared')
      }
    },
    build: {
      rollupOptions: {
        input: resolve('electron/main/index.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('shared')
      }
    },
    build: {
      rollupOptions: {
        input: resolve('electron/preload/index.ts'),
        // CommonJS on purpose, against the package's "type": "module". electron-vite otherwise emits
        // the preload as index.mjs, and Electron can only load an ESM preload with the renderer
        // sandbox *off* (tutorial/esm.md: "Sandboxed preload scripts are run as plain JavaScript
        // without an ESM context") - which is the sole reason `sandbox: false` used to sit in
        // electron/main/index.ts. The preload bundles to one file with no imports of its own, so
        // the format costs nothing; the sandbox it buys back is the second half of the argument
        // ipc/schemas.ts makes about the renderer not being a trust boundary.
        output: {
          format: 'cjs',
          entryFileNames: '[name].js'
        }
      }
    }
  },
  renderer: {
    root: 'src',
    build: {
      rollupOptions: {
        input: resolve('src/index.html')
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src'),
        '@shared': resolve('shared')
      }
    },
    plugins: [react()]
  }
})
