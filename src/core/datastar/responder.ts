import type { Context } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { StatusCode } from 'hono/utils/http-status'
import type { AppEnv } from '@/core/context'
import type {
  ExecuteScriptOptions,
  Jsonifiable,
  PatchElementsOptions,
  PatchSignalsOptions,
} from '@/core/datastar/types'
import { factory } from '@/core/middleware'

export class DatastarResponder {
  private c: Context<AppEnv>

  constructor(c: Context<AppEnv>) {
    this.c = c
  }

  public async navigate(component: JSX.Element, url: string) {
    const html = await this.c.var.renderFragmentToString(component)
    return this.respond({
      toClient: true,
      effects: [
        ['patch-elements', html, { selector: '#app', mode: 'outer' }],
        ['execute-script', `history.pushState({}, '', ${JSON.stringify(url)})`],
      ],
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
    return this.renderAndPatch(topic, component, { mode: 'outer' }, signals)
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

  public async fx(
    topic: string,
    effects: Array<
      | ['patch-elements', JSX.Element | JSX.Element[] | string, PatchElementsOptions?]
      | ['patch-elements-seq', Array<JSX.Element | string>, PatchElementsOptions?]
      | ['patch-signals', Record<string, Jsonifiable>, PatchSignalsOptions?]
      | ['execute-script', string, ExecuteScriptOptions?]
      | ['close-sse']
    >
  ): Promise<void> {
    const renderOne = async (x: JSX.Element | string): Promise<string> => {
      if (typeof x === 'string') return x
      return await this.c.var.renderFragmentToString(x)
    }

    for (const fx of effects) {
      switch (fx[0]) {
        case 'patch-elements': {
          const [, payload, opts] = fx
          const htmls: string[] = Array.isArray(payload)
            ? await Promise.all(payload.map(v => renderOne(v)))
            : [await renderOne(payload)]
          this.patchElements(topic, htmls.join('\n'), opts ?? {})
          break
        }
        case 'patch-elements-seq': {
          const [, payload, opts] = fx
          const htmls = await Promise.all(payload.map(v => renderOne(v)))
          this.patchElements(topic, htmls.join('\n'), opts ?? {})
          break
        }
        case 'patch-signals': {
          const [, payload, opts] = fx
          this.patchSignals(topic, payload, opts ?? {})
          break
        }
        case 'execute-script': {
          const [, payload, opts] = fx
          this.executeScript(topic, payload, opts)
          break
        }
        case 'close-sse': {
          this.c.var.bus.toTopic(topic, { event: 'close' })
          break
        }
        default: {
          const _unhandled: never = fx
          console.warn('[datastar.fx] Unknown effect:', _unhandled)
        }
      }
    }
  }

  async respond(args: {
    effects: Parameters<DatastarResponder['fx']>[1]
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
      for (const e of effects) {
        switch (e[0]) {
          case 'patch-elements':
          case 'patch-elements-seq': {
            const [, payload, opts] = e
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
              options: opts ?? {},
            })
            break
          }
          case 'patch-signals': {
            const [, payload, opts] = e
            this.c.var.bus.toClient(clientId, {
              event: 'datastar-patch-signals',
              signals: JSON.stringify(payload),
              options: opts ?? {},
            })
            break
          }
          case 'execute-script': {
            const [, payload, opts] = e
            this.c.var.bus.toClient(clientId, {
              event: 'execute-script',
              script: payload,
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
    effects: Parameters<DatastarResponder['fx']>[1],
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
    effects: Parameters<DatastarResponder['fx']>[1],
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
