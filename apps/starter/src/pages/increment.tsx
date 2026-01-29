import { defineCommand } from "@honostar/core/server"
import { Counter } from "../components/Counter"
import { incrementCounter } from "../state"

const counterTopic = "counter"

export const POST = defineCommand({
  async handler(c) {
    const next = incrementCounter()
    const dot = `<circle cx="6" cy="6" r="5" fill="${next % 2 === 0 ? "#22c55e" : "#ef4444"}"></circle>`
    c.var.fx.publish(counterTopic, "counter:incremented", { count: next })
    return c.var.fx.reply([
      ["patch-elements", <Counter count={next} />, { selector: "#counter" }],
      ["patch-elements", dot, { selector: "#counter-dot", mode: "inner", namespace: "svg" }],
    ])
  },
})
