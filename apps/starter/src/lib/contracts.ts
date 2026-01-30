import { defineContracts, schema, topic } from "@honostar/core/server"
import { topics } from "./ids"

export const counterIncremented = topic(topics.counter).event(
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

export const contracts = defineContracts(() => [counterIncremented] as const)
