import { describe, expect, test } from "bun:test"
import { createManifestRouteLoader, type RouteManifestEntry } from "./manifest-route-loader"

describe("createManifestRouteLoader", () => {
  test("yields manifest entries in order and loads modules lazily", async () => {
    const calls: string[] = []
    const entries: RouteManifestEntry[] = [
      {
        routePath: "/alpha",
        load: async () => {
          calls.push("alpha")
          return { GET: () => "alpha" }
        },
      },
      {
        routePath: "/beta",
        load: async () => {
          calls.push("beta")
          return { default: "beta" }
        },
      },
    ]

    const loader = createManifestRouteLoader(entries)
    const seen: Array<{ routePath: string; module: Record<string, unknown> }> = []

    for await (const entry of loader.load()) {
      seen.push(entry)
    }

    expect(calls.length).toBe(2)
    expect(calls).toEqual(["alpha", "beta"])
    expect(seen[0]?.routePath).toBe("/alpha")
    expect("GET" in (seen[0]?.module ?? {})).toBe(true)
    expect(seen[1]?.routePath).toBe("/beta")
    expect("default" in (seen[1]?.module ?? {})).toBe(true)
  })
})
