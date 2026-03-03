# Routing and Codegen

Reference for file-based routing and generated helpers.

## Route scanning

Generator scans `pagesDir` for `.ts` and `.tsx` files.

Skipped files:

- files starting with `_` at any directory level

## Path conventions

Route conversion rules:

- `index.tsx` -> `/`
- `issues/index.tsx` -> `/issues`
- `[id].tsx` -> `:id`
- `[...slug].tsx` -> `*`
- route groups `(group)` are removed from URL path

## Route precedence

Routes are sorted with this priority:

1. fewer dynamic segments first
2. longer paths first
3. alphabetical fallback

This ensures static routes like `/issues/new` win over `/issues/:id`.

## Generated files

### Manifest

`routes.manifest.ts` exports list of route entries:

```ts
export const routesManifest: RouteManifestEntry[] = [
  { routePath: "/issues/:id", load: () => import("./pages/issues/[id]") },
]
```

### Typed route helpers

`routes.ts` exports nested object from `route(...)`:

```ts
routes.issues.show.href({ id: 123 }) // "/issues/123"
```

## `route(...)` helper behavior

- Pattern uses `:param` notation.
- `href` enforces required params at compile time.
- Missing params at runtime throw errors.

## Configuring generator

CLI reads `package.json` `honostar.routes`:

```json
{
  "routes": {
    "pagesDir": "src/pages",
    "manifestPath": "src/generated/routes.manifest.ts",
    "routesPath": "src/generated/routes.ts",
    "configPath": "scripts/routes.config.json",
    "serverImportPath": "@honostar/core/server"
  }
}
```

`routes.config.json` maps route paths to helper property paths.

## Contracts type codegen

CLI can also generate contracts-derived type aliases.

`honostar.contracts` example:

```json
{
  "contracts": {
    "contractsImportPath": "../lib/contracts",
    "outPath": "src/generated/contracts.ts",
    "contractsExportName": "contracts",
    "contractsAccessor": "",
    "serverImportPath": "@honostar/core/server"
  }
}
```

## CLI commands

`honostar` binary commands:

- `prepare`: generate routes + contracts
- `build`: prepare + `vite build`
- `dev`: prepare + `vite build --watch` + server dev
- `start`: prepare + build + server start
- `assets:dev`
- `assets:build`
