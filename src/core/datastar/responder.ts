import type { Context } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { StatusCode } from 'hono/utils/http-status'
import type { AppEnv } from '@/core/context'
import type { EffectDefinition } from '@/core/datastar/effect-registry'
import { EffectRegistry } from '@/core/datastar/effect-registry'
import type {
  ExecuteScriptOptions,
  Jsonifiable,
  PatchElementsOptions,
  PatchSignalsOptions,
} from '@/core/datastar/types'
import { factory } from '@/core/middleware'

export class DatastarResponder {
  private c: Context<AppEnv>
  public effectRegistry: EffectRegistry

  constructor(c: Context<AppEnv>) {
    this.c = c
    this.effectRegistry = new EffectRegistry()
    this.registerBuiltInEffects()
  }

  /**
   * Register all built-in effects.
   * This replaces the old switch statement approach with a registry-based system.
   *
   * Note: These are placeholder registrations for extensibility. The actual effect
   * logic is handled by the switch statement in the fx() method for performance.
   * Custom user effects will be executed via the registry before falling through
   * to the built-in handlers.
   */
  private registerBuiltInEffects(): void {
    // patch-elements: Render JSX and send HTML patch
    this.effectRegistry.register(
      'patch-elements',
      async (_c, _payload: JSX.Element | JSX.Element[] | string, _opts?: PatchElementsOptions) => {
        // Placeholder - actual logic in fx() switch statement
      }
    )

    // patch-elements-seq: Similar to patch-elements but for sequences
    this.effectRegistry.register(
      'patch-elements-seq',
      async (_c, _payload: Array<JSX.Element | string>, _opts?: PatchElementsOptions) => {
        // Placeholder - actual logic in fx() switch statement
      }
    )

    // patch-signals: Update reactive signals
    this.effectRegistry.register(
      'patch-signals',
      async (_c, _payload: Record<string, Jsonifiable>, _opts?: PatchSignalsOptions) => {
        // Placeholder - actual logic in fx() switch statement
      }
    )

    // execute-script: Execute JavaScript code
    this.effectRegistry.register(
      'execute-script',
      async (_c, _script: string, _opts?: ExecuteScriptOptions) => {
        // Placeholder - actual logic in fx() switch statement
      }
    )

    // close-sse: Close the SSE connection
    this.effectRegistry.register('close-sse', async _c => {
      // Placeholder - actual logic in fx() switch statement
    })
  }

  private patchElements(topic: string, html: string, options: PatchElementsOptions) {
    this.c.var.bus.toTopic(topic, {
      event: 'datastar-patch-elements',
      html,
      options,
    })
  }

  private patchSignals(
    topic: string,
    signals: Record<string, Jsonifiable>,
    options?: PatchSignalsOptions
  ) {
    this.c.var.bus.toTopic(topic, {
      event: 'datastar-patch-signals',
      signals: JSON.stringify(signals),
      options: options ?? {},
    })
  }

  private executeScript(topic: string, script: string, options?: ExecuteScriptOptions) {
    this.c.var.bus.toTopic(topic, {
      event: 'execute-script',
      script,
      ...(options && { options }),
    })
  }

  private async renderAndPatch(
    topic: string,
    component: JSX.Element | null,
    options: PatchElementsOptions,
    signals?: Record<string, Jsonifiable>
  ) {
    if (signals) {
      this.patchSignals(topic, signals)
    }

    const fragment = component ? await this.c.var.renderFragmentToString(component) : ''
    this.patchElements(topic, fragment, options)
  }

  append(
    topic: string,
    selector: string,
    component: JSX.Element,
    signals?: Record<string, Jsonifiable>
  ) {
    return this.renderAndPatch(topic, component, { mode: 'append', selector }, signals)
  }

  prepend(
    topic: string,
    selector: string,
    component: JSX.Element,
    signals?: Record<string, Jsonifiable>
  ) {
    return this.renderAndPatch(topic, component, { mode: 'prepend', selector }, signals)
  }

  update(topic: string, component: JSX.Element, signals?: Record<string, Jsonifiable>) {
    // Using default mode (outer morph) - no need to specify explicitly
    return this.renderAndPatch(topic, component, {}, signals)
  }

  remove(topic: string, selector: string, signals?: Record<string, Jsonifiable>) {
    if (signals) {
      this.patchSignals(topic, signals)
    }
    this.patchElements(topic, '', { mode: 'remove', selector })
  }

  removeSignals(topic: string, keys: string | string[]) {
    const arr = Array.isArray(keys) ? keys : [keys]
    const patch: Record<string, null> = {}
    for (const k of arr) patch[k] = null
    this.patchSignals(topic, patch)
  }

  noContent() {
    return this.c.body(null, 204)
  }

