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

type ViteEnvConfig = {
  manifestPath: string
  baseUrl: string
  runtimeEntry: string
  cssEntry: string
  pluginsEntry: string
  isDev: boolean
}

function readViteEnvConfig(): ViteEnvConfig | null {
  const env = typeof process !== "undefined" ? process.env : undefined
  const manifestPath = env?.HONOSTAR_VITE_MANIFEST_PATH
  if (!manifestPath) return null

  return {
    manifestPath,
    baseUrl: env?.HONOSTAR_VITE_BASE_URL ?? "",
    runtimeEntry: env?.HONOSTAR_VITE_RUNTIME_ENTRY ?? "src/client.ts",
    cssEntry: env?.HONOSTAR_VITE_CSS_ENTRY ?? "styles.css",
    pluginsEntry: env?.HONOSTAR_VITE_PLUGINS_ENTRY ?? "src/lib/plugins/index.ts",
    isDev: env?.NODE_ENV !== "production",
  }
}

type ViteAssetsCacheEntry = {
  mtimeMs: number
  resolved: Pick<HonostarConfig["assets"], "css" | "runtime" | "plugins">
}

const viteAssetsCache = new Map<string, ViteAssetsCacheEntry>()

async function resolveManifestPath(path: string): Promise<string> {
  const pathMod = await import("node:path")
  return pathMod.isAbsolute(path) ? path : pathMod.resolve(process.cwd(), path)
}

async function safeManifestMtimeMs(path: string): Promise<number | null> {
  try {
    const { stat } = await import("node:fs/promises")
    const st = await stat(path)
    return st.mtimeMs
  } catch {
    return null
  }
}

async function safeResolvePlugins(
  manifest: ViteManifest,
  pluginsEntry: string,
  baseUrl: string
): Promise<string[]> {
  try {
    const entry = resolveManifestEntry(manifest, pluginsEntry)
    return [joinUrl(baseUrl, entry.file)]
  } catch {
    return []
  }
}

/**
 * Honostar can automatically resolve Vite-built asset URLs from a Vite manifest,
 * so app code doesn't have to read `dist/manifest.json` manually.
 *
 * Enable by setting `HONOSTAR_VITE_MANIFEST_PATH` (typically `dist/manifest.json`).
 * `honostar dev`/`honostar start` should set this automatically.
 */
export async function resolveHonostarAssetsFromViteEnv(
  currentAssets: HonostarConfig["assets"]
): Promise<HonostarConfig["assets"]> {
  const cfg = readViteEnvConfig()
  if (!cfg) return currentAssets

  const manifestAbs = await resolveManifestPath(cfg.manifestPath)
  const mtimeMs = await safeManifestMtimeMs(manifestAbs)
  if (mtimeMs === null) return currentAssets

  const cached = viteAssetsCache.get(manifestAbs)
  if (!cfg.isDev && cached && cached.mtimeMs === mtimeMs) {
    return { ...currentAssets, ...cached.resolved }
  }

  const manifest = await readViteManifest(manifestAbs)
  const runtime = resolveManifestEntry(manifest, cfg.runtimeEntry)
  const css = resolveManifestEntry(manifest, cfg.cssEntry)
  const plugins = await safeResolvePlugins(manifest, cfg.pluginsEntry, cfg.baseUrl)

  const resolved: Pick<HonostarConfig["assets"], "css" | "runtime" | "plugins"> = {
    runtime: joinUrl(cfg.baseUrl, runtime.file),
    css: joinUrl(cfg.baseUrl, resolveCssFile(css)),
    plugins,
  }

  viteAssetsCache.set(manifestAbs, { mtimeMs, resolved })

  return {
    ...currentAssets,
    ...resolved,
    plugins: plugins.length > 0 ? plugins : (currentAssets.plugins ?? []),
  }
}
