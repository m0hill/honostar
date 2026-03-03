/**
 * SSE Responder (`FxResponder`)
 *
 * This module is responsible for taking "effects" (patch-elements, patch-signals, execute-script, etc.)
 * and delivering them either:
 *
 * - as an **HTTP reply** (only for simple single-effect Datastar requests), or
 * - as an **SSE message** via the PubSub bus (client-scoped or topic-scoped).
 *
 * Architecture Notes:
 * - `reply()` is **tab-scoped** feedback: validation errors, UI state, toasts, etc.
 * - `broadcast()` is **topic-scoped**: it updates all subscribers (canonical UI patches).
 * - `publish()` emits a **domain event** (CQRS trigger). It does not patch the DOM directly.
 * - HTTP reply optimization only applies when we can represent the response as a single Datastar patch
 *   using headers (`datastar-*`). Otherwise we fall back to bus/SSE.
 */
import type { Context } from "hono"
import type { JSX } from "hono/jsx/jsx-runtime"
import type { StatusCode } from "hono/utils/http-status"
import type {
  ExecuteScriptOptions,
  Jsonifiable,
  PatchElementsOptions,
  PatchSignalsOptions,
} from "../../common/types"
import type { AppEnv } from "../context"
import type {
  ContractEventName,
  ContractPayload,
  ContractTopicName,
  ContractsDefinition,
  EventContract,
} from "../contracts"
import { validateEventContract } from "../contracts"
import { factory } from "../middleware"
import { isDatastarRequest } from "../request"
import type { RegionPatch, RegionPatchSeq } from "../regions"
import {
  patchRegion,
  patchRegionSeq,
  resolveRegionPatchOptions,
  warnOnUnregisteredRegionSelector,
} from "../regions"
import type { EffectDefinition } from "./effect-registry"
import { EffectRegistry } from "./effect-registry"
import type { SseLane, SseQos } from "./pubsub/memory"

export type FxStreamTarget = { to: "client"; clientId?: string } | { to: "topic"; topic: string }

export type FxStreamChunk = {
  kind: "text" | "json"
  data: string | Jsonifiable
  /**
   * Optional JSON-encoded targeting metadata for client runtimes.
   * When present, the client stream watcher can apply chunks directly to a signal/DOM target.
   */
  target?: Record<string, Jsonifiable>
}

export type FxStream = {
  streamId: string
  abortSignal: AbortSignal | null
  open: (meta?: Jsonifiable) => void
  close: () => void
  error: (message: string) => void
  chunk: (chunk: FxStreamChunk) => void
  chunkText: (
    text: string,
    opts?: { coalesceMs?: number; target?: Record<string, Jsonifiable> }
  ) => void
  flush: () => void
  signals: (patch: Record<string, Jsonifiable>, opts?: PatchSignalsOptions) => void
  elements: (
    payload: JSX.Element | JSX.Element[] | string,
    opts?: PatchElementsOptions
  ) => Promise<void>
  executeScript: (script: string, opts?: ExecuteScriptOptions) => void
}

function normalizeLane(candidate: unknown): SseLane | undefined {
  if (candidate === "canonical" || candidate === "interaction" || candidate === "bulk") {
    return candidate
  }
  return undefined
}

function normalizeQos(qos?: SseQos): SseQos | undefined {
  if (!qos) return undefined
  const lane = normalizeLane(qos.lane)
  const key = typeof qos.key === "string" && qos.key.length > 0 ? qos.key : undefined
  const drop = typeof qos.drop === "boolean" ? qos.drop : undefined
  if (!lane && !key && drop === undefined) return undefined
  return { ...(lane && { lane }), ...(key && { key }), ...(drop !== undefined && { drop }) }
}

const isPatchElementsEffect = (
  fx: EffectDefinition
): fx is ["patch-elements", JSX.Element | JSX.Element[] | string, PatchElementsOptions?] =>
  fx[0] === "patch-elements"

const isPatchElementsSeqEffect = (
  fx: EffectDefinition
): fx is ["patch-elements-seq", Array<JSX.Element | string>, PatchElementsOptions?] =>
  fx[0] === "patch-elements-seq"

const isPatchRegionEffect = (fx: EffectDefinition): fx is ["patch-region", RegionPatch] =>
  fx[0] === "patch-region"

const isPatchRegionSeqEffect = (fx: EffectDefinition): fx is ["patch-region-seq", RegionPatchSeq] =>
  fx[0] === "patch-region-seq"

