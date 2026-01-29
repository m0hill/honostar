import type { JSX } from "hono/jsx/jsx-runtime"
import type { ElementPatchMode, PatchElementsOptions } from "../common/types"

export const HonostarRegionAttr = "data-honostar-region"
export const HonostarRegionKindAttr = "data-honostar-region-kind"

export type RegionId = string

// `kind` is currently semantics-only (devtools/docs), not runtime behavior.
export type RegionKind = string

export type RegionDeclaration = {
  id: RegionId
  kind?: RegionKind
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

function base64urlEncodeUtf8(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

export function regionDomId(regionId: RegionId): string {
  return `honostar-region--${base64urlEncodeUtf8(regionId)}`
}

function cssAttributeValueEscape(value: string): string {
  let out = ""
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    if (ch === "\\") {
      out += "\\\\"
      continue
    }
    if (ch === '"') {
      out += '\\"'
      continue
    }
    if (ch === "\n") {
      out += "\\A "
      continue
    }
    if (ch === "\r") {
      out += "\\D "
      continue
    }
    if (ch === "\f") {
      out += "\\C "
      continue
    }
    if (code < 0x20 || code === 0x7f) {
      out += `\\${code.toString(16)} `
      continue
    }
    out += ch
  }
  return out
}

export function regionSelector(regionId: RegionId): string {
  return `[${HonostarRegionAttr}="${cssAttributeValueEscape(regionId)}"]`
}

export function regionAttrs(regionId: RegionId, options?: { kind?: RegionKind }) {
  const attrs: Record<string, string> = {
    [HonostarRegionAttr]: regionId,
  }
  if (options?.kind) attrs[HonostarRegionKindAttr] = options.kind
  return attrs
}

export function Region(props: { id: RegionId; kind?: RegionKind } & JSX.IntrinsicElements["div"]) {
  const { id, kind, children, ...rest } = props
  // Note: we intentionally do not allow callers to override `id`; it must be stable.
  const { id: _ignored, ...restNoId } = rest as { id?: unknown }
  return (
    <div id={regionDomId(id)} {...restNoId} {...regionAttrs(id, kind ? { kind } : undefined)}>
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
    { id: "ui:overlays", kind: "overlay", allowModes: ["append"] },
    { id: "ui:toasts", kind: "list", allowModes: ["append"] },
  ])
  return registry
}

const incrementalModes = new Set<ElementPatchMode>(["append", "prepend", "before", "after"])

function getDiscipline(): RegionPatchDiscipline {
  const raw = process.env.HONOSTAR_REGION_PATCH_DISCIPLINE
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

  return {
    ...opts,
    selector: regionSelector(patch.region),
  }
}
