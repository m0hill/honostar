import { factory, MemoryBus, type PubSubBus } from '@/honostar/server'

const createBus = async (): Promise<PubSubBus> => {
  // Check for NATS first
  const natsUrl = process.env.HONOSTAR_NATS_URL
  if (natsUrl) {
    try {
      const { NatsBus } = await import('@/honostar/server')
      const { connect } = await import('nats')
      const nc = await connect({ servers: natsUrl })
      console.log('[bus] Connected to NATS')
      return new NatsBus({ connection: nc })
    } catch (err) {
      console.error('[bus] Failed to connect to NATS, falling back to MemoryBus', err)
      return new MemoryBus()
    }
  }

  // Check for Redis second
  const redisUrl = process.env.HONOSTAR_REDIS_URL
  if (redisUrl) {
    try {
      const { RedisBus } = await import('@/honostar/server')
      const Redis = (await import('ioredis')).default
      const publisher = new Redis(redisUrl, { lazyConnect: true })
      const subscriber = new Redis(redisUrl, { lazyConnect: true })

      void publisher.connect().catch(err => {
        console.error('[bus] Failed to connect Redis publisher', err)
      })
      void subscriber.connect().catch(err => {
        console.error('[bus] Failed to connect Redis subscriber', err)
      })

      console.log('[bus] Connected to Redis')
      return new RedisBus({ publisher, subscriber })
    } catch (err) {
      console.error('[bus] Failed to connect to Redis, falling back to MemoryBus', err)
      return new MemoryBus()
    }
  }

  // Default to MemoryBus
  console.log('[bus] Using MemoryBus (in-process)')
  return new MemoryBus()
}

const busPromise = createBus()
let appBus: PubSubBus

// Initialize bus eagerly
void busPromise.then(bus => {
  appBus = bus
})

export const attachBus = factory.createMiddleware(async (c, next) => {
  if (!appBus) {
    appBus = await busPromise
  }
  c.set('bus', appBus)
  await next()
})

export const getBus = async (): Promise<PubSubBus> => {
  if (!appBus) {
    appBus = await busPromise
  }
  return appBus
}
