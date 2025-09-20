import type { Context, MiddlewareHandler } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { AppEnv } from './context'
import type { PatchElementsOptions } from './datastar/types'

export class DatastarResponder {
  private c: Context<AppEnv>

  constructor(c: Context<AppEnv>) {
    this.c = c
  }

  private async patch(topic: string, html: string, options: PatchElementsOptions) {
    this.c.var.bus.toTopic(topic, {
      event: 'datastar-patch-elements',
      html,
      options,
    })
  }

  async renderAndPatch(
    topic: string,
    component: JSX.Element | null,
    options: PatchElementsOptions
  ) {
    const fragment = component ? await this.c.var.renderFragmentToString(component) : ''
    await this.patch(topic, fragment, options)
  }

  append(topic: string, selector: string, component: JSX.Element) {
    return this.renderAndPatch(topic, component, { mode: 'append', selector })
  }

  prepend(topic: string, selector: string, component: JSX.Element) {
    return this.renderAndPatch(topic, component, { mode: 'prepend', selector })
  }

  update(topic: string, component: JSX.Element) {
    return this.renderAndPatch(topic, component, { mode: 'outer' })
  }

  remove(topic: string, selector: string) {
    return this.patch(topic, '', { mode: 'remove', selector })
  }

  noContent() {
    return this.c.body(null, 204)
  }
}

export const datastarResponder = (): MiddlewareHandler<AppEnv> => async (c, next) => {
  c.set('datastar', new DatastarResponder(c))
  await next()
}
