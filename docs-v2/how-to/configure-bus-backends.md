# Configure Bus Backends

HonoStar supports multiple `PubSubBus` implementations with the same app-level CQRS model.

## Choose backend

- `MemoryBus`: single-process dev and simple deploys.
- `RedisBus`: multi-instance fanout with optional retained patch persistence.
- `NatsBus`: multi-instance fanout using NATS subjects.

## 1. MemoryBus (default/simple)

```ts
import { MemoryBus } from "@honostar/core/server"

const bus = new MemoryBus()
app.use("*", async (c, next) => {
  c.set("bus", bus)
  await next()
})
```

## 2. RedisBus

```ts
import Redis from "ioredis"
import { RedisBus } from "@honostar/core/server"

const publisher = new Redis(process.env.REDIS_URL)
const subscriber = publisher.duplicate()
await subscriber.connect()

const bus = new RedisBus({
  publisher,
  subscriber,
  channelPrefix: "honostar:bus",
  retainTtlSec: 3600,
})

app.use("*", async (c, next) => {
  c.set("bus", bus)
  await next()
})
```

Notes:

- Use a dedicated subscriber connection.
- Retained topic patches can be stored in Redis when `set/get` are available.

## 3. NatsBus

```ts
import { connect } from "nats"
import { NatsBus } from "@honostar/core/server"

const nc = await connect({ servers: process.env.NATS_URL })
const bus = new NatsBus({
  connection: nc,
  subjectPrefix: "honostar.bus",
})

app.use("*", async (c, next) => {
  c.set("bus", bus)
  await next()
})
```

## 4. Keep SSE endpoint unchanged

Regardless of bus backend:

```ts
app.get("/_/events", createSseEndpoint(config, { queries: collectedQueries }))
```

## 5. Verify retained patch behavior

`MemoryBus`, `RedisBus`, and `NatsBus` retain only idempotent `datastar-patch-elements` with mode:

- `outer`
- `inner`
- `replace`

Incremental modes (`append`, `prepend`, etc.) are not retained.

## Operational checklist

- Set topic signing secret in production.
- Keep topic names tenant-safe.
- Monitor SSE connection counts and bus publish rates.
