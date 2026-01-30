import { defineCommand } from "@honostar/core/server"
import { app } from "../lib/app"
import { incrementCounter } from "../state"

export const POST = defineCommand({
  async handler(c) {
    const next = incrementCounter()
    await c.var.fx
      .withContracts(app.contracts)
      .publish(app.ids.topics.counter, "counter:incremented", {
        count: next,
      })
    return c.var.fx.ok()
  },
})
