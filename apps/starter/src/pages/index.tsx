import { defineQueryPage, type QueryHandler } from '@honostar/core/server'
import { Counter } from '../components/Counter'
import { getCounter } from '../state'

const counterTopic = 'counter'

export const counterQuery: QueryHandler = async () => {
  return [['patch-elements', <Counter count={getCounter()} />, { selector: '#counter' }]]
}

export default defineQueryPage({
  topics: [counterTopic],
  queries: [[counterTopic, counterQuery]],
  loader: async () => ({
    count: getCounter(),
  }),
  component: props => {
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
