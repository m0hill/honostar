# Client Runtime API

Reference for `@honostar/core/client` and `@honostar/standard` bootstrap behavior.

## Minimal bootstrap

Import:

```ts
import "@honostar/core/client/bootstrap/minimal"
```

Minimal bootstrap installs:

- fetch augmentation (`X-Tab-ID`, `X-CSRF-Token`)
- theme controller/actions
- stream runtime watchers (`datastar-honostar-stream-*`)
- `window.Honostar.theme`

## Standard bootstrap

Import:

```ts
import "@honostar/standard/client/bootstrap/standard"
```

Standard adds on top of minimal:

- plugin system installation
- dynamic plugin module loading from `runtime-data.assets.plugins`
- prefetch client startup
- image enhancements
- reveal-focus behavior
- modal host
- optional inspector integration

## `@honostar/core/client` exports

- `createPrefetchClient`
- `installFetchAugmentation`
- `onPageRevealFocusApp`
- `ensureHonostar`, `freeze`
- `installImageEnhancements`
- `createModalHost`
- `installPluginSystem`, `registerRuntimePlugin`
- `installStreamRuntime`
- `readRuntimeData`
- `ensureTabId`
- `createThemeController`, `installThemeActions`

## Plugin system

`window.Honostar.plugins` API:

- `register(name, handler)`
- `registerAll(record)`
- `has(name)`
- `getNames()`
- `unregister(name)`

Handlers receive Datastar action context + expression args.

## Prefetch client

Key features:

- strategy-based prefetch (`hover`, `intent`, `visible`, `immediate`, `tap`)
- same-origin/data-saver/connection-aware gating
- TTL cache with entry bound
- per-link overrides via `data-prefetch-*`

## Streams runtime

Installs watchers and exposes:

```ts
window.Honostar.streams.subscribe(streamId, handler)
```

Event types:

- `open`
- `chunk`
- `close`
- `error`

Chunks can target signal or selector text append/replace.

## Theme runtime

`createThemeController(config)` manages:

- preference: `light | dark | system`
- resolved theme updates
- storage + cookie sync
- optional transition suppression class

Actions are exposed at `window.Honostar.actions.theme`.
