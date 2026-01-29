import { describe, expect, test } from "bun:test"
import {
  RegionRegistry,
  regionAttrs,
  regionDomId,
  regionSelector,
  resolveRegionPatchOptions,
} from "./regions"

describe("regions", () => {
  test("derives a stable DOM id + selector from region id", () => {
    expect(regionDomId("issues:list")).toBe("honostar-region--aXNzdWVzOmxpc3Q")
    expect(regionSelector("issues:list")).toBe('[data-honostar-region="issues:list"]')
  })

  test("regionAttrs includes semantics attributes", () => {
    expect(regionAttrs("issues:list", { kind: "list" })).toEqual({
      "data-honostar-region": "issues:list",
      "data-honostar-region-kind": "list",
    })
  })

  test("resolveRegionPatchOptions sets selector and warns on incremental modes by default", () => {
    const originalWarn = console.warn
    const warnings: unknown[][] = []
    console.warn = (...args) => warnings.push(args)
    try {
      const regionId = "test:regions:warn-1"
      const opts = resolveRegionPatchOptions({ region: regionId, options: { mode: "append" } })
      expect(opts.selector).toBe(regionSelector(regionId))
      expect(opts.mode).toBe("append")
      expect(warnings.length).toBe(1)
    } finally {
      console.warn = originalWarn
    }
  })

  test("resolveRegionPatchOptions allows incremental modes when declared", () => {
    const originalWarn = console.warn
    const warnings: unknown[][] = []
    console.warn = (...args) => warnings.push(args)
    try {
      const registry = new RegionRegistry()
      const regionId = "test:regions:allow-append-1"
      registry.registerAll([{ id: regionId, allowModes: ["append"] }])
      const opts = resolveRegionPatchOptions(
        { region: regionId, options: { mode: "append" } },
        registry
      )
      expect(opts.selector).toBe(regionSelector(regionId))
      expect(warnings.length).toBe(0)
    } finally {
      console.warn = originalWarn
    }
  })
})
