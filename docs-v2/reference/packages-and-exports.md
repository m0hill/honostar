# Packages and Exports

Current workspace package surface.

## `@honostar/core`

Exports:

- `@honostar/core/server`
- `@honostar/core/server/node`
- `@honostar/core/client`
- `@honostar/core/common`
- `@honostar/core/client/bootstrap/minimal`
- `@honostar/core/server/polyfills/compression.js`

`server/node` contains Node-only helpers:

- `readViteManifest`
- `resolveHonostarAssetsFromViteManifest`
- `generateRouteManifest`
- `generateContractsTypes`

## `@honostar/standard`

Exports:

- `@honostar/standard/client/bootstrap/standard`

Purpose:

- curated browser runtime composition on top of core minimal bootstrap

## `@honostar/inspector`

Exports root package API used by standard bootstrap when enabled in runtime data.

## `@honostar/logging`

Logging helpers used by apps for request/event logging enrichers.

## `@honostar/cli`

Binary:

- `honostar`

Commands:

- `prepare`, `build`, `dev`, `start`, `assets:dev`, `assets:build`

Uses app-local `package.json` `honostar` config for routes/contracts/server commands.

## `@honostar/cloudflare`

Exports:

- `@honostar/cloudflare/server`

Key APIs:

- `CloudflareBusHub`
- `createCloudflareDurableObjectBus`
- `createCloudflareSseEndpoint`

Purpose:

- Cloudflare Workers + Durable Objects SSE fanout integration.
