import type { StandardSchemaV1 } from "@standard-schema/spec"

type ContractMode = "off" | "warn" | "strict"

const warned = new Set<string>()

function warnOnce(key: string, ...args: Parameters<typeof console.warn>) {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(...args)
}

function modeFromEnv(): ContractMode {
  const raw = process.env.HONOSTAR_EVENT_CONTRACTS
  if (raw === "off" || raw === "warn" || raw === "strict") return raw
  return process.env.NODE_ENV === "production" ? "off" : "warn"
}

export type TopicMatcher = string | RegExp

export type EventContractRecord = {
  topic: TopicMatcher
  event: string
  schema: StandardSchemaV1
}

function matcherKey(topic: TopicMatcher): string {
  if (typeof topic === "string") return `s:${topic}`
  return `r:${topic.source}/${topic.flags}`
}

export class TopicContractRegistry {
  private exact = new Map<string, Map<string, StandardSchemaV1>>()
  private patterns: Array<{ pattern: RegExp; events: Map<string, StandardSchemaV1> }> = []

  register(topic: TopicMatcher, event: string, schema: StandardSchemaV1): void {
    if (typeof topic === "string") {
      const perTopic = this.exact.get(topic) ?? new Map<string, StandardSchemaV1>()
      const existing = perTopic.get(event)
      if (existing) {
        if (existing !== schema) {
          warnOnce(
            `contracts:duplicate:${matcherKey(topic)}:${event}`,
            `[Contracts] Duplicate contract for topic "${topic}" event "${event}" detected; keeping the first schema.`
          )
        }
        this.exact.set(topic, perTopic)
        return
      }
      perTopic.set(event, schema)
      this.exact.set(topic, perTopic)
      return
    }

    if (!(topic instanceof RegExp)) {
      warnOnce(
        `contracts:invalid-topic:${String(topic)}`,
        `[Contracts] Ignoring invalid topic matcher for event "${event}". Expected string or RegExp.`
      )
      return
    }

    let entry = this.patterns.find(
      (p) => p.pattern.source === topic.source && p.pattern.flags === topic.flags
    )
    if (!entry) {
      entry = { pattern: topic, events: new Map<string, StandardSchemaV1>() }
      this.patterns.push(entry)
    }
    const existing = entry.events.get(event)
    if (existing) {
      if (existing !== schema) {
        warnOnce(
          `contracts:duplicate:${matcherKey(topic)}:${event}`,
          `[Contracts] Duplicate contract for topic pattern /${topic.source}/${topic.flags} event "${event}" detected; keeping the first schema.`
        )
      }
      return
    }
    entry.events.set(event, schema)
  }

  getSchema(topic: string, event: string): StandardSchemaV1 | null {
    const exact = this.exact.get(topic)?.get(event)
    if (exact) return exact

    for (const p of this.patterns) {
      if (!p.pattern.test(topic)) continue
      const schema = p.events.get(event)
      if (schema) return schema
    }
    return null
  }

  list(): EventContractRecord[] {
    const out: EventContractRecord[] = []
    for (const [topic, events] of this.exact.entries()) {
      for (const [event, schema] of events.entries()) {
        out.push({ topic, event, schema })
      }
    }
    for (const p of this.patterns) {
      for (const [event, schema] of p.events.entries()) {
        out.push({ topic: p.pattern, event, schema })
      }
    }
    return out
  }
}

export const globalContracts = new TopicContractRegistry()

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return `${str.slice(0, Math.max(0, max - 1))}…`
}

function safeStringify(value: unknown, maxLen = 1500): string {
  try {
    return truncate(JSON.stringify(value), maxLen)
  } catch {
    return "[unserializable]"
  }
}

export async function validateEventContract(args: {
  topic: string
  event: string
  payload: unknown
  source: "publish" | "receive"
  schema?: StandardSchemaV1 | null
  registry?: TopicContractRegistry
}): Promise<boolean> {
  const registry = args.registry ?? globalContracts
  const schema = args.schema ?? registry.getSchema(args.topic, args.event)
  if (!schema) return true

  const mode = modeFromEnv()
  if (mode === "off") return true

  const result = await schema["~standard"].validate(args.payload)
  if (!result.issues) return true

  const message =
    `[Contracts] Contract violation (${args.source}): topic="${args.topic}" event="${args.event}". ` +
    `Payload=${safeStringify(args.payload)} Issues=${safeStringify(result.issues, 2000)}`

  if (mode === "strict") {
    throw new Error(message)
  }

  console.warn(message)
  return false
}
