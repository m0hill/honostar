import { describe, expect, test } from "bun:test"
import { TopicContractRegistry, globalContracts, topic, validateEventContract } from "."

describe("contracts", () => {
  test("registers and validates event payload (warn mode)", async () => {
    process.env.NODE_ENV = "development"
    process.env.HONOSTAR_EVENT_CONTRACTS = "warn"

    const schema = {
      "~standard": {
        // Minimal Standard Schema validator for tests
        async validate(value: unknown) {
          if (typeof value === "object" && value !== null && "id" in (value as any)) {
            return { value }
          }
          return {
            issues: [{ message: "id required", path: ["id"] }],
          }
        },
        version: 1,
        vendor: "test",
      },
    } as any

    topic("issues:list").event("issue:created", schema)

    const originalWarn = console.warn
    const warnings: unknown[][] = []
    console.warn = (...args) => warnings.push(args)
    try {
      const ok = await validateEventContract({
        topic: "issues:list",
        event: "issue:created",
        payload: { nope: true },
        source: "publish",
        registry: globalContracts,
      })
      expect(ok).toBe(false)
      expect(warnings.length).toBeGreaterThan(0)
    } finally {
      console.warn = originalWarn
    }
  })

  test("register does not crash on invalid topic matcher at runtime", () => {
    const schema = {
      "~standard": {
        async validate(value: unknown) {
          return { value }
        },
        version: 1,
        vendor: "test",
      },
    } as any

    const registry = new TopicContractRegistry()
    expect(() => registry.register({} as any, "event:oops", schema)).not.toThrow()
  })
})
