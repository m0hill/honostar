/**
 * Honostar Plugin System
 *
 * Provides a clean, type-safe API for registering custom Datastar actions
 * that extend the client runtime without requiring server roundtrips.
 *
 * @example
 * ```typescript
 * // Register a clipboard action
 * window.Honostar.plugins.register('clipboard', (ctx, text: string) => {
 *   if (!navigator.clipboard) {
 *     return ctx.error('Clipboard API not supported')
 *   }
 *   navigator.clipboard.writeText(text).catch(ctx.error)
 * })
 *
 * // Use in templates
 * <button data-on:click="@clipboard('Hello, world!')">Copy</button>
 * ```
 */

export type DatastarActionModule = {
  action: (config: {
    name: string
    apply: (ctx: DatastarActionContext, ...args: unknown[]) => void
  }) => void
}

const isDatastarModule = (value: unknown): value is DatastarActionModule => {
  if (typeof value !== "object" || value === null) return false
  if (!("action" in value)) return false
  const candidate = value as { action?: unknown }
  return typeof candidate.action === "function"
}

// Datastar action registration function - will be dynamically imported
let datastarAction: DatastarActionModule["action"] | null = null

// Datastar action context (passed as first argument to action handlers)
export interface DatastarActionContext {
  el: HTMLElement
  error: (message: string | Error) => void
}

type BivariantPluginHandler<TArgs extends unknown[] = unknown[]> = {
  bivarianceHack(c: DatastarActionContext, ...args: TArgs): void | Promise<void>
}["bivarianceHack"]

// Plugin handler signature: receives context + user-defined arguments
export type PluginHandler<TArgs extends unknown[] = unknown[]> = BivariantPluginHandler<TArgs>

type PendingPluginRegistration = { name: string; handler: PluginHandler }

// Registry of all registered plugins
interface PluginRegistry {
  [name: string]: PluginHandler
}

// Public API exposed on window.Honostar.plugins
export interface PluginsApi {
  /**
   * Register a custom Datastar action
   * @param name - Action name (used as @name in templates)
   * @param handler - Action handler function
   *
   * @example
   * ```typescript
   * window.Honostar.plugins.register('toast', (ctx, message: string, type = 'info') => {
   *   const toast = document.createElement('div')
   *   toast.className = `toast toast-${type}`
   *   toast.textContent = message
   *   document.body.appendChild(toast)
   *   setTimeout(() => toast.remove(), 3000)
   * })
   * ```
   */
  register<TArgs extends unknown[] = unknown[]>(name: string, handler: PluginHandler<TArgs>): void

  /**
   * Register multiple plugins at once
   * @param plugins - Object mapping plugin names to handlers
   *
   * @example
   * ```typescript
   * window.Honostar.plugins.registerAll({
   *   clipboard: (ctx, text) => navigator.clipboard.writeText(text),
   *   focus: (ctx, selector) => document.querySelector(selector)?.focus(),
   *   scroll: (ctx, selector) => document.querySelector(selector)?.scrollIntoView()
   * })
   * ```
   */
  registerAll(plugins: Record<string, PluginHandler>): void

  /**
   * Check if a plugin is registered
   * @param name - Plugin name
   */
  has(name: string): boolean

  /**
   * Get all registered plugin names
   */
  getNames(): string[]

  /**
   * Unregister a plugin (rare, mainly for testing)
   * @param name - Plugin name
   */
  unregister(name: string): boolean
}

/**
 * Creates the plugin system instance
 * @internal
 */
export function createPluginSystem(datastarEntrypoint?: string): PluginsApi {
  const registry: PluginRegistry = {}
  const pendingRegistrations: PendingPluginRegistration[] = []
  const resolvedEntrypoint = datastarEntrypoint ?? "/datastar.js"

  // Dynamically import Datastar's action function
  const loadDatastar = async () => {
    if (datastarAction) return
    if (typeof window === "undefined" || typeof document === "undefined") {
      // In non-browser environments (tests/SSR), skip loading Datastar
      return
    }
    try {
      const ds = await import(resolvedEntrypoint)
      if (!isDatastarModule(ds)) {
        console.error("[Honostar] Loaded Datastar module does not expose an action() function")
        return
      }
      datastarAction = ds.action
      // Register any pending plugins
      for (const { name, handler } of pendingRegistrations) {
        registerWithDatastar(name, handler)
      }
      pendingRegistrations.length = 0
    } catch (err) {
      console.error("[Honostar] Failed to load Datastar:", err)
    }
  }

  const registerWithDatastar = (name: string, handler: PluginHandler) => {
    if (!datastarAction) {
      pendingRegistrations.push({ name, handler })
      return
    }

    try {
      datastarAction({
        name,
        // Datastar passes { el, error } as first arg, then expression args
        apply: (ctx: DatastarActionContext, ...args: unknown[]) => {
          const pluginHandler = registry[name]
          if (pluginHandler) {
            return pluginHandler(ctx, ...args)
          }
        },
      })
    } catch (err) {
      console.error(`[Honostar] Failed to register plugin "${name}" with Datastar:`, err)
    }
  }

  // Start loading Datastar
  void loadDatastar()

  const api: PluginsApi = {
    register<TArgs extends unknown[] = unknown[]>(
      name: string,
      handler: PluginHandler<TArgs>
    ): void {
      if (!name || typeof name !== "string") {
        throw new Error("Plugin name must be a non-empty string")
      }

      if (typeof handler !== "function") {
        throw new Error("Plugin handler must be a function")
      }

      if (registry[name]) {
        console.warn(`[Honostar] Plugin "${name}" is already registered. Overwriting.`)
      }

      // Store in our registry
      registry[name] = handler

      // Register with Datastar
      registerWithDatastar(name, handler)
    },

    registerAll(plugins: Record<string, PluginHandler>): void {
      for (const [name, handler] of Object.entries(plugins)) {
        api.register(name, handler)
      }
    },

    has(name: string): boolean {
      return name in registry
    },

    getNames(): string[] {
      return Object.keys(registry)
    },

    unregister(name: string): boolean {
      if (registry[name]) {
        delete registry[name]
        // Note: Datastar doesn't provide an unregister API, so the action
        // will still exist in Datastar but will be a no-op since our handler is gone
        return true
      }
      return false
    },
  }

  return api
}

/**
 * Allow runtime plugins to register themselves even if the plugin system
 * is not installed yet (e.g., during module evaluation order).
 */
export function registerRuntimePlugin<TArgs extends unknown[] = unknown[]>(
  name: string,
  handler: PluginHandler<TArgs>
): void {
  if (typeof window === "undefined") return

  if (window.Honostar?.plugins) {
    window.Honostar.plugins.register(name, handler)
    return
  }
  // Queue registration until the plugin system is ready
  ;(window.__honostarPendingPluginRegistrations ??= []).push({
    name,
    handler,
  })
}

/**
 * Install the plugin system on window.Honostar
 * @internal
 */
export function installPluginSystem(datastarEntrypoint?: string): PluginsApi {
  if (!window.Honostar) window.Honostar = {}

  if (window.Honostar.plugins) {
    console.warn("[Honostar] Plugin system already installed")
    return window.Honostar.plugins
  }

  const plugins = createPluginSystem(datastarEntrypoint)
  window.Honostar.plugins = Object.freeze(plugins) as PluginsApi

  // Flush any pending plugin registrations that ran before the system existed
  const pending = window.__honostarPendingPluginRegistrations
  if (pending?.length) {
    for (const { name, handler } of pending) {
      plugins.register(name, handler)
    }
    pending.length = 0
  }

  return plugins
}