const isPatchSignalsEffect = (
  fx: EffectDefinition
): fx is ["patch-signals", Record<string, Jsonifiable>, PatchSignalsOptions?] =>
  fx[0] === "patch-signals"

const isExecuteScriptEffect = (
  fx: EffectDefinition
): fx is ["execute-script", string, ExecuteScriptOptions?] => fx[0] === "execute-script"

/**
 * Effect responder exposed on `c.var.fx`.
 *
 * Most apps should not instantiate this directly; use the `fxResponder` middleware.
 */
export class FxResponder {
  private c: Context<AppEnv>
  private isExecutingEffect = false
  public effectRegistry: EffectRegistry

  constructor(c: Context<AppEnv>) {
    this.c = c
    this.effectRegistry = new EffectRegistry()
    this.registerBuiltInEffects()
  }

  private isDatastarRequest(): boolean {
    return this.c.var.isDatastarRequest || isDatastarRequest(this.c)
  }

  private warnOnRegionSelector(opts?: PatchElementsOptions): void {
    const selector = opts?.selector
    if (!selector) return
    warnOnUnregisteredRegionSelector(selector, this.c.var.regionRegistry)
  }

  private shouldAttemptHttpReply(toClient: boolean | undefined, topics?: string[]): boolean {
    if (this.isExecutingEffect) return false
    return Boolean(toClient && !topics && this.isDatastarRequest())
  }

  private mergeHeaders(
    base: Record<string, string> | undefined,
    overrides: Record<string, string>
  ): Record<string, string> {
    return {
      ...base,
      ...overrides,
    }
  }

  private buildElementsHeaders(
    opts: PatchElementsOptions | undefined,
    base?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = this.mergeHeaders(base, {
      "Content-Type": "text/html; charset=utf-8",
    })

    if (opts?.selector) {
      headers["datastar-selector"] = opts.selector
    }
    if (opts?.mode) {
      headers["datastar-mode"] = opts.mode
    }
    if (opts?.namespace) {
      headers["datastar-namespace"] = opts.namespace
    }
    if (typeof opts?.useViewTransition === "boolean") {
      headers["datastar-use-view-transition"] = String(opts.useViewTransition)
    }

    return headers
  }

  private buildSignalsHeaders(
    opts: PatchSignalsOptions | undefined,
    base?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = this.mergeHeaders(base, {
      "Content-Type": "application/json",
    })

    if (typeof opts?.onlyIfMissing === "boolean") {
      headers["datastar-only-if-missing"] = String(opts.onlyIfMissing)
    }

    return headers
  }

  private async renderNode(node: JSX.Element | string | null | undefined): Promise<string> {
    if (node === null || node === undefined) return ""
    if (typeof node === "string") return node
    return await this.c.var.renderFragmentToString(node)
  }

  private async renderElementsPayload(
    payload: JSX.Element | JSX.Element[] | string
  ): Promise<string> {
    if (Array.isArray(payload)) {
      const html = await Promise.all(payload.map((part) => this.renderNode(part)))
      return html.join("\n")
    }
    return await this.renderNode(payload)
  }

  private async renderElementsSeqPayload(payload: Array<JSX.Element | string>): Promise<string> {
    const html = await Promise.all(payload.map((part) => this.renderNode(part)))
    return html.join("\n")
  }

  /**
   * Get a typed publisher for a contracts registry.
   *
   * This provides autocomplete for topic + event names and makes payload types flow end-to-end.
   */
  public withContracts<C extends ContractsDefinition>(_contracts: C) {
    return {
      publish: async <
        Topic extends ContractTopicName<C>,
        Event extends ContractEventName<C, Topic>,
      >(
        topic: Topic,
        event: Event,
        payload: ContractPayload<C, Topic, Event>
      ) => {
        await this.publish(
          topic,
          event,
          (payload as unknown as Jsonifiable | null | undefined) ?? null
        )
      },
    } as const
  }

