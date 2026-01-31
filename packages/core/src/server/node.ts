// Node-only helpers (build/codegen).
//
// Keep these out of `@honostar/core/server` so edge runtimes (Workers) don't bundle Node builtins.

// Vite assets
export type { ViteManifest, ViteManifestEntry } from "./assets/vite-manifest"
export { readViteManifest, resolveHonostarAssetsFromViteManifest } from "./assets/vite-manifest"

// Route manifest generator (file-system based)
export { generateRouteManifest } from "./router/generator"

// Contracts generator (writes TS files)
export type { GenerateContractsTypesOptions } from "./contracts/node"
export { generateContractsTypes } from "./contracts/node"
