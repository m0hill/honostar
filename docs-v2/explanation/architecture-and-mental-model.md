# Architecture and Mental Model

HonoStar's core model is:

1. server-rendered HTML is canonical truth
2. mutations publish domain events
3. queries re-render canonical regions over SSE
4. client runtime is progressive enhancement, not state authority

## Why this model exists

Traditional SPA state synchronization shifts distributed consistency into the browser. HonoStar moves that burden back to the server where shared state already lives.

This yields a clearer separation:

- **Commands**: write operations and event publication
- **Queries**: read operations and canonical UI composition

## What the client owns

The client owns:

- transient interaction state (signals, modals, indicators)
- enhancement ergonomics (prefetch, view transitions, plugins)

The client does not own canonical shared state.

## CQRS in HonoStar terms

In HonoStar, CQRS is operational rather than theoretical:

- command returns quick tab-scoped feedback when needed
- command publishes domain event for shared state
- SSE endpoint triggers query handlers
- query returns full region patch

This keeps shared UI deterministic and recoverable.

## Practical implications

- Real links and forms remain first-class.
- You can degrade gracefully when JavaScript is constrained.
- Reconnect behavior can self-heal by replaying canonical patches.
- Multi-tab and multi-instance behavior becomes a transport concern, not ad-hoc client logic.
