#!/usr/bin/env node
import { spawn, type ChildProcess } from "node:child_process"
import { mkdir, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import process from "node:process"
import { generateContractsTypes, generateRouteManifest } from "@honostar/core/server"

type HonostarPackageConfig = {
  depsBuild?: string[]
  routes?: {
    pagesDir: string
    manifestPath: string
    routesPath: string
    configPath?: string
    serverImportPath?: string
  }
  contracts?: {
    contractsImportPath: string
    outPath: string
    serverImportPath?: string
    contractsExportName?: string
    contractsAccessor?: string
  }
  server?: {
    dev?: string
    start?: string
  }
}

function usage(): never {
  console.error(
    [
      "Usage: honostar <command>",
      "",
      "Commands:",
      "  prepare        Generate routes + contracts (if configured)",
      "  build          Prepare + build assets (no server)",
      "  dev            Prepare, then run assets/server in watch mode",
      "  start          Prepare, then run assets build + server start",
      "  assets:dev     Run `vite build --watch`",
      "  assets:build   Run `vite build`",
      "",
      "Configure per-app in package.json under the `honostar` key.",
    ].join("\n")
  )
  process.exit(2)
}

async function readJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8")
  return JSON.parse(raw) as T
}

async function readAppConfig(appRoot: string): Promise<HonostarPackageConfig> {
  const pkgPath = resolve(appRoot, "package.json")
  if (!existsSync(pkgPath)) {
    throw new Error(`No package.json found in ${appRoot}`)
  }
  const pkg = await readJson<{ honostar?: HonostarPackageConfig }>(pkgPath)
  return pkg.honostar ?? {}
}

function spawnShell(command: string, args: string[], cwd: string): ChildProcess {
  return spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: process.env,
  })
}

function spawnCommandLineWithEnv(
  cmdline: string,
  cwd: string,
  extraEnv: Record<string, string>
): ChildProcess {
  return spawn(cmdline, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...extraEnv },
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

async function waitForFileWhileRunning(
  filePath: string,
  proc: ChildProcess,
  label: string,
  options?: { timeoutMs?: number; pollMs?: number }
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 30_000
  const pollMs = options?.pollMs ?? 200

  const startedAt = Date.now()
  while (!existsSync(filePath)) {
    if (proc.exitCode !== null) {
      throw new Error(
        `[honostar] ${label} exited before writing ${filePath} (exit ${proc.exitCode})`
      )
    }
    if (proc.signalCode !== null) {
      throw new Error(
        `[honostar] ${label} exited before writing ${filePath} (signal ${proc.signalCode})`
      )
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`[honostar] Timed out waiting for ${filePath}`)
    }
    await sleep(pollMs)
  }
}

async function runDepsBuild(cfg: HonostarPackageConfig, cwd: string) {
  const deps = cfg.depsBuild ?? []
  for (const dep of deps) {
    await new Promise<void>((res, rej) => {
      const p = spawnShell("pnpm", ["--filter", dep, "build"], cwd)
      p.on("exit", (code) => {
        if (code === 0) res()
        else rej(new Error(`Failed: pnpm --filter ${dep} build (exit ${code})`))
      })
    })
  }
}

async function runRoutes(cfg: HonostarPackageConfig, appRoot: string) {
  const r = cfg.routes
  if (!r) return

  let routesConfig: Record<string, string[][]> = {}
  if (r.configPath) {
    const p = resolve(appRoot, r.configPath)
    if (existsSync(p)) {
      const parsed = await readJson<unknown>(p)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const rec = parsed as Record<string, unknown>
        const next: Record<string, string[][]> = {}
        for (const [k, v] of Object.entries(rec)) {
          if (
            Array.isArray(v) &&
            v.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"))
          ) {
            next[k] = v as string[][]
          }
        }
        routesConfig = next
      }
    }
  }

  const manifestPath = resolve(appRoot, r.manifestPath)
  const routesPath = resolve(appRoot, r.routesPath)
  await mkdir(dirname(manifestPath), { recursive: true })
  await mkdir(dirname(routesPath), { recursive: true })

  await generateRouteManifest({
    pagesDir: resolve(appRoot, r.pagesDir),
    manifestPath,
    routesPath,
    routesConfig,
    serverImportPath: r.serverImportPath ?? "@honostar/core/server",
  })
}

