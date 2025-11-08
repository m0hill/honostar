import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createManifestRouteLoader,
  type RouteManifestEntry,
} from '@/core/router/manifest-route-loader'

void describe('createManifestRouteLoader', () => {
  void it('yields manifest entries in order and loads modules lazily', async () => {
    const calls: string[] = []
    const entries: RouteManifestEntry[] = [
      {
        routePath: '/alpha',
        load: async () => {
          calls.push('alpha')
          return { GET: () => 'alpha' }
        },
      },
      {
        routePath: '/beta',
        load: async () => {
          calls.push('beta')
          return { default: 'beta' }
        },
      },
    ]

    const loader = createManifestRouteLoader(entries)
    const seen: Array<{ routePath: string; module: Record<string, unknown> }> = []

    for await (const entry of loader.load()) {
      seen.push(entry)
    }

    assert.equal(calls.length, 2)
    assert.deepEqual(calls, ['alpha', 'beta'])
    assert.equal(seen[0]?.routePath, '/alpha')
    assert.ok('GET' in (seen[0]?.module ?? {}))
    assert.equal(seen[1]?.routePath, '/beta')
    assert.ok('default' in (seen[1]?.module ?? {}))
  })
})
