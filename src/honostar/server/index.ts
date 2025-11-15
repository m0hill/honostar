// ============================================================================
// CONFIGURATION
// ============================================================================
export type { HonostarConfig } from './config'
export { createConfig, DEFAULT_CONFIG } from './config'

// ============================================================================
// CONTEXT & MIDDLEWARE
// ============================================================================
export type { AppEnv, AppHandler, AppVariables, AppVariablesBase } from './context'
export { factory, initContext } from './middleware'
export type { HandlerDefinition, PageDefinition } from './page'
// ============================================================================
// PAGES & HANDLERS
// ============================================================================
export { createHandler, createPage } from './page'

// ============================================================================
// RENDERING
// ============================================================================
export { renderer } from './renderer'
export type { BuildRoutes, Route } from './route'
// ============================================================================
// ROUTING
// ============================================================================
export { route } from './route'

export { mountRoutes } from './router'
export { generateRouteManifest } from './router/generator'
export { createManifestRouteLoader, type RouteManifestEntry } from './router/manifest-route-loader'
export type { RouteLoader } from './router/types'

// ============================================================================
// SECURITY
// ============================================================================
export { csrf } from './security'
export { signTopics, verifyTopics } from './security/topics'

// ============================================================================
// SSE (Server-Sent Events)
// ============================================================================

export {
  DatastarDatalineElements,
  DatastarDatalineOnlyIfMissing,
  DatastarDatalinePatchMode,
  DatastarDatalinePaths,
  DatastarDatalineSelector,
  DatastarDatalineSignals,
  DatastarDatalineUseViewTransition,
  DefaultElementPatchMode,
  DefaultElementsUseViewTransitions,
  DefaultPatchSignalsOnlyIfMissing,
  DefaultSseRetryDurationMs,
  ElementPatchModes,
  EventTypes,
} from '../common/constants'
// ============================================================================
// THEME
// ============================================================================
export type {
  ThemeOptions,
  ThemePreference,
  ThemeProviderArtifacts,
  ThemeRuntimeConfig,
  ThemeValue,
} from '../common/theme'
export { resolveThemeProvider } from '../common/theme'
// ============================================================================
// COMMON TYPES (Shared between server and client)
// ============================================================================
export type {
  DatastarEvent,
  DatastarEventOptions,
  DatastarEventOptionsUnion,
  ElementOptions,
  ElementPatchMode,
  EventType,
  ExecuteScriptOptions,
  Jsonifiable,
  MultilineDatalinePrefix,
  PatchElementsOptions,
  PatchSignalsOptions,
  patchElementsEvent,
  patchSignalsEvent,
  StreamOptions,
} from '../common/types'
export { DefaultMapping, sseHeaders } from '../common/types'
// Effect system
export type {
  BuiltInEffectName,
  EffectDefinition,
  EffectHandler,
  TypedEffectHandler,
} from './sse/effect-registry'
export { EffectRegistry } from './sse/effect-registry'
// SSE endpoint and middleware
export { createSseEndpoint } from './sse/endpoint'
export { SseFormatter } from './sse/generator'
export type { FxResponse } from './sse/middleware'
export { fxResponder, registerEffect, registerEffects } from './sse/middleware'
// Bus implementations
export type { PubSubBus, Sink, SSEPayload } from './sse/pubsub/memory'
export { MemoryBus } from './sse/pubsub/memory'
export type {
  NatsBusOptions,
  NatsConnection,
  NatsMsg,
  NatsSubscription,
} from './sse/pubsub/nats-bus'
export { NatsBus } from './sse/pubsub/nats-bus'
export type { RedisBusOptions, RedisClient } from './sse/pubsub/redis-bus'
export { RedisBus } from './sse/pubsub/redis-bus'
export { FxResponder } from './sse/responder'