  private async tryCreateHttpResponse(
    effects: EffectDefinition[],
    status: StatusCode,
    headers?: Record<string, string>
  ): Promise<Response | null> {
    if (effects.length !== 1) return null

    const effect = effects[0]!

    if (isPatchElementsEffect(effect)) {
      const [, payload, opts] = effect
      this.warnOnRegionSelector(opts)
      const html = await this.renderElementsPayload(payload)
      return new Response(html, {
        status,
        headers: this.buildElementsHeaders(opts, headers),
      })
    }

    if (isPatchElementsSeqEffect(effect)) {
      const [, payload, opts] = effect
      this.warnOnRegionSelector(opts)
      const html = await this.renderElementsSeqPayload(payload)
      return new Response(html, {
        status,
        headers: this.buildElementsHeaders(opts, headers),
      })
    }

    if (isPatchRegionEffect(effect)) {
      const [, patch] = effect
      const html = await this.renderElementsPayload(patch.html)
      const opts = resolveRegionPatchOptions(patch, this.c.var.regionRegistry)
      return new Response(html, {
        status,
        headers: this.buildElementsHeaders(opts, headers),
      })
    }

    if (isPatchRegionSeqEffect(effect)) {
      const [, patch] = effect
      const html = await this.renderElementsSeqPayload(patch.html)
      const opts = resolveRegionPatchOptions(patch, this.c.var.regionRegistry)
      return new Response(html, {
        status,
        headers: this.buildElementsHeaders(opts, headers),
      })
    }

    if (isPatchSignalsEffect(effect)) {
      const [, payload, opts] = effect
      const body = JSON.stringify(payload)
      return new Response(body, {
        status,
        headers: this.buildSignalsHeaders(opts, headers),
      })
    }

    return null
  }

  /**
   * Register all built-in effects.
   * This replaces the old switch statement approach with a registry-based system.
   *
   * Note: These are placeholder registrations for extensibility. The actual effect
   * logic is handled by the switch statement in the fx() method for performance.
   * Custom user effects will be executed via the registry before falling through
   * to the built-in handlers.
   */
  private registerBuiltInEffects(): void {
    // patch-elements: Render JSX and send HTML patch
    this.effectRegistry.register(
      "patch-elements",
      async (_c, _payload: JSX.Element | JSX.Element[] | string, _opts?: PatchElementsOptions) => {
        // Placeholder - actual logic in fx() switch statement
      }
    )

    // patch-elements-seq: Similar to patch-elements but for sequences
    this.effectRegistry.register(
      "patch-elements-seq",
      async (_c, _payload: Array<JSX.Element | string>, _opts?: PatchElementsOptions) => {
        // Placeholder - actual logic in fx() switch statement
      }
    )

    // patch-signals: Update reactive signals
    this.effectRegistry.register(
      "patch-signals",
      async (_c, _payload: Record<string, Jsonifiable>, _opts?: PatchSignalsOptions) => {
        // Placeholder - actual logic in fx() switch statement
      }
    )

    // execute-script: Execute JavaScript code
    this.effectRegistry.register(
      "execute-script",
      async (_c, _script: string, _opts?: ExecuteScriptOptions) => {
        // Placeholder - actual logic in fx() switch statement
      }
    )

    // close-sse: Close the SSE connection
    this.effectRegistry.register("close-sse", async (_c) => {
      // Placeholder - actual logic in fx() switch statement
    })
  }

  private patchElements(topic: string, html: string, options: PatchElementsOptions) {
    this.warnOnRegionSelector(options)
    this.c.var.bus.toTopic(topic, {
      event: "datastar-patch-elements",
      html,
      options,
      qos: { lane: "canonical" },
    })
  }

  private patchSignals(
    topic: string,
    signals: Record<string, Jsonifiable>,
    options?: PatchSignalsOptions
  ) {
    this.c.var.bus.toTopic(topic, {
      event: "datastar-patch-signals",
      signals: JSON.stringify(signals),
      options: options ?? {},
      qos: { lane: "canonical" },
    })
  }

  private executeScript(topic: string, script: string, options?: ExecuteScriptOptions) {
    this.c.var.bus.toTopic(topic, {
      event: "execute-script",
      script,
      ...(options && { options }),
      qos: { lane: "canonical" },
    })
  }

