import { describe, expect, test } from "bun:test"
import {
  RegionRegistry,
  regionAttrs,
  regionDomId,
  regionSelector,
  resolveRegionPatchOptions,
  warnOnUnregisteredRegionSelector,
} from "./regions"

describe("regions", () => {
  test("derives a stable DOM id + selector from region id", () => {
    expect(regionDomId("issues:list")).toBe("honostar-region--aXNzdWVzOmxpc3Q")
    expect(regionSelector("issues:list")).toBe("#honostar-region--aXNzdWVzOmxpc3Q")
  })

  test("regionAttrs includes region attributes", () => {
    expect(regionAttrs("issues:list")).toEqual({
      id: "honostar-region--aXNzdWVzOmxpc3Q",
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

  test("warns when selector targets an unregistered region", () => {
    const originalWarn = console.warn
    const warnings: unknown[][] = []
    console.warn = (...args) => warnings.push(args)
    try {
      warnOnUnregisteredRegionSelector(`#${regionDomId("test:regions:missing-1")}`)
      expect(warnings.length).toBe(1)
      expect(String(warnings[0]?.[0])).toContain("not registered")
    } finally {
      console.warn = originalWarn
    }
  })

  test("does not warn when selector targets a registered region", () => {
    const originalWarn = console.warn
    const warnings: unknown[][] = []
    console.warn = (...args) => warnings.push(args)
    try {
      const registry = new RegionRegistry()
      registry.registerAll([{ id: "test:regions:registered-1" }])
      warnOnUnregisteredRegionSelector(
        `#${regionDomId("test:regions:registered-1")}`,
        registry
      )
      expect(warnings.length).toBe(0)
    } finally {
      console.warn = originalWarn
    }
  })
})
