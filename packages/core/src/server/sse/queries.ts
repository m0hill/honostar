import type { Context } from "hono"
import type { Jsonifiable } from "../../common/types"
import type { AppEnv } from "../context"
import type { EffectDefinition } from "./effect-registry"

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

export type QueryOptions = {
  /** Opt-in: coalesce execution+render per-process. */
  shared?: boolean
  /** Cache window in ms for completed results (default: 250). */
  cacheMs?: number
  /**
   * Optional override for the coalescing key.
   * Must be stable and must NOT depend on per-client identity unless you include it yourself.
   */
  key?: (args: {
    topic: string
    eventName?: string
    eventPayload?: unknown
    match0?: string
    sseParams: Record<string, string>
  }) => string
}

export type QueryRegistration =
  | [topicOrPattern: string | RegExp, handler: QueryHandler]
  | [topicOrPattern: string | RegExp, handler: QueryHandler, options: QueryOptions]

export class TopicQueryRegistry {
  private exact = new Map<string, { handler: QueryHandler; options: QueryOptions | undefined }>()
  private patterns: Array<{
    pattern: RegExp
    handler: QueryHandler
    options: QueryOptions | undefined
  }> = []

  register(topic: string, handler: QueryHandler, options?: QueryOptions): void
  register(pattern: RegExp, handler: QueryHandler, options?: QueryOptions): void
  register(topicOrPattern: string | RegExp, handler: QueryHandler, options?: QueryOptions): void {
    if (typeof topicOrPattern === "string") {
      this.exact.set(topicOrPattern, { handler, options })
      return
    }
    this.patterns.push({ pattern: topicOrPattern, handler, options })
  }

  resolve(topic: string): {
    handler: QueryHandler
    options: QueryOptions | undefined
    match?: RegExpMatchArray
  } | null {
    const exact = this.exact.get(topic)
    if (exact) return { handler: exact.handler, options: exact.options }

    for (const { pattern, handler, options } of this.patterns) {
      const match = topic.match(pattern)
      if (match) return { handler, options, match }
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
