# Build and Assets

Reference for Vite + manifest asset flow in HonoStar apps.

## Build model

Typical app flow:

1. Vite builds browser assets into `dist/`
2. Vite emits `dist/manifest.json`
3. Server reads manifest and resolves runtime/css/plugin asset paths
4. Renderer injects configured asset URLs

## Node helpers

From `@honostar/core/server/node`:

- `readViteManifest(pathOrUrl)`
- `resolveHonostarAssetsFromViteManifest(manifest, options)`

Example:

```ts
const manifest = await readViteManifest(new URL("../dist/manifest.json", import.meta.url))
const viteAssets = resolveHonostarAssetsFromViteManifest(manifest, {
  baseUrl: "",
  runtimeEntry: "src/client.ts",
  cssEntry: "styles.css",
  pluginsEntries: ["src/lib/plugins/index.ts"],
})

const config = createConfig({
  assets: { ...viteAssets, datastar: "/datastar.js" },
})
```

## Renderer asset injection

Renderer uses `config.assets` for:

- stylesheet `<link rel="stylesheet">`
- Datastar module preload/script
- runtime module preload/script
- plugin path list in runtime data JSON

`assets.version` appends `?v=` cache-busting query to configured asset URLs.

## CLI integration

`honostar dev`:

- builds configured dependency packages
- runs `prepare` (routes + contracts)
- starts `vite build --watch`
- waits for manifest creation before starting server

`honostar start`:

- runs deps build + prepare + `vite build`
- starts configured server command
