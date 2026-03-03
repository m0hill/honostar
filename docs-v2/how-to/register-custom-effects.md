# Register Custom Effects

Custom effects let you express domain UI behavior with semantic effect names.

## 1. Create effect handlers

```ts
import type { EffectHandler } from "@honostar/core/server"

export const toastShow: EffectHandler<[message: string, kind: "success" | "error"]> = async (
  c,
  message,
  kind
) => {
  await c.var.fx.reply([
    ["patch-elements", <Toast message={message} kind={kind} />, { selector: "#toast-container", mode: "append" }],
  ])
}
```

## 2. Register effects in middleware

```ts
import { registerEffects } from "@honostar/core/server"

app.use("*", fxResponder)
app.use("*", registerEffects({ "toast:show": toastShow }))
```

Register after `fxResponder` so `c.var.fx` is available in handlers.

## 3. Use custom effect in commands

```ts
return c.var.fx.reply([["toast:show", "Issue created", "success"]])
```

## 4. Prefer semantic grouping

Use namespaced names:

- `toast:show`
- `modal:close`
- `issue:created`
- `analytics:track`

## 5. Inspect and test effect registry

`c.var.fx.effectRegistry` supports:

- `has(name)`
- `getEffectNames()`
- `unregister(name)`
- `clone()`

## Guidance

- Good candidate: repeated multi-effect UI behavior.
- Bad candidate: one-off wrappers around single built-in effects.
- Keep shared-state mutation in commands/services; use effects for transport/UI orchestration.