async function runContracts(cfg: HonostarPackageConfig, appRoot: string) {
  const c = cfg.contracts
  if (!c) return

  const outPath = resolve(appRoot, c.outPath)
  await mkdir(dirname(outPath), { recursive: true })

  await generateContractsTypes({
    contractsImportPath: c.contractsImportPath,
    outPath,
    serverImportPath: c.serverImportPath ?? "@honostar/core/server",
    ...(c.contractsExportName ? { contractsExportName: c.contractsExportName } : {}),
    ...(c.contractsAccessor ? { contractsAccessor: c.contractsAccessor } : {}),
  })
}

async function prepare(cfg: HonostarPackageConfig, appRoot: string) {
  await runRoutes(cfg, appRoot)
  await runContracts(cfg, appRoot)
}

function runAssetsDev(appRoot: string): ChildProcess {
  return spawnShell("pnpm", ["exec", "vite", "build", "--watch"], appRoot)
}

function runAssetsBuild(appRoot: string): Promise<void> {
  return new Promise<void>((res, rej) => {
    const p = spawnShell("pnpm", ["exec", "vite", "build"], appRoot)
    p.on("exit", (code) => {
      if (code === 0) res()
      else rej(new Error(`Failed: vite build (exit ${code})`))
    })
  })
}

function runServerDev(cfg: HonostarPackageConfig, appRoot: string): ChildProcess {
  const cmd = cfg.server?.dev
  if (!cmd) {
    throw new Error("Missing `honostar.server.dev` in package.json")
  }
  return spawnCommandLineWithEnv(cmd, appRoot, {
    HONOSTAR_VITE_MANIFEST_PATH: "dist/manifest.json",
  })
}

function runServerStart(cfg: HonostarPackageConfig, appRoot: string): ChildProcess {
  const cmd = cfg.server?.start
  if (!cmd) {
    throw new Error("Missing `honostar.server.start` in package.json")
  }
  return spawnCommandLineWithEnv(cmd, appRoot, {
    HONOSTAR_VITE_MANIFEST_PATH: "dist/manifest.json",
  })
}

function waitForExit(p: ChildProcess, label: string): Promise<number> {
  return new Promise<number>((res) => {
    p.on("exit", (code) => {
      if (typeof code === "number") res(code)
      else res(1)
    })
    p.on("error", () => res(1))
    p.on("close", (code) => {
      if (typeof code === "number") res(code)
      else res(1)
    })
  }).then((code) => {
    if (code !== 0) {
      console.error(`[honostar] ${label} exited with ${code}`)
    }
    return code
  })
}

async function main() {
  const cmd = process.argv[2]
  if (!cmd) usage()

  const appRoot = process.cwd()
  const cfg = await readAppConfig(appRoot)

  if (cmd === "prepare") {
    await runDepsBuild(cfg, appRoot)
    await prepare(cfg, appRoot)
    return
  }

  if (cmd === "assets:dev") {
    const p = runAssetsDev(appRoot)
    process.exit(await waitForExit(p, "assets:dev"))
  }

  if (cmd === "assets:build") {
    await runAssetsBuild(appRoot)
    return
  }

  if (cmd === "dev") {
    await runDepsBuild(cfg, appRoot)
    await prepare(cfg, appRoot)
    const procs: Array<{ label: string; p: ChildProcess }> = []
    const assetsProc = runAssetsDev(appRoot)
    procs.push({ label: "assets:dev", p: assetsProc })

    const manifestPath = resolve(appRoot, "dist", "manifest.json")
    if (!existsSync(manifestPath)) {
      console.log(`[honostar] Waiting for Vite manifest at ${manifestPath}`)
      await waitForFileWhileRunning(manifestPath, assetsProc, "assets:dev")
    }

    procs.push({ label: "server:dev", p: runServerDev(cfg, appRoot) })

    const shutdown = () => {
      for (const { p } of procs) {
        try {
          p.kill("SIGTERM")
        } catch {}
      }
    }
    process.on("SIGINT", () => {
      shutdown()
      process.exit(130)
    })
    process.on("SIGTERM", () => {
      shutdown()
      process.exit(143)
    })

    const codes = await Promise.race(procs.map(({ label, p }) => waitForExit(p, label)))
    shutdown()
    process.exit(codes)
  }

  if (cmd === "build") {
    await runDepsBuild(cfg, appRoot)
    await prepare(cfg, appRoot)
    await runAssetsBuild(appRoot)
    return
  }

  if (cmd === "start") {
    await runDepsBuild(cfg, appRoot)
    await prepare(cfg, appRoot)
    await runAssetsBuild(appRoot)
    const p = runServerStart(cfg, appRoot)
    process.exit(await waitForExit(p, "server:start"))
  }

  usage()
}

main().catch((err) => {
  console.error("[honostar] Fatal:", err)
  process.exit(1)
})
