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

// ============================================================================
// PAGES & HANDLERS
// ============================================================================
export { createHandler, createPage } from './page'
export type { PageDefinition, HandlerDefinition } from './page'

// ============================================================================
// RENDERING
// ============================================================================
export { renderer } from './renderer'

// ============================================================================
// ROUTING
// ============================================================================
export { route } from './route'
export type { Route, BuildRoutes } from './route'

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

// Bus implementations
export type { PubSubBus, SSEPayload, Sink } from './sse/pubsub/bus'
export { MemoryBus } from './sse/pubsub/bus'
export type {
  NatsBusOptions,
  NatsConnection,
  NatsMsg,
  NatsSubscription,
} from './sse/pubsub/nats-bus'
export { NatsBus } from './sse/pubsub/nats-bus'
export type { RedisBusOptions, RedisClient } from './sse/pubsub/redis-bus'
export { RedisBus } from './sse/pubsub/redis-bus'

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
export { DatastarResponder, datastarResponder } from './sse/responder'

// ============================================================================
// COMMON TYPES (Shared between server and client)
// ============================================================================
export type {
  Jsonifiable,
  ElementPatchMode,
  EventType,
  StreamOptions,
  DatastarEventOptions,
  ElementOptions,
  PatchElementsOptions,
  patchElementsEvent,
  PatchSignalsOptions,
  ExecuteScriptOptions,
  patchSignalsEvent,
  MultilineDatalinePrefix,
  DatastarEventOptionsUnion,
  DatastarEvent,
} from '../common/types'

export { sseHeaders, DefaultMapping } from '../common/types'

export {
  DefaultSseRetryDurationMs,
  DefaultElementsUseViewTransitions,
  DefaultPatchSignalsOnlyIfMissing,
  DatastarDatalineSelector,
  DatastarDatalinePatchMode,
  DatastarDatalineElements,
  DatastarDatalineUseViewTransition,
  DatastarDatalineSignals,
  DatastarDatalineOnlyIfMissing,
  DatastarDatalinePaths,
  ElementPatchModes,
  DefaultElementPatchMode,
  EventTypes,
} from '../common/constants'

// ============================================================================
// THEME
// ============================================================================
export type {
  ThemeOptions,
  ThemePreference,
  ThemeRuntimeConfig,
  ThemeValue,
  ThemeProviderArtifacts,
} from '../common/theme'
export { resolveThemeProvider } from '../common/theme'
