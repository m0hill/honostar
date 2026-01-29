import { defineCommand, patchRegion } from "@honostar/core/server"
import { Counter } from "../components/Counter"
import { counterIncremented } from "../lib/contracts"
import { incrementCounter } from "../state"

const counterTopic = "counter"

export const POST = defineCommand({
  async handler(c) {
    const next = incrementCounter()
    const dot = `<circle cx="6" cy="6" r="5" fill="${next % 2 === 0 ? "#22c55e" : "#ef4444"}"></circle>`
    await c.var.fx.publish(counterIncremented, { count: next })
    return c.var.fx.reply([
      patchRegion(counterTopic, <Counter count={next} />),
      patchRegion("counter:dot", dot, { mode: "inner", namespace: "svg" }),
    ])
  },
})
