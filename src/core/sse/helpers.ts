import type { Context, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { AppEnv } from '@/core/context'
import type { Jsonifiable, PatchElementsOptions } from '@/core/datastar/types'

export class DatastarResponder {
  private c: Context<AppEnv>

  constructor(c: Context<AppEnv>) {
    this.c = c
  }

  private patchElements(topic: string, html: string, options: PatchElementsOptions) {
    this.c.var.bus.toTopic(topic, {
      event: 'datastar-patch-elements',
      html,
      options,
    })
  }

  private patchSignals(topic: string, signals: Record<string, Jsonifiable>) {
    this.c.var.bus.toTopic(topic, {
      event: 'datastar-patch-signals',
      signals: JSON.stringify(signals),
      options: {},
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

  noContent() {
    return this.c.body(null, 204)
  }
}

export const datastarResponder = (): MiddlewareHandler<AppEnv> => async (c, next) => {
  c.set('datastar', new DatastarResponder(c))
  await next()
}
