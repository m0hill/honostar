import type { JSX } from "hono/jsx/jsx-runtime"
import type { ElementPatchMode, PatchElementsOptions } from "../common/types"
import { envGet, envIsProduction } from "./runtime-env"

export type RegionId = string

export type RegionDeclaration = {
  id: RegionId
  /**
   * Optional selector to use when patching this region.
   *
   * By default, Honostar patches regions by a derived DOM id (`regionDomId(...)`), which is stable
   * even when region ids contain characters not valid in HTML id attributes.
   *
   * Use `selector` only when you need to target an existing stable element in your layout
   * (e.g. `#ds-overlays`, `#toast-container`).
   */
  selector?: string
  /**
   * Patch modes explicitly allowed for this region.
   *
   * By default, Honostar encourages "fat patches" (outer/inner/replace) and warns
   * when incremental modes (append/prepend/before/after) are used without being allowed.
   */
  allowModes?: ElementPatchMode[]
}

type RegionPatchDiscipline = "warn" | "strict" | "off"

const warned = new Set<string>()

function warnOnce(key: string, ...args: Parameters<typeof console.warn>) {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(...args)
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = ""
    for (const b of bytes) binary += String.fromCharCode(b)
    const base64 = btoa(binary)
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "")
  }

  throw new Error("base64 encoding unavailable")
}

function base64urlEncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input)
  return base64urlEncodeBytes(bytes)
}

export function regionDomId(regionId: RegionId): string {
  return `honostar-region--${base64urlEncodeUtf8(regionId)}`
}

export function regionSelector(regionId: RegionId): string {
  return `#${regionDomId(regionId)}`
}

function base64urlDecodeToUtf8(value: string): string | null {
  const padding = (4 - (value.length % 4)) % 4
  const padded = `${value}${"=".repeat(padding)}`
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/")

  if (typeof atob === "function") {
    try {
      const binary = atob(base64)
      const bytes = new Uint8Array(Array.from(binary, (ch) => ch.charCodeAt(0)))
      return new TextDecoder().decode(bytes)
    } catch {
      return null
    }
  }

  if (typeof Buffer !== "undefined") {
    try {
      return Buffer.from(base64, "base64").toString("utf-8")
    } catch {
      return null
    }
  }

  return null
}

function parseRegionIdFromSelector(selector: string): string | null {
  const domIdMatch = selector.match(/#honostar-region--([A-Za-z0-9_-]+)/)
  if (domIdMatch?.[1]) {
    return base64urlDecodeToUtf8(domIdMatch[1])
  }

  return null
}

export function regionAttrs(regionId: RegionId): { id: string } {
  return { id: regionDomId(regionId) }
}

export function Region(props: { id: RegionId } & JSX.IntrinsicElements["div"]) {
  const { id, children, ...rest } = props
  // Note: we intentionally do not allow callers to override `id`; it must be stable.
  const { id: _ignored, ...restNoId } = rest as { id?: unknown }
  return (
    <div {...restNoId} {...regionAttrs(id)}>
      {children}
    </div>
  )
}

export type RegionPatchOptions = Omit<PatchElementsOptions, "selector">

export type RegionPatch = {
  region: RegionId
  html: JSX.Element | JSX.Element[] | string
  options?: RegionPatchOptions
}

export type RegionPatchSeq = {
  region: RegionId
  html: Array<JSX.Element | string>
  options?: RegionPatchOptions
}

export function patchRegion(
  region: RegionId,
  html: JSX.Element | JSX.Element[] | string,
  options?: RegionPatchOptions
): ["patch-region", RegionPatch] {
  return ["patch-region", { region, html, ...(options ? { options } : {}) }]
}

export function patchRegionSeq(
  region: RegionId,
  html: Array<JSX.Element | string>,
  options?: RegionPatchOptions
): ["patch-region-seq", RegionPatchSeq] {
  return ["patch-region-seq", { region, html, ...(options ? { options } : {}) }]
}

export class RegionRegistry {
  private regions = new Map<RegionId, RegionDeclaration>()

  registerAll(declarations: RegionDeclaration[]) {
    for (const decl of declarations) {
      if (!decl?.id) continue
      const existing = this.regions.get(decl.id)
      if (existing) {
        // Allow overriding with identical reference; warn otherwise.
        if (existing !== decl) {
          warnOnce(
            `regions:duplicate:${decl.id}`,
            `[Regions] Duplicate region declaration for "${decl.id}" detected; keeping the first.`
          )
        }
        continue
      }
      this.regions.set(decl.id, decl)
    }
  }

  get(id: RegionId): RegionDeclaration | undefined {
    return this.regions.get(id)
  }
}

export function createRegionRegistry(): RegionRegistry {
  const registry = new RegionRegistry()
  registry.registerAll([
    { id: "ui:overlays", selector: "#ds-overlays", allowModes: ["append"] },
    { id: "ui:toasts", selector: "#toast-container", allowModes: ["append"] },
  ])
  return registry
}

/**
 * Dev-only warning for selector-based region targeting that bypasses region registration.
 *
 * Prefer `patchRegion(...)` so selectors stay stable and policy checks can run.
 */
export function warnOnUnregisteredRegionSelector(
  selector: string,
  registry: RegionRegistry = createRegionRegistry()
): void {
  if (envIsProduction()) return
  const regionId = parseRegionIdFromSelector(selector)
  if (!regionId) return
  if (registry.get(regionId)) return

  warnOnce(
    `regions:unknown-selector:${selector}`,
    `[Regions] Selector "${selector}" targets region "${regionId}" but it is not registered. ` +
      "Use `patchRegion(...)` + `Region/regionAttrs`, and register page regions via `defineQueryPage({ regions: [...] })`."
  )
}

const incrementalModes = new Set<ElementPatchMode>(["append", "prepend", "before", "after"])

function getDiscipline(): RegionPatchDiscipline {
  const raw = envGet("HONOSTAR_REGION_PATCH_DISCIPLINE")
  if (raw === "off" || raw === "warn" || raw === "strict") return raw
  return "warn"
}

function isModeAllowed(
  regionId: RegionId,
  mode: ElementPatchMode,
  registry: RegionRegistry
): boolean {
  const decl = registry.get(regionId)
  if (!decl?.allowModes || decl.allowModes.length === 0) return false
  return decl.allowModes.includes(mode)
}

export function resolveRegionPatchOptions(
  patch: { region: RegionId; options?: RegionPatchOptions },
  registry: RegionRegistry = createRegionRegistry()
): PatchElementsOptions {
  const opts = patch.options ?? {}
  const mode = opts.mode

  if (mode && incrementalModes.has(mode) && !isModeAllowed(patch.region, mode, registry)) {
    const discipline = getDiscipline()
    const msg =
      `[Regions] Incremental patch mode "${mode}" used for region "${patch.region}" ` +
      "but not allowed by any region policy. Prefer fat patches by default."

    if (discipline === "strict") {
      throw new Error(msg)
    }
    if (discipline === "warn") {
      warnOnce(`regions:incremental:${patch.region}:${mode}`, msg)
    }
  }

  const selector = registry.get(patch.region)?.selector ?? regionSelector(patch.region)

  return {
    ...opts,
    selector,
  }
}
