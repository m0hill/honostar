# Server API

Reference for `@honostar/core/server`.

## App and config

- `createConfig(userConfig?) => HonostarConfig`
- `DEFAULT_CONFIG`
- `createApp({ topics, regions, contracts }) => HonostarApp`

## Page and handler factories

### `defineQueryPage(definition)` / `createPage(definition)`

Defines a GET page module (default export) with optional CQRS wiring.

`PageDefinition` fields:

- `use?: MiddlewareHandler[]`
- `loader?: (c) => Promise<Record<string, unknown> | Response>`
- `component: (props) => JSX.Element`
- `regions?: RegionDeclaration[]`
- `topics?: string[] | (c) => string[] | Promise<string[]>`
- `sseParams?: Record<string, string> | (c) => Record<string, string> | Promise<Record<string, string>>`
- `queries?: QueryRegistration[]`
- `head?: PageHeadDefinition`
- `layout?: PageLayoutDefinition`

Notes:

- If `topics` is omitted and `queries` contains only string topics, topics are inferred.
- Pattern queries (`RegExp`) require explicit concrete `topics`.

### `defineCommand(definition)` / `createHandler(definition)`

Defines command/mutation handlers (also usable for non-mutations).

Overloads:

- base handler: `{ use?, handler(c) }`
- validated handler: `{ schema, use?, hook?, handler(c, data) }`

Validation path:

- data is extracted from query/body depending on request method/content type
- schema validation runs via Standard Schema API
- `hook` handles validation failure, else default `400`

## Routing

- `mountRoutes(app, loader, options?)`
- `createManifestRouteLoader(entries)`
- `route(defs)` and `BuildRoutes` types

Generated route modules can export:

- `default` page definition
- HTTP method handlers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`)

## SSE and effects middleware

- `createSseEndpoint(config?, { queries? })`
- `fxResponder` middleware (installs `c.var.fx`)
- `registerEffect(name, handler)`
- `registerEffects(record)`
- `registerQuery(topicOrPattern, handler, options?)`
- `registerQueries(registrations)`

## Security

- `csrf(configOrOptions?)`
- `signTopics(c, topics, config)`
- `verifyTopics(c, requestedTopics, config)`
- `canonicalizeTopics(topics)`

## Regions

- `Region` component
- `regionAttrs(regionId)`
- `patchRegion(regionId, html, options?)`
- `patchRegionSeq(regionId, htmlList, options?)`
- `regionDomId(regionId)`
- `regionSelector(regionId)`
- `resolveRegionPatchOptions(patch, registry?)`

## Contracts

- `topic(name).event(eventName, schema)`
- `topicPattern(regex).event(eventName, schema)`
- `defineContracts(build)`
- `validateEventContract(args)`
- `schema({ validate, vendor?, message? })`

## Bus implementations

- `MemoryBus`
- `RedisBus`
- `NatsBus`

All implement `PubSubBus`.

## Error handlers

- `createNotFoundHandler({ ssePath? })`
- `createOnErrorHandler({ showStack?, getRequestId? })`

## Context helpers

- `initContext`
- `factory` (typed Hono factory)
- `isDatastarRequest(c)`

## `c.var` runtime fields (common)

Important fields available in handlers/pages:

- `bus`
- `clientId`
- `isDatastarRequest`
- `regionRegistry`
- `queries`
- `fx`
- `csrfToken`
- `sseTopics`
- `sseParams`
- `pageHead`
- `renderToString`
- `renderFragmentToString`
