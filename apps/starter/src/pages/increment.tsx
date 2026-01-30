import { defineCommand } from "@honostar/core/server"
import { counterIncremented } from "../lib/contracts"
import { incrementCounter } from "../state"

export const POST = defineCommand({
  async handler(c) {
    const next = incrementCounter()
    await c.var.fx.publish(counterIncremented, { count: next })
    return c.var.fx.ok()
  },
})
