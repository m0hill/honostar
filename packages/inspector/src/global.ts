import type { InspectorApi } from "./client/types"

export {}

declare global {
  interface HonostarApi {
    inspector?: InspectorApi | undefined
  }

  interface HonostarActions {
    inspector?: {
      open: () => void
      close: () => void
      toggle: () => void
    }
  }
}
