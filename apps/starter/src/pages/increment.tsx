import { defineCommand } from '@honostar/core/server'
import { Counter } from '../components/Counter'
import { incrementCounter } from '../state'

const counterTopic = 'counter'

export const POST = defineCommand({
  async handler(c) {
    const next = incrementCounter()
    c.var.fx.publish(counterTopic, 'counter:incremented', { count: next })
    return c.var.fx.reply([['patch-elements', <Counter count={next} />, { selector: '#counter' }]])
  },
})
