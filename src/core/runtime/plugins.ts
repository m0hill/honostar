/**
 * Bonsai Plugin System
 *
 * Provides a clean, type-safe API for registering custom Datastar actions
 * that extend the client runtime without requiring server roundtrips.
 *
 * @example
 * ```typescript
 * // Register a clipboard action
 * window.Bonsai.plugins.register('clipboard', (ctx, text: string) => {
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

type DatastarActionModule = {
  action: (config: {
    name: string
    apply: (ctx: DatastarActionContext, ...args: unknown[]) => void
  }) => void
}

// Datastar action registration function - will be dynamically imported
let datastarAction: DatastarActionModule['action'] | null = null

// Datastar action context (passed as first argument to action handlers)
export interface DatastarActionContext {
  el: HTMLElement
  error: (message: string | Error) => void
}

// Plugin handler signature: receives context + user-defined arguments
export type PluginHandler<TArgs extends unknown[] = unknown[]> = (
  ctx: DatastarActionContext,
  ...args: TArgs
) => void | Promise<void>

type AnyPluginHandler = PluginHandler<unknown[]>
type PendingPluginRegistration = { name: string; handler: AnyPluginHandler }

interface BonsaiWindow extends Window {
  Bonsai?: { plugins?: PluginsApi }
  __bonsaiPendingPluginRegistrations?: PendingPluginRegistration[]
}

// Registry of all registered plugins
interface PluginRegistry {
  [name: string]: AnyPluginHandler
}

// Public API exposed on window.Bonsai.plugins
export interface PluginsApi {
  /**
   * Register a custom Datastar action
   * @param name - Action name (used as @name in templates)
   * @param handler - Action handler function
   *
   * @example
   * ```typescript
   * window.Bonsai.plugins.register('toast', (ctx, message: string, type = 'info') => {
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
   * window.Bonsai.plugins.registerAll({
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
export function createPluginSystem(): PluginsApi {
  const registry: PluginRegistry = {}
  const pendingRegistrations: Array<{ name: string; handler: AnyPluginHandler }> = []

  // Dynamically import Datastar's action function
  const loadDatastar = async () => {
    if (datastarAction) return
    try {
      const datastarEntrypoint = '/datastar.js'
      const ds = (await import(datastarEntrypoint)) as DatastarActionModule
      datastarAction = ds.action
      // Register any pending plugins
      for (const { name, handler } of pendingRegistrations) {
        registerWithDatastar(name, handler)
      }
      pendingRegistrations.length = 0
    } catch (err) {
      console.error('[Bonsai] Failed to load Datastar:', err)
    }
  }

  const registerWithDatastar = (name: string, handler: AnyPluginHandler) => {
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
      console.error(`[Bonsai] Failed to register plugin "${name}" with Datastar:`, err)
    }
  }

  // Start loading Datastar
  loadDatastar()

  const api: PluginsApi = {
    register<TArgs extends unknown[] = unknown[]>(
      name: string,
      handler: PluginHandler<TArgs>
    ): void {
      if (!name || typeof name !== 'string') {
        throw new Error('Plugin name must be a non-empty string')
      }

      if (typeof handler !== 'function') {
        throw new Error('Plugin handler must be a function')
      }

      if (registry[name]) {
        console.warn(`[Bonsai] Plugin "${name}" is already registered. Overwriting.`)
      }

      // Store in our registry
      registry[name] = handler as AnyPluginHandler

      // Register with Datastar
      registerWithDatastar(name, handler as AnyPluginHandler)
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
  if (typeof window === 'undefined') return

  const w = window as BonsaiWindow

  if (w.Bonsai?.plugins) {
    w.Bonsai.plugins.register(name, handler)
    return
  }
  // Queue registration until the plugin system is ready
  ;(w.__bonsaiPendingPluginRegistrations ??= []).push({
    name,
    handler: handler as AnyPluginHandler,
  })
}

/**
 * Install the plugin system on window.Bonsai
 * @internal
 */
export function installPluginSystem(): PluginsApi {
  const w = window as BonsaiWindow
  if (!w.Bonsai) w.Bonsai = {}

  if (w.Bonsai.plugins) {
    console.warn('[Bonsai] Plugin system already installed')
    return w.Bonsai.plugins
  }

  const plugins = createPluginSystem()
  w.Bonsai.plugins = Object.freeze(plugins) as PluginsApi

  // Flush any pending plugin registrations that ran before the system existed
  const pending = w.__bonsaiPendingPluginRegistrations
  if (pending?.length) {
    for (const { name, handler } of pending) {
      plugins.register(name, handler as PluginHandler)
    }
    pending.length = 0
  }

  return plugins
}
