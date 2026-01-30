import { readdir, readFile, stat, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import process from "node:process"

function isRelative(spec) {
  return spec.startsWith("./") || spec.startsWith("../")
}

function hasExtension(spec) {
  return /\.[a-zA-Z0-9]+$/.test(spec)
}

function normalizeSpecifier(fileDir, spec) {
  if (!isRelative(spec)) return spec
  if (hasExtension(spec)) return spec

  const absNoExt = resolve(fileDir, spec)
  const fileCandidate = `${absNoExt}.js`
  if (existsSync(fileCandidate)) return `${spec}.js`

  const indexCandidate = join(absNoExt, "index.js")
  if (existsSync(indexCandidate)) return `${spec}/index.js`

  // Leave as-is if we can't confidently resolve it.
  return spec
}

function rewriteSpecifiers(code, fileDir) {
  const replaceFrom = (match, quote, spec) => {
    const next = normalizeSpecifier(fileDir, spec)
    if (next === spec) return match
    return match.replace(`${quote}${spec}${quote}`, `${quote}${next}${quote}`)
  }

  // `import ... from "..."` and `export ... from "..."`.
  code = code.replace(/(\bfrom\s+)(["'])(\.{1,2}\/[^"']+)\2/g, (m, _from, q, s) =>
    replaceFrom(m, q, s)
  )

  // Side-effect imports: `import "./x"`.
  code = code.replace(/(\bimport\s+)(["'])(\.{1,2}\/[^"']+)\2/g, (m, _imp, q, s) =>
    replaceFrom(m, q, s)
  )

  // Dynamic imports: `import("./x")`.
  code = code.replace(/(\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']+)\2(\s*\))/g, (m, _a, q, s) =>
    replaceFrom(m, q, s)
  )

  return code
}

async function walk(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(p, out)
      continue
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      out.push(p)
    }
  }
}

async function main() {
  const target = process.argv[2]
  if (!target) {
    console.error("Usage: node scripts/fix-node-esm-imports.mjs <dist-dir>")
    process.exit(2)
  }

  const distDir = resolve(process.cwd(), target)
  const s = await stat(distDir).catch(() => null)
  if (!s || !s.isDirectory()) {
    console.error(`Not a directory: ${distDir}`)
    process.exit(2)
  }

  const files = []
  await walk(distDir, files)

  let changed = 0
  for (const file of files) {
    const original = await readFile(file, "utf-8")
    const next = rewriteSpecifiers(original, dirname(file))
    if (next !== original) {
      await writeFile(file, next, "utf-8")
      changed += 1
    }
  }

  if (process.env.HONOSTAR_DEBUG_FIX_IMPORTS === "1") {
    console.log(`[fix-node-esm-imports] Updated ${changed} file(s) under ${target}`)
  }
}

await main()
