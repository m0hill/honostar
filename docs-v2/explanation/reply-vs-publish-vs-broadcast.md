# Reply vs Publish vs Broadcast

These three APIs look similar but represent different semantics.

## `reply(...)`

Scope: initiating tab only.

Best for:

- validation errors
- modal open/close
- local toasts
- temporary interaction signals

Transport optimization:

- single built-in patch effects can return as HTTP patch responses for Datastar requests
- otherwise delivered through SSE client channel

## `publish(...)`

Scope: topic event fanout.

Best for:

- declaring shared state transitions
- triggering query re-renders for canonical UI

`publish(...)` emits events; it does not patch DOM directly.

## `broadcast(...)`

Scope: direct effect fanout to topic subscribers.

Best for:

- exceptional shared effects where query indirection is unnecessary
- non-canonical side channels

For canonical shared state, `publish` + query re-render remains the default because it preserves server-authoritative healing.

## Decision rule

- shared model changed -> `publish(...)`
- only initiator needs feedback -> `reply(...)`
- shared direct effect without query step -> `broadcast(...)` (careful)

## Why this separation matters

Without this separation, app code tends to mix mutation, rendering, and transport in command handlers. That increases drift and makes recovery harder.

With separation, commands stay focused on state transitions, and queries stay focused on rendering canonical snapshots.
