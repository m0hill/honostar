import type { Context } from "hono"
import type { JSX } from "hono/jsx/jsx-runtime"
import type {
  ExecuteScriptOptions,
  Jsonifiable,
  PatchElementsOptions,
  PatchSignalsOptions,
} from "../../common/types"
import type { AppEnv } from "../context"
import type { RegionPatch, RegionPatchSeq } from "../regions"

/**
 * Effect handler function signature.
 * Takes context and effect-specific arguments, returns Promise<void>.
 */
export type EffectHandler<TArgs extends unknown[] = unknown[]> = {
  bivarianceHack(c: Context<AppEnv>, ...args: TArgs): Promise<void>
}["bivarianceHack"]

/**
 * Built-in effect names that come with Honostar.
 */
export type BuiltInEffectName =
  | "patch-elements"
  | "patch-elements-seq"
  | "patch-region"
  | "patch-region-seq"
  | "patch-signals"
  | "execute-script"
  | "close-sse"

/**
 * Effect definition - a tuple of effect name and its arguments.
 * Supports both built-in effects and custom user-defined effects.
 */
export type EffectDefinition =
  | ["patch-elements", JSX.Element | JSX.Element[] | string, PatchElementsOptions?]
  | ["patch-elements-seq", Array<JSX.Element | string>, PatchElementsOptions?]
  | ["patch-region", RegionPatch]
  | ["patch-region-seq", RegionPatchSeq]
  | ["patch-signals", Record<string, Jsonifiable>, PatchSignalsOptions?]
  | ["execute-script", string, ExecuteScriptOptions?]
  | ["close-sse"]
  | [string, ...unknown[]] // Allow custom effects with any args

/**
 * The Effect Registry - a map of effect names to their handler functions.
 * This enables extensibility: users can register their own effects.
 */
export class EffectRegistry {
  private handlers = new Map<string, EffectHandler>()

  /**
   * Register an effect handler.
   * @param name - The effect name (e.g., 'toast:show', 'modal:close')
   * @param handler - The handler function to execute this effect
   */
  register<TArgs extends unknown[] = unknown[]>(name: string, handler: EffectHandler<TArgs>): void {
    if (this.handlers.has(name)) {
      console.warn(`[Honostar] Effect '${name}' is being overridden`)
    }
    this.handlers.set(name, handler)
  }

  /**
   * Get an effect handler by name.
   * @param name - The effect name
   * @returns The handler function, or undefined if not found
   */
  get(name: string): EffectHandler | undefined {
    return this.handlers.get(name)
  }

  /**
   * Check if an effect is registered.
   * @param name - The effect name
   * @returns true if the effect is registered
   */
  has(name: string): boolean {
    return this.handlers.has(name)
  }

  /**
   * Unregister an effect handler.
   * @param name - The effect name
   * @returns true if the effect was removed, false if it didn't exist
   */
  unregister(name: string): boolean {
    return this.handlers.delete(name)
  }

  /**
   * Get all registered effect names.
   * @returns Array of effect names
   */
  getEffectNames(): string[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Execute an effect by name with the given arguments.
   * @param c - Hono context
   * @param name - The effect name
   * @param args - Arguments to pass to the handler
   * @returns Promise that resolves when the effect completes
   */
  async execute(c: Context<AppEnv>, name: string, ...args: unknown[]): Promise<void> {
    const handler = this.handlers.get(name)
    if (!handler) {
      console.warn(`[Honostar] Unknown effect: ${name}`)
      return
    }
    await handler(c, ...args)
  }

  /**
   * Create a new registry with all handlers from this registry.
   * Useful for creating isolated registry instances.
   */
  clone(): EffectRegistry {
    const cloned = new EffectRegistry()
    for (const [name, handler] of this.handlers.entries()) {
      cloned.register(name, handler)
    }
    return cloned
  }
}

/**
 * Helper type to extract effect arguments from an effect definition tuple.
 */
export type EffectArgs<T> = T extends [string, ...infer Args] ? Args : never

/**
 * Type-safe effect registration helper.
 * Ensures the handler signature matches the effect definition.
 */
export type TypedEffectHandler<TDef extends [string, ...unknown[]]> = EffectHandler<
  EffectArgs<TDef>
>
