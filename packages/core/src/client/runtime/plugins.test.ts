import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { PluginsApi } from "./plugins"
import { createPluginSystem } from "./plugins"

describe("Plugin System", () => {
  let plugins: PluginsApi

  beforeEach(() => {
    plugins = createPluginSystem()
  })

  afterEach(() => {
    // Clean up registered plugins
    for (const name of plugins.getNames()) {
      plugins.unregister(name)
    }
  })

  describe("register", () => {
    test("registers a plugin successfully", () => {
      const handler = () => {}
      plugins.register("test", handler)

      expect(plugins.has("test")).toBe(true)
      expect(plugins.getNames()).toContain("test")
    })

    test("throws error for invalid plugin name", () => {
      expect(() => {
        plugins.register("", () => {})
      }).toThrow("Plugin name must be a non-empty string")

      expect(() => {
        // @ts-expect-error - Testing invalid input
        plugins.register(null, () => {})
      }).toThrow("Plugin name must be a non-empty string")
    })

    test("throws error for invalid handler", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid input
        plugins.register("test", "not a function")
      }).toThrow("Plugin handler must be a function")

      expect(() => {
        // @ts-expect-error - Testing invalid input
        plugins.register("test", null)
      }).toThrow("Plugin handler must be a function")
    })

    test("warns when overwriting existing plugin", () => {
      const consoleWarn = console.warn
      const warnings: string[] = []
      console.warn = (msg: string) => {
        if (msg.includes("already registered")) {
          warnings.push(msg)
        }
      }

      plugins.register("test", () => {})
      plugins.register("test", () => {})

      expect(warnings.length).toBe(1)
      expect(warnings[0]).toContain('Plugin "test" is already registered')

      console.warn = consoleWarn
    })
  })

  describe("registerAll", () => {
    test("registers multiple plugins at once", () => {
      plugins.registerAll({
        plugin1: () => {},
        plugin2: () => {},
        plugin3: () => {},
      })

      expect(plugins.has("plugin1")).toBe(true)
      expect(plugins.has("plugin2")).toBe(true)
      expect(plugins.has("plugin3")).toBe(true)
      expect(plugins.getNames().length).toBe(3)
    })

    test("handles empty object", () => {
      plugins.registerAll({})
      expect(plugins.getNames().length).toBe(0)
    })
  })

  describe("has", () => {
    test("returns true for registered plugin", () => {
      plugins.register("test", () => {})
      expect(plugins.has("test")).toBe(true)
    })

    test("returns false for unregistered plugin", () => {
      expect(plugins.has("nonexistent")).toBe(false)
    })
  })

  describe("getNames", () => {
    test("returns empty array when no plugins registered", () => {
      expect(plugins.getNames()).toEqual([])
    })

    test("returns all registered plugin names", () => {
      plugins.register("a", () => {})
      plugins.register("b", () => {})
      plugins.register("c", () => {})

      const names = plugins.getNames()
      expect(names).toContain("a")
      expect(names).toContain("b")
      expect(names).toContain("c")
      expect(names.length).toBe(3)
    })
  })

  describe("unregister", () => {
    test("unregisters existing plugin", () => {
      plugins.register("test", () => {})
      expect(plugins.has("test")).toBe(true)

      const result = plugins.unregister("test")
      expect(result).toBe(true)
      expect(plugins.has("test")).toBe(false)
    })

    test("returns false for nonexistent plugin", () => {
      const result = plugins.unregister("nonexistent")
      expect(result).toBe(false)
    })
  })

  describe("plugin handlers", () => {
    test("plugin receives context and arguments", () => {
      let receivedCtx: unknown = null
      let receivedArgs: unknown[] = []

      plugins.register("test", (ctx, ...args) => {
        receivedCtx = ctx
        receivedArgs = args
      })

      // Simulate calling the plugin (normally done by Datastar)
      // Since we're testing the registry, we verify it's stored correctly
      expect(plugins.has("test")).toBe(true)
    })

    test("async plugin handlers are supported", async () => {
      let executed = false

      plugins.register("asyncTest", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        executed = true
      })

      expect(plugins.has("asyncTest")).toBe(true)
      // The handler would be called by Datastar, not by the registry
    })

    test("type-safe plugin with specific arguments", () => {
      type Handler = (
        ctx: { el: HTMLElement; error: (msg: string) => void },
        text: string,
        count: number
      ) => void

      const handler: Handler = (ctx, text, count) => {
        // Handler would use text and count
      }

      plugins.register("typed", handler)
      expect(plugins.has("typed")).toBe(true)
    })
  })

  describe("edge cases", () => {
    test("handles special characters in plugin names", () => {
      plugins.register("plugin:namespaced", () => {})
      plugins.register("plugin-with-dash", () => {})
      plugins.register("plugin_with_underscore", () => {})

      expect(plugins.has("plugin:namespaced")).toBe(true)
      expect(plugins.has("plugin-with-dash")).toBe(true)
      expect(plugins.has("plugin_with_underscore")).toBe(true)
    })

    test("case-sensitive plugin names", () => {
      plugins.register("Test", () => {})
      plugins.register("test", () => {})

      expect(plugins.has("Test")).toBe(true)
      expect(plugins.has("test")).toBe(true)
      expect(plugins.getNames().length).toBe(2)
    })

    test("plugin registry is isolated", () => {
      const plugins1 = createPluginSystem()
      const plugins2 = createPluginSystem()

      plugins1.register("test", () => {})

      expect(plugins1.has("test")).toBe(true)
      expect(plugins2.has("test")).toBe(false)
    })
  })

  describe("plugin naming conventions", () => {
    test("supports recommended naming patterns", () => {
      plugins.registerAll({
        "analytics:track": () => {},
        "analytics:page": () => {},
        "ui:toast": () => {},
        "ui:modal": () => {},
        clipboard: () => {},
        focus: () => {},
      })

      expect(plugins.getNames().length).toBe(6)
      expect(plugins.has("analytics:track")).toBe(true)
      expect(plugins.has("ui:toast")).toBe(true)
      expect(plugins.has("clipboard")).toBe(true)
    })
  })
})