  /**
   * Execute effects using the extensible registry system.
   * This is the new primary method for running effects.
   * It tries the registry first, then falls back to built-in switch handling.
   */
  public async fx(topic: string, effects: EffectDefinition[]): Promise<void> {
    for (const fx of effects) {
      const [effectName, ...args] = fx

      if (this.effectRegistry.has(effectName)) {
        await this.effectRegistry.execute(this.c, effectName, ...args)
      }

      if (isPatchElementsEffect(fx)) {
        const [, payload, opts] = fx
        const html = await this.renderElementsPayload(payload)
        this.patchElements(topic, html, opts ?? {})
        continue
      }

      if (isPatchElementsSeqEffect(fx)) {
        const [, payload, opts] = fx
        const html = await this.renderElementsSeqPayload(payload)
        this.patchElements(topic, html, opts ?? {})
        continue
      }

      if (isPatchRegionEffect(fx)) {
        const [, patch] = fx
        const html = await this.renderElementsPayload(patch.html)
        const opts = resolveRegionPatchOptions(patch, this.c.var.regionRegistry)
        this.patchElements(topic, html, opts)
        continue
      }

      if (isPatchRegionSeqEffect(fx)) {
        const [, patch] = fx
        const html = await this.renderElementsSeqPayload(patch.html)
        const opts = resolveRegionPatchOptions(patch, this.c.var.regionRegistry)
        this.patchElements(topic, html, opts)
        continue
      }

      if (isPatchSignalsEffect(fx)) {
        const [, payload, opts] = fx
        this.patchSignals(topic, payload, opts)
        continue
      }

      if (isExecuteScriptEffect(fx)) {
        const [, script, opts] = fx
        this.executeScript(topic, script, opts)
        continue
      }

      if (effectName === "close-sse") {
        this.c.var.bus.toTopic(topic, { event: "close" })
      }
    }
  }

  /**
   * Execute a list of effects and produce the appropriate transport response.
   *
   * - If `topics` is provided, effects are broadcast to those topics (SSE via the bus).
   * - If `toClient` is true, effects are sent only to the initiating tab (clientId).
   * - If the current request is a Datastar request and the effects are representable as a
   *   single built-in patch, this will return an HTTP response with the required `datastar-*`
   *   headers so the client can apply it without an SSE connection.
   *
   * @returns A `Response` (HTTP patch when possible, otherwise an empty response).
   */
  async respond(args: {
    effects: EffectDefinition[]
    topics?: string[]
    toClient?: boolean
    close?: boolean
    status?: StatusCode
    headers?: Record<string, string>
  }) {
    const effects = args.effects

    if (args.topics) {
      await Promise.all(args.topics.map((t) => this.fx(t, effects)))
    }

    const httpResponse =
      this.shouldAttemptHttpReply(args.toClient, args.topics) && effects.length > 0
        ? await this.tryCreateHttpResponse(effects, args.status ?? 200, args.headers)
        : null

    if (args.toClient) {
      const clientId = this.c.var.clientId
      for (const fx of effects) {
        const [effectName, ...args] = fx

        // Try registry first for custom effects
        if (
          this.effectRegistry.has(effectName) &&
          !isPatchElementsEffect(fx) &&
          !isPatchElementsSeqEffect(fx) &&
          !isPatchSignalsEffect(fx) &&
          !isExecuteScriptEffect(fx) &&
          effectName !== "close-sse"
        ) {
          // Custom effect - call the registered handler

          this.isExecutingEffect = true
          try {
            await this.effectRegistry.execute(this.c, effectName, ...args)
          } finally {
            this.isExecutingEffect = false
          }

          continue
        }

        if (httpResponse) {
          continue
        }

        if (isPatchElementsEffect(fx)) {
          const [, payload, opts] = fx
          this.warnOnRegionSelector(opts)
          const html = await this.renderElementsPayload(payload)
          this.c.var.bus.toClient(clientId, {
            event: "datastar-patch-elements",
            html,
            options: opts ?? {},
            qos: { lane: "interaction" },
          })
          continue
        }

        if (isPatchElementsSeqEffect(fx)) {
          const [, payload, opts] = fx
          this.warnOnRegionSelector(opts)
          const html = await this.renderElementsSeqPayload(payload)
          this.c.var.bus.toClient(clientId, {
            event: "datastar-patch-elements",
            html,
            options: opts ?? {},
            qos: { lane: "interaction" },
          })
          continue
        }

        if (isPatchRegionEffect(fx)) {
          const [, patch] = fx
          const html = await this.renderElementsPayload(patch.html)
          const opts = resolveRegionPatchOptions(patch, this.c.var.regionRegistry)
          this.c.var.bus.toClient(clientId, {
            event: "datastar-patch-elements",
            html,
            options: opts,
            qos: { lane: "interaction" },
          })
          continue
        }

        if (isPatchRegionSeqEffect(fx)) {
          const [, patch] = fx
          const html = await this.renderElementsSeqPayload(patch.html)
          const opts = resolveRegionPatchOptions(patch, this.c.var.regionRegistry)
          this.c.var.bus.toClient(clientId, {
            event: "datastar-patch-elements",
            html,
            options: opts,
            qos: { lane: "interaction" },
          })
          continue
        }

        if (isPatchSignalsEffect(fx)) {
          const [, payload, opts] = fx
          this.c.var.bus.toClient(clientId, {
            event: "datastar-patch-signals",
            signals: JSON.stringify(payload),
            options: opts ?? {},
            qos: { lane: "interaction" },
          })
          continue
        }

        if (isExecuteScriptEffect(fx)) {
          const [, script, opts] = fx
          this.c.var.bus.toClient(clientId, {
            event: "execute-script",
            script,
            ...(opts && { options: opts }),
            qos: { lane: "interaction" },
          })
          continue
        }

        if (effectName === "close-sse") {
          this.c.var.bus.toClient(clientId, { event: "close" })
        }
      }
    }

    if (args.close && args.topics) {
      for (const t of args.topics) this.c.var.bus.toTopic(t, { event: "close" })
    }

    if (httpResponse) {
      return httpResponse
    }

    const status = args.status ?? 204
    const headers = args.headers ?? {}
    return this.c.body(null, status, headers)
  }

