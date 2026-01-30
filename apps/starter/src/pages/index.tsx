import { defineQueryPage, patchRegion, type QueryHandler } from "@honostar/core/server"
import { Counter } from "../components/Counter"
import { app, ids } from "../lib/app"
import { getCounter } from "../state"
import { routes } from "../generated/routes"

export const counterQuery: QueryHandler = async () => {
  const count = getCounter()
  const dot = `<circle cx="6" cy="6" r="5" fill="${count % 2 === 0 ? "#22c55e" : "#ef4444"}"></circle>`
  return [
    patchRegion(ids.regions.counter, <Counter count={count} />),
    patchRegion(ids.regions.counterDot, dot, { mode: "inner", namespace: "svg" }),
  ]
}

export default defineQueryPage({
  topics: [app.ids.topics.counter],
  queries: [[app.ids.topics.counter, counterQuery]],
  regions: [...app.regions],
  loader: async () => ({
    count: getCounter(),
  }),
  component: (props) => {
    return (
      <main>
        <h1>HonoStar Starter</h1>
        <p>This is a minimal app wired to the HonoStar core package.</p>

        <Counter count={props.count} />

        <button data-on:click={`@post('${routes.increment.href()}')`}>Increment</button>
      </main>
    )
  },
})
