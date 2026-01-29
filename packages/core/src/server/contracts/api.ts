import type { StandardSchemaV1 } from "@standard-schema/spec"
import { globalContracts, type TopicMatcher } from "./registry"

export type EventContract<
  TTopic extends TopicMatcher = TopicMatcher,
  TEvent extends string = string,
  TSchema extends StandardSchemaV1 = StandardSchemaV1,
> = Readonly<{
  topic: TTopic
  event: TEvent
  schema: TSchema
}>

class TopicBuilder<TTopic extends string> {
  constructor(public readonly name: TTopic) {}

  event<TEvent extends string, TSchema extends StandardSchemaV1>(
    event: TEvent,
    schema: TSchema
  ): EventContract<TTopic, TEvent, TSchema> {
    globalContracts.register(this.name, event, schema)
    return { topic: this.name, event, schema } as const
  }
}

class TopicPatternBuilder {
  constructor(public readonly pattern: RegExp) {}

  event<TEvent extends string, TSchema extends StandardSchemaV1>(
    event: TEvent,
    schema: TSchema
  ): EventContract<RegExp, TEvent, TSchema> {
    globalContracts.register(this.pattern, event, schema)
    return { topic: this.pattern, event, schema } as const
  }
}

export function topic<TTopic extends string>(name: TTopic): TopicBuilder<TTopic> {
  return new TopicBuilder(name)
}

export function topicPattern(pattern: RegExp): TopicPatternBuilder {
  return new TopicPatternBuilder(pattern)
}

export function defineContracts<T extends readonly EventContract[]>(
  build: (api: { topic: typeof topic; topicPattern: typeof topicPattern }) => T
) {
  const events = build({ topic, topicPattern })
  return { events } as const
}