  /**
   * Reply to the initiating tab (client-scoped).
   *
   * Use this for validation errors, toasts, modal open/close, or any UI feedback that should only
   * affect the user who triggered the request.
   *
   * @param effects - Datastar-compatible effects (patch-elements, patch-signals, execute-script, etc.)
   * @returns A Promise resolving to a `Response` or an HTTP patch response when possible.
   */
  public async reply(
    effects: EffectDefinition[],
    options?: { status?: StatusCode; headers?: Record<string, string> }
  ) {
    return this.respond({
      effects,
      toClient: true,
      ...options,
    })
  }

  /**
   * Acknowledge the request without sending any effects.
   *
   * Useful when you rely entirely on CQRS events + SSE queries for UI updates.
   */
  public async ok(options?: { status?: StatusCode; headers?: Record<string, string> }) {
    return this.reply([], options)
  }

  public async replyRegion(
    region: string,
    html: JSX.Element | JSX.Element[] | string,
    options?: Parameters<typeof patchRegion>[2],
    response?: { status?: StatusCode; headers?: Record<string, string> }
  ) {
    return this.reply([patchRegion(region, html, options)], response)
  }

  public async replyRegionSeq(
    region: string,
    html: Array<JSX.Element | string>,
    options?: Parameters<typeof patchRegionSeq>[2],
    response?: { status?: StatusCode; headers?: Record<string, string> }
  ) {
    return this.reply([patchRegionSeq(region, html, options)], response)
  }

  /**
   * Broadcast effects to one or more topics (topic-scoped).
   *
   * Prefer this for canonical UI updates ("fat patches") that should update all connected clients
   * subscribed to the topic.
   *
   * @param topic - Topic or list of topics to fan out to.
   * @param effects - Effects to emit to subscribers.
   * @returns A Promise resolving to a `Response` (typically empty; the work happens via SSE).
   */
  public async broadcast(
    topic: string | string[],
    effects: EffectDefinition[],
    options?: { status?: StatusCode; headers?: Record<string, string>; close?: boolean }
  ) {
    const topics = Array.isArray(topic) ? topic : [topic]
    return this.respond({
      effects,
      topics,
      ...options,
    })
  }

  public async broadcastRegion(
    topic: string | string[],
    region: string,
    html: JSX.Element | JSX.Element[] | string,
    options?: Parameters<typeof patchRegion>[2],
    response?: { status?: StatusCode; headers?: Record<string, string>; close?: boolean }
  ) {
    return this.broadcast(topic, [patchRegion(region, html, options)], response)
  }

