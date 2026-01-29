import { defineQueryPage, patchRegion, type QueryHandler } from "@honostar/core/server"
import { Counter } from "../components/Counter"
import { getCounter } from "../state"

const counterTopic = "counter"

export const counterQuery: QueryHandler = async () => {
  const count = getCounter()
  const dot = `<circle cx="6" cy="6" r="5" fill="${count % 2 === 0 ? "#22c55e" : "#ef4444"}"></circle>`
  return [
    patchRegion(counterTopic, <Counter count={count} />),
    patchRegion("counter:dot", dot, { mode: "inner", namespace: "svg" }),
  ]
}

export default defineQueryPage({
  topics: [counterTopic],
  queries: [[counterTopic, counterQuery]],
  loader: async () => ({
    count: getCounter(),
  }),
  component: (props) => {
    return (
      <main>
        <h1>HonoStar Starter</h1>
        <p>This is a minimal app wired to the HonoStar core package.</p>

        <Counter count={props.count} />

        <button data-on:click="@post('/increment')">Increment</button>
      </main>
    )
  },
})
