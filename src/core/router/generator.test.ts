import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { generateRouteManifest } from './generator'

describe('generateRouteManifest', () => {
  function createTestDirs(testName: string) {
    const tmpDir = join(process.cwd(), '.test-tmp-routes', testName)
    const pagesDir = join(tmpDir, 'pages')
    const manifestPath = join(tmpDir, 'routes.manifest.ts')
    const routesPath = join(tmpDir, 'routes.ts')

    async function setup() {
      await rm(tmpDir, { recursive: true, force: true })
      await mkdir(pagesDir, { recursive: true })
    }

    async function teardown() {
      await rm(tmpDir, { recursive: true, force: true })
    }

    return { tmpDir, pagesDir, manifestPath, routesPath, setup, teardown }
  }

  test('generates manifest from simple routes', async () => {
    const { pagesDir, manifestPath, routesPath, setup, teardown } = createTestDirs('simple-routes')
    await setup()

    // Create test pages
    await writeFile(join(pagesDir, 'index.tsx'), 'export default () => <div>Home</div>')
    await writeFile(join(pagesDir, 'about.tsx'), 'export default () => <div>About</div>')

    await generateRouteManifest({ pagesDir, manifestPath, routesPath })

    const manifest = await readFile(manifestPath, 'utf-8')
    assert.ok(manifest.includes('routePath: "/"'))
    assert.ok(manifest.includes('routePath: "/about"'))
    assert.ok(manifest.includes('load: () => import'))

    const routes = await readFile(routesPath, 'utf-8')
    assert.ok(routes.includes("import { route } from '@/core/route'"))
    assert.ok(routes.includes('export const routes = route('))

    await teardown()
  })

  test('handles dynamic routes', async () => {
    const { pagesDir, manifestPath, routesPath, setup, teardown } = createTestDirs('dynamic-routes')
    await setup()

    await mkdir(join(pagesDir, 'posts'), { recursive: true })
    await writeFile(join(pagesDir, 'posts/[id].tsx'), 'export default () => <div>Post</div>')

    await generateRouteManifest({ pagesDir, manifestPath, routesPath })

    const manifest = await readFile(manifestPath, 'utf-8')
    assert.ok(manifest.includes('routePath: "/posts/:id"'))

    await teardown()
  })

  test('handles nested routes', async () => {
    const { pagesDir, manifestPath, routesPath, setup, teardown } = createTestDirs('nested-routes')
    await setup()

    await mkdir(join(pagesDir, 'blog/posts'), { recursive: true })
    await writeFile(join(pagesDir, 'blog/posts/index.tsx'), 'export default () => <div>Posts</div>')
    await writeFile(join(pagesDir, 'blog/posts/[slug].tsx'), 'export default () => <div>Post</div>')

    await generateRouteManifest({ pagesDir, manifestPath, routesPath })

    const manifest = await readFile(manifestPath, 'utf-8')
    assert.ok(manifest.includes('routePath: "/blog/posts"'))
    assert.ok(manifest.includes('routePath: "/blog/posts/:slug"'))

    await teardown()
  })

  test('skips files starting with underscore', async () => {
    const { pagesDir, manifestPath, routesPath, setup, teardown } = createTestDirs('underscore')
    await setup()

    await writeFile(join(pagesDir, '_component.tsx'), 'export const Component = () => <div />')
    await writeFile(join(pagesDir, 'page.tsx'), 'export default () => <div>Page</div>')

    await generateRouteManifest({ pagesDir, manifestPath, routesPath })

    const manifest = await readFile(manifestPath, 'utf-8')
    assert.ok(!manifest.includes('_component'))
    assert.ok(manifest.includes('routePath: "/page"'))

    await teardown()
  })

  test('sorts routes with static before dynamic', async () => {
    const { pagesDir, manifestPath, routesPath, setup, teardown } = createTestDirs('sorting')
    await setup()

    await mkdir(join(pagesDir, 'posts'), { recursive: true })
    await writeFile(join(pagesDir, 'posts/new.tsx'), 'export default () => <div>New</div>')
    await writeFile(join(pagesDir, 'posts/[id].tsx'), 'export default () => <div>Post</div>')

    await generateRouteManifest({ pagesDir, manifestPath, routesPath })

    const manifest = await readFile(manifestPath, 'utf-8')
    const newIndex = manifest.indexOf('routePath: "/posts/new"')
    const idIndex = manifest.indexOf('routePath: "/posts/:id"')
    assert.ok(newIndex < idIndex, 'Static route /posts/new should come before dynamic /posts/:id')

    await teardown()
  })

  test('respects custom route configuration', async () => {
    const { pagesDir, manifestPath, routesPath, setup, teardown } = createTestDirs('custom-config')
    await setup()

    await mkdir(join(pagesDir, 'issues'), { recursive: true })
    await writeFile(join(pagesDir, 'issues/[id].tsx'), 'export default () => <div>Issue</div>')

    const routesConfig = {
      '/issues/:id': [['issues', 'detail']],
    }

    await generateRouteManifest({ pagesDir, manifestPath, routesPath, routesConfig })

    const routes = await readFile(routesPath, 'utf-8')
    assert.ok(routes.includes('issues:'))
    assert.ok(routes.includes('detail:'))

    await teardown()
  })

  test('handles catch-all routes', async () => {
    const { pagesDir, manifestPath, routesPath, setup, teardown } = createTestDirs('catch-all')
    await setup()

    await mkdir(join(pagesDir, 'docs'), { recursive: true })
    await writeFile(join(pagesDir, 'docs/[...slug].tsx'), 'export default () => <div>Docs</div>')

    await generateRouteManifest({ pagesDir, manifestPath, routesPath })

    const manifest = await readFile(manifestPath, 'utf-8')
    assert.ok(manifest.includes('routePath: "/docs/*"'))

    await teardown()
  })

  test('creates output directories if they do not exist', async () => {
    const { tmpDir, pagesDir, setup, teardown } = createTestDirs('deep-dirs')
    await rm(tmpDir, { recursive: true, force: true })

    const deepManifestPath = join(tmpDir, 'deeply/nested/routes.manifest.ts')
    const deepRoutesPath = join(tmpDir, 'deeply/nested/routes.ts')

    await mkdir(pagesDir, { recursive: true })
    await writeFile(join(pagesDir, 'index.tsx'), 'export default () => <div>Home</div>')

    await generateRouteManifest({
      pagesDir,
      manifestPath: deepManifestPath,
      routesPath: deepRoutesPath,
    })

    const manifest = await readFile(deepManifestPath, 'utf-8')
    assert.ok(manifest.includes('routePath: "/"'))

    await teardown()
  })
})