  /**
   * Publish a domain event to one or more topics.
   *
   * Intended for CQRS: commands publish events, and queries re-render on the SSE connection.
   * This does not directly patch any DOM.
   *
   * @param topic - Topic(s) to publish to (e.g. `topics.issues.list()`).
   * @param name - Event name (e.g. `"issue:created"`).
   * @param payload - JSON-serializable event payload.
   *
   * @example
   * // Trigger a refresh of the issue list for all connected clients
   * c.var.fx.publish(topics.issues.list(), "issue:created", { id: 123 })
   */
  public async publish(
    topic: string | string[],
    name: string,
    payload?: Jsonifiable | null
  ): Promise<void>
  public async publish<T extends EventContract>(
    contract: T,
    payload: import("@standard-schema/spec").StandardSchemaV1.InferOutput<T["schema"]>
  ): Promise<void>
  public async publish(
    topicOrContract: string | string[] | EventContract,
    nameOrPayload: string | Jsonifiable | null | undefined,
    payloadMaybe?: Jsonifiable | null
  ): Promise<void> {
    if (
      typeof topicOrContract === "object" &&
      topicOrContract !== null &&
      "topic" in topicOrContract &&
      "event" in topicOrContract &&
      "schema" in topicOrContract
    ) {
      const contract = topicOrContract as EventContract
      const topic = typeof contract.topic === "string" ? contract.topic : null
      if (!topic) {
        console.warn(
          `[Contracts] Cannot publish using a pattern-based contract for event "${contract.event}". ` +
            "Use the string topic overload instead."
        )
        return
      }
      const payload = nameOrPayload as Jsonifiable | null | undefined
      await validateEventContract({
        topic,
        event: contract.event,
        payload: payload ?? null,
        source: "publish",
        schema: contract.schema,
      })
      this.c.var.bus.toTopic(topic, {
        event: "honostar-event",
        name: contract.event,
        payload: JSON.stringify(payload ?? null),
        qos: { lane: "canonical" },
      })
      return
    }

    const topics = Array.isArray(topicOrContract) ? topicOrContract : [topicOrContract]
    const name = nameOrPayload as string
    const payload = payloadMaybe

    await Promise.all(
      topics.map((t) =>
        validateEventContract({
          topic: t,
          event: name,
          payload: payload ?? null,
          source: "publish",
        })
      )
    )

    const encoded = JSON.stringify(payload ?? null)
    for (const t of topics) {
      this.c.var.bus.toTopic(t, {
        event: "honostar-event",
        name,
        payload: encoded,
        qos: { lane: "canonical" },
      })
    }
  }

  public async publishTo<T extends EventContract>(
    topic: string | string[],
    contract: T,
    payload: import("@standard-schema/spec").StandardSchemaV1.InferOutput<T["schema"]>
  ): Promise<void> {
    const topics = Array.isArray(topic) ? topic : [topic]
    const encoded = JSON.stringify((payload as unknown as Jsonifiable | null | undefined) ?? null)

    await Promise.all(
      topics.map((t) =>
        validateEventContract({
          topic: t,
          event: contract.event,
          payload: (payload as unknown) ?? null,
          source: "publish",
          schema: contract.schema,
        })
      )
    )

    for (const t of topics) {
      this.c.var.bus.toTopic(t, {
        event: "honostar-event",
        name: contract.event,
        payload: encoded,
        qos: { lane: "canonical" },
      })
    }
  }

