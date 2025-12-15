import type { Context } from 'hono'
import type { Jsonifiable } from '@/honostar/common/types'
import type { AppEnv } from '@/honostar/server/context'
import type { EffectDefinition } from '@/honostar/server/sse/effect-registry'

export type DomainEvent = {
  name: string
  payload: Jsonifiable | null
}

export type QueryHandler = (args: {
  c: Context<AppEnv>
  topic: string
  event?: DomainEvent
  match?: RegExpMatchArray
}) => Promise<EffectDefinition[] | void>

export type QueryRegistration = [topicOrPattern: string | RegExp, handler: QueryHandler]

export class TopicQueryRegistry {
  private exact = new Map<string, QueryHandler>()
  private patterns: Array<{ pattern: RegExp; handler: QueryHandler }> = []

  register(topic: string, handler: QueryHandler): void
  register(pattern: RegExp, handler: QueryHandler): void
  register(topicOrPattern: string | RegExp, handler: QueryHandler): void {
    if (typeof topicOrPattern === 'string') {
      this.exact.set(topicOrPattern, handler)
      return
    }
    this.patterns.push({ pattern: topicOrPattern, handler })
  }

  resolve(topic: string): { handler: QueryHandler; match?: RegExpMatchArray } | null {
    const exact = this.exact.get(topic)
    if (exact) return { handler: exact }

    for (const { pattern, handler } of this.patterns) {
      const match = topic.match(pattern)
      if (match) return { handler, match }
    }

    return null
  }

  has(topic: string): boolean {
    return this.resolve(topic) !== null
  }

  async run(args: { c: Context<AppEnv>; topic: string; event?: DomainEvent }) {
    const resolved = this.resolve(args.topic)
    if (!resolved) return null
    const fx = await resolved.handler({
      c: args.c,
      topic: args.topic,
      ...(args.event !== undefined ? { event: args.event } : {}),
      ...(resolved.match ? { match: resolved.match } : {}),
    })
    return fx ?? null
  }
}
