import { describe, expect, test } from "bun:test"
import type { Context } from "hono"
import type { AppEnv } from "../context"
import { EffectRegistry } from "./effect-registry"

describe("EffectRegistry", () => {
  test("should register and retrieve effects", () => {
    const registry = new EffectRegistry()
    const mockHandler = async () => {}

    registry.register("test:effect", mockHandler)

    expect(registry.has("test:effect")).toBe(true)
    expect(registry.get("test:effect")).toBe(mockHandler)
  })

  test("should execute registered effects", async () => {
    const registry = new EffectRegistry()
    let executed = false

    registry.register("test:effect", async () => {
      executed = true
    })

    const mockContext = {} as Context<AppEnv>
    await registry.execute(mockContext, "test:effect")

    expect(executed).toBe(true)
  })

  test("should pass arguments to effect handlers", async () => {
    const registry = new EffectRegistry()
    let receivedArgs: unknown[] = []

    registry.register("test:effect", async (_c, ...args: unknown[]) => {
      receivedArgs = args
    })

    const mockContext = {} as Context<AppEnv>
    await registry.execute(mockContext, "test:effect", "arg1", 42, { key: "value" })

    expect(receivedArgs).toEqual(["arg1", 42, { key: "value" }])
  })

  test("should warn for unknown effects", async () => {
    const registry = new EffectRegistry()
    const mockContext = {} as Context<AppEnv>

    // Should not throw, just warn
    await registry.execute(mockContext, "unknown:effect")
  })

  test("should unregister effects", () => {
    const registry = new EffectRegistry()
    registry.register("test:effect", async () => {})

    expect(registry.has("test:effect")).toBe(true)

    const removed = registry.unregister("test:effect")
    expect(removed).toBe(true)
    expect(registry.has("test:effect")).toBe(false)
  })

  test("should warn when overriding effects", () => {
    const registry = new EffectRegistry()
    const handler1 = async () => {}
    const handler2 = async () => {}

    registry.register("test:effect", handler1)
    registry.register("test:effect", handler2) // Should warn

    expect(registry.get("test:effect")).toBe(handler2)
  })

  test("should list all registered effect names", () => {
    const registry = new EffectRegistry()

    registry.register("effect:one", async () => {})
    registry.register("effect:two", async () => {})
    registry.register("effect:three", async () => {})

    const names = registry.getEffectNames()
    expect(names).toContain("effect:one")
    expect(names).toContain("effect:two")
    expect(names).toContain("effect:three")
    expect(names.length).toBe(3)
  })

  test("should clone registry with all handlers", () => {
    const registry = new EffectRegistry()
    const handler1 = async () => {}
    const handler2 = async () => {}

    registry.register("effect:one", handler1)
    registry.register("effect:two", handler2)

    const cloned = registry.clone()

    expect(cloned.has("effect:one")).toBe(true)
    expect(cloned.has("effect:two")).toBe(true)
    expect(cloned.get("effect:one")).toBe(handler1)
    expect(cloned.get("effect:two")).toBe(handler2)

    // Modifications to cloned should not affect original
    cloned.unregister("effect:one")
    expect(registry.has("effect:one")).toBe(true)
    expect(cloned.has("effect:one")).toBe(false)
  })
})
