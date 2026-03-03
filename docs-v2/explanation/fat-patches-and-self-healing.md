# Fat Patches and Self-Healing

A fat patch is a patch that re-renders the whole canonical region, not a minimal incremental diff.

## Why fat patches are default

SSE is reliable in practice but not infallible:

- tabs sleep/background
- mobile radios flap
- intermediaries reconnect
- clients can miss a sequence of incremental events

If each event depends on prior events, UI drift accumulates.

Fat patches make each query response a full correction point.

## Region-centered discipline

HonoStar encourages:

- render canonical targets as named regions
- patch by region ID (`patchRegion`)
- default to `outer`/`replace`/`inner` modes

This avoids fragile selector drift and makes policy enforcement possible.

## When incremental patches are appropriate

Incremental modes (`append`, `prepend`, `before`, `after`) are valid for:

- toasts/overlays
- streaming logs
- intentionally lossy visual feeds

They are risky for canonical shared state unless your design explicitly tolerates dropped intermediate updates.

## Retained patch synergy

Bus implementations can retain last idempotent patch per topic. On reconnect, SSE endpoint can replay retained patch immediately, reducing stale-state windows.

Retained and fat patches work together:

- retained patch gives instant coarse recovery
- query-driven fat patch gives canonical recovery
