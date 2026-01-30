// Configuration
export type { HonostarConfig } from "./config"
export { createConfig, DEFAULT_CONFIG } from "./config"

// Context & Middleware
export type { AppEnv, AppVariables, AppVariablesBase } from "./context"
// Errors
export { createNotFoundHandler, createOnErrorHandler } from "./errors"
export { factory, initContext } from "./middleware"
export type {
  PageHead,
  PageHeadDefinition,
  PageHeadElements,
  PageHeadResolver,
  PageLayout,
  PageLayoutDefinition,
} from "./page"
// Pages & Handlers
export { createHandler, createPage, defineCommand, defineQueryPage } from "./page"
// Rendering
export { renderer } from "./renderer"
// Routing
export type { BuildRoutes, Route } from "./route"
export { route } from "./route"
export { mountRoutes } from "./router"
export { generateRouteManifest } from "./router/generator"
// Vite assets (Node-only helper)
export type { ViteManifest, ViteManifestEntry } from "./assets/vite-manifest"
export { readViteManifest, resolveHonostarAssetsFromViteManifest } from "./assets/vite-manifest"
export type { RouteManifestEntry } from "./router/manifest-route-loader"
export { createManifestRouteLoader } from "./router/manifest-route-loader"
export type { RouteLoader } from "./router/types"
// App container (single source of truth for ids + policies)
export { createApp } from "./app"
export type { HonostarApp } from "./app"
// Contracts (typed topics/events)
export {
  defineContracts,
  generateContractsTypes,
  globalContracts,
  schema,
  topic,
  topicPattern,
  validateEventContract,
} from "./contracts"
export type {
  ContractEventName,
  ContractPayload,
  ContractTopicName,
  ContractsDefinition,
  EventContract,
  GenerateContractsTypesOptions,
  SchemaOptions,
  TopicContractRegistry,
  TopicMatcher,
} from "./contracts"
// Security
export { csrf } from "./security"
// Observable HTML (regions)
export type {
  RegionDeclaration,
  RegionId,
  RegionKind,
  RegionPatch,
  RegionPatchOptions,
  RegionPatchSeq,
} from "./regions"
export {
  HonostarRegionAttr,
  HonostarRegionKindAttr,
  Region,
  createRegionRegistry,
  patchRegion,
  patchRegionSeq,
  regionAttrs,
  regionDomId,
  regionSelector,
} from "./regions"
// Effect System
export type { EffectHandler } from "./sse/effect-registry"
// SSE
export { createSseEndpoint } from "./sse/endpoint"
export type { FxResponse } from "./sse/middleware"
export { registerEffect, registerEffects, registerQueries, registerQuery } from "./sse/middleware"
// Bus Implementations
export type { PubSubBus } from "./sse/pubsub/memory"
export { MemoryBus } from "./sse/pubsub/memory"
export type {
  NatsBusOptions,
  NatsConnection,
  NatsMsg,
  NatsSubscription,
} from "./sse/pubsub/nats-bus"
export { NatsBus } from "./sse/pubsub/nats-bus"
export type { RedisBusOptions, RedisClient } from "./sse/pubsub/redis-bus"
export { RedisBus } from "./sse/pubsub/redis-bus"
export type { QueryHandler, QueryRegistration } from "./sse/queries"
export { fxResponder } from "./sse/responder"
