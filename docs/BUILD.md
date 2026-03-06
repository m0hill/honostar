# Build & Assets (Vite + Manifest)

This repo uses **Vite** to bundle browser assets and a **Vite manifest** (`dist/manifest.json`) to map entrypoints → hashed outputs.

Honostar keeps this **explicit**: apps read the manifest and pass resolved asset URLs into `createConfig({ assets: ... })`. This is declarative (you can see what URLs you’re using) while still avoiding hardcoded hashed filenames.

## How it works

### 1) Vite builds into `dist/`

Each app has a `vite.config.ts` that:

- builds into `dist/`
- writes `dist/manifest.json`
- uses Rollup inputs for the Honostar entrypoints

Example inputs:

- `src/client.ts` (Honostar runtime bootstrap)
- `styles.css` (app CSS entry; Tailwind can live here)
- optional: `src/lib/plugins/index.ts` (Datastar/Honostar plugins)

### 2) Server serves the built files at `/assets/*`

Apps serve `dist/` at `/assets/*` so Vite outputs (like `assets/runtime-<hash>.js`) are accessible.

Datastar is typically served as a stable file from `public/` at `/datastar.js` (not hashed).

### 3) The renderer injects the right URLs automatically

Honostar’s `renderer()` injects whatever is in `config.assets.*`. With Vite, those URLs should come from the manifest.

Recommended pattern (app code):

```ts
import { readViteManifest, resolveHonostarAssetsFromViteManifest } from "@honostar/core/server/node"

const manifest = await readViteManifest(new URL("../dist/manifest.json", import.meta.url))
const viteAssets = resolveHonostarAssetsFromViteManifest(manifest, {
  baseUrl: "",
  runtimeEntry: "src/client.ts",
  cssEntry: "styles.css",
  pluginsEntries: ["src/lib/plugins/index.ts"], // optional
})

const config = createConfig({
  assets: {
    ...viteAssets,
    datastar: "/datastar.js",
  },
})
```

## Honostar CLI (recommended)

The workspace provides `@honostar/cli` with a `honostar` binary.

In this monorepo, the starter/demo apps invoke the CLI source via `bun ../../packages/cli/src/index.ts ...`
instead of the built `honostar` binary. This keeps local `typecheck`, `test`, and `dev` flows hermetic on a
clean checkout, because they do not depend on a prebuilt `packages/cli/dist`.

In the starter/demo apps:

- `pnpm dev` runs the Honostar CLI in source mode
- `pnpm start` runs the Honostar CLI in source mode

### `honostar dev`

- builds dependent workspace packages (`depsBuild`)
- runs codegen (`honostar prepare`: routes + contracts)
- runs `vite build --watch`
- waits for `dist/manifest.json` to exist (avoids a race)

For published/external apps, the intended interface remains the `honostar` binary from `@honostar/cli`.

### `honostar start`

- runs codegen + `vite build`

## Tailwind (Vite plugin)

If you’re using Tailwind v4, prefer the Vite plugin:

- install `tailwindcss` + `@tailwindcss/vite`
- add `@tailwindcss/vite` to `vite.config.ts`
- in your CSS entry (`styles.css`), include:

```css
@import "tailwindcss";
```

This avoids manually orchestrating the Tailwind CLI watcher.

## Advanced: conventions

The `resolveHonostarAssetsFromViteManifest()` helper assumes you pass the same entry keys Vite uses in `manifest.json` (typically `src/client.ts`, `styles.css`, etc). Keeping these consistent across apps makes the setup predictable.
