import type { ContractsDefinition } from "./contracts"
import type { RegionDeclaration } from "./regions"

type TopicIds = Record<string, string | ((...args: any[]) => string)>
type RegionInput = Record<string, string | RegionDeclaration>

type RegionIds<R extends RegionInput> = {
  [K in keyof R]: R[K] extends string
    ? R[K]
    : R[K] extends { id: infer Id extends string }
      ? Id
      : never
}

export type HonostarApp<
  TTopics extends TopicIds,
  TRegions extends RegionInput,
  TContracts extends ContractsDefinition,
> = Readonly<{
  ids: Readonly<{
    topics: TTopics
    regions: RegionIds<TRegions>
  }>
  contracts: TContracts
  regions: ReadonlyArray<RegionDeclaration>
}>

/**
 * Create an app-level container that acts as a single source of truth for:
 * - Topic identifiers/builders (for autocomplete + reuse)
 * - Region identifiers + declarations (for policies + autocomplete)
 * - Event contracts (for typed publish + validation)
 *
 * Note: This helper does not auto-register regions with pages or contracts with the runtime.
 * - Contracts are registered when you create them via `topic(...).event(...)`.
 * - Regions are registered per-request from page definitions (`defineQueryPage({ regions: [...] })`).
 */
export function createApp<
  const TTopics extends TopicIds,
  const TRegions extends RegionInput,
  const TContracts extends ContractsDefinition,
>(config: {
  topics: TTopics
  regions: TRegions
  contracts: TContracts
}): HonostarApp<TTopics, TRegions, TContracts> {
  const regionDecls = Object.values(config.regions).map((r) =>
    typeof r === "string" ? { id: r } : r
  )

  const regionIdsEntries = Object.entries(config.regions).map(([k, v]) => [
    k,
    typeof v === "string" ? v : v.id,
  ])

  return {
    ids: {
      topics: config.topics,
      regions: Object.fromEntries(regionIdsEntries) as RegionIds<TRegions>,
    },
    contracts: config.contracts,
    regions: regionDecls,
  }
}