  public stream(to: FxStreamTarget, streamId: string, opts?: { qos?: SseQos }): FxStream {
    const qos = normalizeQos(opts?.qos)
    const target: FxStreamTarget =
      to.to === "client"
        ? { to: "client", clientId: to.clientId ?? this.c.var.clientId }
        : { to: "topic", topic: to.topic }

    const bus = this.c.var.bus
    const clientAbort =
      target.to === "client"
        ? (bus.getClientAbortSignal?.(target.clientId ?? "anonymous") ?? null)
        : null
    const streamAbort = target.to === "client" ? new AbortController() : null
    const abortSignal = streamAbort?.signal ?? null

    if (target.to === "client") {
      const clientId = target.clientId ?? "anonymous"
      if (clientAbort) {
        clientAbort.addEventListener(
          "abort",
          () => {
            try {
              streamAbort?.abort()
            } catch {
              // ignore
            }
          },
          { once: true }
        )
      }
      bus.registerClientStreamAbort?.(clientId, streamId, streamAbort ?? new AbortController())
    }

    const coalesceState: {
      timer: ReturnType<typeof setTimeout> | null
      buffer: string
      ms: number
      target: Record<string, Jsonifiable> | undefined
    } = { timer: null, buffer: "", ms: 0, target: undefined }

    let finished = false

    const toTarget = (msg: import("./pubsub/memory").SSEPayload) => {
      const next = qos ? { ...msg, qos: { ...(msg.qos ? msg.qos : {}), ...qos } } : msg
      if (target.to === "client") {
        bus.toClient(target.clientId ?? "anonymous", next)
        return
      }
      bus.toTopic(target.topic, next)
    }

    const flush = () => {
      if (!coalesceState.buffer) return
      const data = coalesceState.buffer
      const targetJson = coalesceState.target ? JSON.stringify(coalesceState.target) : undefined
      coalesceState.buffer = ""
      coalesceState.target = undefined
      if (coalesceState.timer) {
        clearTimeout(coalesceState.timer)
        coalesceState.timer = null
      }
      toTarget({
        event: "datastar-honostar-stream-chunk",
        streamId,
        kind: "text",
        data,
        ...(targetJson !== undefined && { target: targetJson }),
      })
    }

    const end = (kind: "close" | "error", message?: string) => {
      if (finished) return
      finished = true

      flush()
      if (target.to === "client") {
        bus.unregisterClientStreamAbort?.(target.clientId ?? "anonymous", streamId)
      }

      if (kind === "close") {
        toTarget({ event: "datastar-honostar-stream-close", streamId })
      } else {
        toTarget({
          event: "datastar-honostar-stream-error",
          streamId,
          message: message ?? "Stream error",
        })
      }
    }

    if (abortSignal) {
      abortSignal.addEventListener(
        "abort",
        () => {
          end("close")
        },
        { once: true }
      )
    }

    return {
      streamId,
      abortSignal,
      open: (meta?: Jsonifiable) => {
        const metaJson = meta === undefined ? undefined : JSON.stringify(meta)
        toTarget({
          event: "datastar-honostar-stream-open",
          streamId,
          ...(metaJson !== undefined && { meta: metaJson }),
        })
      },
      close: () => {
        end("close")
      },
      error: (message: string) => {
        end("error", message)
      },
      chunk: (chunk: FxStreamChunk) => {
        if (finished) return
        flush()
        const data = (() => {
          if (chunk.kind === "text") {
            return typeof chunk.data === "string" ? chunk.data : JSON.stringify(chunk.data)
          }
          return JSON.stringify(chunk.data)
        })()
        const targetJson = chunk.target ? JSON.stringify(chunk.target) : undefined
        toTarget({
          event: "datastar-honostar-stream-chunk",
          streamId,
          kind: chunk.kind,
          data,
          ...(targetJson !== undefined && { target: targetJson }),
        })
      },
      chunkText: (
        text: string,
        options?: { coalesceMs?: number; target?: Record<string, Jsonifiable> }
      ) => {
        if (finished) return
        const coalesceMs = options?.coalesceMs ?? 0
        if (coalesceMs <= 0) {
          const targetJson = options?.target ? JSON.stringify(options.target) : undefined
          toTarget({
            event: "datastar-honostar-stream-chunk",
            streamId,
            kind: "text",
            data: text,
            ...(targetJson !== undefined && { target: targetJson }),
          })
          return
        }

        coalesceState.ms = coalesceMs
        coalesceState.target = options?.target
        coalesceState.buffer = `${coalesceState.buffer}${text}`
        if (!coalesceState.timer) {
          coalesceState.timer = setTimeout(() => flush(), coalesceMs)
        }
      },
      flush,
      signals: (patch: Record<string, Jsonifiable>, options?: PatchSignalsOptions) => {
        if (finished) return
        flush()
        toTarget({
          event: "datastar-patch-signals",
          signals: JSON.stringify(patch),
          options: options ?? {},
        })
      },
      elements: async (
        payload: JSX.Element | JSX.Element[] | string,
        options?: PatchElementsOptions
      ) => {
        if (finished) return
        flush()
        this.warnOnRegionSelector(options)
        const html = await this.renderElementsPayload(payload)
        toTarget({
          event: "datastar-patch-elements",
          html,
          options: options ?? {},
        })
      },
      executeScript: (script: string, options?: ExecuteScriptOptions) => {
        if (finished) return
        flush()
        toTarget({
          event: "execute-script",
          script,
          ...(options && { options }),
        })
      },
    }
  }

  public streamClient(streamId: string, opts?: { qos?: SseQos }): FxStream {
    return this.stream({ to: "client" }, streamId, opts)
  }

  public streamTopic(topic: string, streamId: string, opts?: { qos?: SseQos }): FxStream {
    return this.stream({ to: "topic", topic }, streamId, opts)
  }
}

/**
 * Installs `c.var.fx` for downstream handlers/pages.
 */
export const fxResponder = factory.createMiddleware(async (c, next) => {
  c.set("fx", new FxResponder(c))
  await next()
})
