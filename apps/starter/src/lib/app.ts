import { createApp, defineContracts, schema, topic } from "@honostar/core/server"

const topics = {
  counter: "counter",
} as const

const regions = {
  counter: { id: topics.counter, kind: "card" },
  counterDot: { id: `${topics.counter}:dot`, kind: "icon" },
} as const

const counterIncremented = topic(topics.counter).event(
  "counter:incremented",
  schema<{ count: number }>({
    validate(value): value is { count: number } {
      return (
        typeof value === "object" &&
        value !== null &&
        "count" in value &&
        typeof (value as { count?: unknown }).count === "number"
      )
    },
  })
)

const contracts = defineContracts(() => [counterIncremented] as const)

export const app = createApp({
  topics,
  regions,
  contracts,
})

export const ids = app.ids
