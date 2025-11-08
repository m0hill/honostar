import Redis from 'ioredis'
import { MemoryBus, type PubSubBus } from '@/core/datastar/bus'
import { RedisBus } from '@/core/datastar/redis-bus'
import { factory } from '@/core/middleware'

const createBus = (): PubSubBus => {
  const redisUrl = process.env.BONSAI_REDIS_URL ?? process.env.REDIS_URL
  if (!redisUrl) {
    return new MemoryBus()
  }

  try {
    const publisher = new Redis(redisUrl, { lazyConnect: true })
    const subscriber = new Redis(redisUrl, { lazyConnect: true })

    void publisher.connect().catch(err => {
      console.error('[bus] Failed to connect Redis publisher', err)
    })
    void subscriber.connect().catch(err => {
      console.error('[bus] Failed to connect Redis subscriber', err)
    })

    return new RedisBus({ publisher, subscriber })
  } catch (err) {
    console.error('[bus] Falling back to MemoryBus due to Redis init error', err)
    return new MemoryBus()
  }
}

const appBus = createBus()

export const attachBus = factory.createMiddleware(async (c, next) => {
  c.set('bus', appBus)
  await next()
})

export { appBus as bus }
