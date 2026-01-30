import type { HonostarConfig } from "../config"

export type ViteManifestEntry = {
  file: string
  src?: string
  isEntry?: boolean
  css?: string[]
  assets?: string[]
  imports?: string[]
  dynamicImports?: string[]
}

export type ViteManifest = Record<string, ViteManifestEntry>

export async function readViteManifest(manifestPath: string | URL): Promise<ViteManifest> {
  const { readFile } = await import("node:fs/promises")
  const { fileURLToPath } = await import("node:url")
  const path = typeof manifestPath === "string" ? manifestPath : fileURLToPath(manifestPath)
  const raw = await readFile(path, "utf-8")
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`[Vite] Invalid manifest format at ${path}`)
  }
  return parsed as ViteManifest
}

function joinUrl(base: string, file: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base
  const f = file.startsWith("/") ? file : `/${file}`
  return `${b}${f}`
}

function resolveManifestEntry(manifest: ViteManifest, key: string): ViteManifestEntry {
  const entry = manifest[key]
  if (entry) return entry

  // Allow passing `./src/client.ts` while manifest keys are `src/client.ts`.
  const normalized = key.startsWith("./") ? key.slice(2) : key
  const normalizedEntry = manifest[normalized]
  if (normalizedEntry) return normalizedEntry

  // Best-effort fallback: match by `src` field.
  for (const v of Object.values(manifest)) {
    if (v.src === key || v.src === normalized) return v
  }

  throw new Error(`[Vite] Manifest missing entry for "${key}"`)
}

function resolveCssFile(entry: ViteManifestEntry): string {
  if (entry.file.endsWith(".css")) return entry.file
  const css = entry.css?.[0]
  if (css) return css
  throw new Error("[Vite] Manifest entry did not include a CSS output file")
}

export function resolveHonostarAssetsFromViteManifest(
  manifest: ViteManifest,
  options: {
    /**
     * URL base where the built files are served from.
     * For Honostar apps that serve `dist/` at the origin root, this should be "/".
     */
    baseUrl?: string
    runtimeEntry: string
    cssEntry: string
    pluginsEntries?: string[]
  }
): Pick<HonostarConfig["assets"], "css" | "runtime" | "plugins"> {
  const baseUrl = options.baseUrl ?? ""

  const runtime = resolveManifestEntry(manifest, options.runtimeEntry)
  const css = resolveManifestEntry(manifest, options.cssEntry)
  const plugins = (options.pluginsEntries ?? []).map((k) => resolveManifestEntry(manifest, k))

  return {
    runtime: joinUrl(baseUrl, runtime.file),
    css: joinUrl(baseUrl, resolveCssFile(css)),
    plugins: plugins.map((p) => joinUrl(baseUrl, p.file)),
  }
}
