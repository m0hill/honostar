#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateRouteManifest } from '@honostar/core/server'

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const pagesDir = resolve(appRoot, 'src/pages')
const manifestPath = resolve(appRoot, 'src/routes.manifest.ts')
const routesPath = resolve(appRoot, 'src/routes.ts')
const configPath = resolve(appRoot, 'scripts/routes.config.json')

async function loadRoutesConfig() {
  try {
    const content = await readFile(configPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

async function main() {
  const routesConfig = await loadRoutesConfig()

  await generateRouteManifest({
    pagesDir,
    manifestPath,
    routesPath,
    routesConfig,
    serverImportPath: '@honostar/core/server',
  })

  const relativeManifest = join('src', 'routes.manifest.ts')
  const relativeRoutes = join('src', 'routes.ts')

  console.log(`✓ Generated ${relativeManifest}`)
  console.log(`✓ Generated ${relativeRoutes}`)
}

main().catch(error => {
  console.error('Failed to generate routes:', error)
  process.exit(1)
})
