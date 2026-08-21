import type { QuartzGuiApi } from '@shared/ipc-contract'

declare global {
  interface Window {
    quartzGui: QuartzGuiApi
  }
}