  /**
   * Execute effects using the extensible registry system.
   * This is the new primary method for running effects.
   * It tries the registry first, then falls back to built-in switch handling.
   */
  public async fx(topic: string, effects: EffectDefinition[]): Promise<void> {
    const renderOne = async (x: JSX.Element | string): Promise<string> => {
      if (typeof x === 'string') return x
      return await this.c.var.renderFragmentToString(x)
    }

    for (const fx of effects) {
      const [effectName, ...args] = fx

      // Try registry first (extensibility layer)
      if (this.effectRegistry.has(effectName)) {
        // Call the registered handler
        await this.effectRegistry.execute(this.c, effectName, ...args)
      }

      // Handle built-in effects (core functionality)
      // This keeps backward compatibility and handles the actual bus communication
      switch (effectName) {
        case 'patch-elements': {
          const [payload, opts] = args as [
            JSX.Element | JSX.Element[] | string,
            PatchElementsOptions?,
          ]
          const htmls: string[] = Array.isArray(payload)
            ? await Promise.all(payload.map(v => renderOne(v)))
            : [await renderOne(payload)]
          this.patchElements(topic, htmls.join('\n'), opts || {})
          break
        }
        case 'patch-elements-seq': {
          const [payload, opts] = args as [Array<JSX.Element | string>, PatchElementsOptions?]
          const htmls = await Promise.all(payload.map(v => renderOne(v)))
          this.patchElements(topic, htmls.join('\n'), opts || {})
          break
        }
        case 'patch-signals': {
          const [payload, opts] = args as [Record<string, Jsonifiable>, PatchSignalsOptions?]
          this.patchSignals(topic, payload, opts)
          break
        }
        case 'execute-script': {
          const [script, opts] = args as [string, ExecuteScriptOptions?]
          this.executeScript(topic, script, opts)
          break
        }
        case 'close-sse': {
          this.c.var.bus.toTopic(topic, { event: 'close' })
          break
        }
        default: {
          // Unknown effect - warning already logged by registry.execute
          break
        }
      }
    }
  }

  async respond(args: {
    effects: EffectDefinition[]
    topics?: string[]
    toClient?: boolean
    close?: boolean
    status?: StatusCode
    headers?: Record<string, string>
  }) {
    const effects = args.effects

    if (args.topics) {
      await Promise.all(args.topics.map(t => this.fx(t, effects)))
    }

    if (args.toClient) {
      const clientId = this.c.var.clientId
      for (const fx of effects) {
        const [effectName, ...args] = fx

        // Try registry first for custom effects
        if (
          this.effectRegistry.has(effectName) &&
          ![
            'patch-elements',
            'patch-elements-seq',
            'patch-signals',
            'execute-script',
            'close-sse',
          ].includes(effectName)
        ) {
          // Custom effect - call the registered handler
          await this.effectRegistry.execute(this.c, effectName, ...args)
          continue
        }

        // Handle built-in effects for client
        switch (effectName) {
          case 'patch-elements':
          case 'patch-elements-seq': {
            const [payload, opts] = args as [
              JSX.Element | JSX.Element[] | string | Array<JSX.Element | string>,
              PatchElementsOptions?,
            ]
            const renderOne = async (x: JSX.Element | string): Promise<string> => {
              if (typeof x === 'string') return x
              return await this.c.var.renderFragmentToString(x)
            }
            const htmls = Array.isArray(payload)
              ? await Promise.all(payload.map(v => renderOne(v)))
              : [await renderOne(payload)]
            this.c.var.bus.toClient(clientId, {
              event: 'datastar-patch-elements',
              html: htmls.join('\n'),
              options: opts || {},
            })
            break
          }
          case 'patch-signals': {
            const [payload, opts] = args as [Record<string, Jsonifiable>, PatchSignalsOptions?]
            this.c.var.bus.toClient(clientId, {
              event: 'datastar-patch-signals',
              signals: JSON.stringify(payload),
              options: opts || {},
            })
            break
          }
          case 'execute-script': {
            const [script, opts] = args as [string, ExecuteScriptOptions?]
            this.c.var.bus.toClient(clientId, {
              event: 'execute-script',
              script,
              ...(opts && { options: opts }),
            })
            break
          }
          case 'close-sse':
            this.c.var.bus.toClient(clientId, { event: 'close' })
            break
        }
      }
    }

    if (args.close && args.topics) {
      for (const t of args.topics) this.c.var.bus.toTopic(t, { event: 'close' })
    }

    const status = args.status ?? 204
    const headers = args.headers ?? {}
    return this.c.body(null, status, headers)
  }

  public async reply(
    effects: EffectDefinition[],
    options?: { status?: StatusCode; headers?: Record<string, string> }
  ) {
    return this.respond({
      effects,
      toClient: true,
      ...options,
    })
  }

  public async broadcast(
    topic: string | string[],
    effects: EffectDefinition[],
    options?: { status?: StatusCode; headers?: Record<string, string>; close?: boolean }
  ) {
    const topics = Array.isArray(topic) ? topic : [topic]
    return this.respond({
      effects,
      topics,
      ...options,
    })
  }
}

export const datastarResponder = factory.createMiddleware(async (c, next) => {
  c.set('datastar', new DatastarResponder(c))
  await next()
})
