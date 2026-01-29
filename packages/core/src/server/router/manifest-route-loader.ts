import type { RouteLoader } from "./types"

export type RouteManifestEntry = {
  routePath: string
  load: () => Promise<Record<string, unknown>>
}

export function createManifestRouteLoader(entries: RouteManifestEntry[]): RouteLoader {
  return {
    async *load() {
      for (const entry of entries) {
        const module = await entry.load()
        yield {
          routePath: entry.routePath,
          module,
        }
      }
    },
  }
}
