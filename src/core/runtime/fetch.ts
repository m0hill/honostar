type BrowserFetch = typeof window.fetch

export function installFetchAugmentation(opts: {
  tabId: string
  csrfToken: string | null
}): () => void {
  const originalFetch: BrowserFetch = window.fetch
  const originalPreconnect = originalFetch.preconnect?.bind(originalFetch)

  const patchedFetch: BrowserFetch = Object.assign(
    (input: Parameters<BrowserFetch>[0], init?: Parameters<BrowserFetch>[1]) => {
      const nextInit = init ?? {}
      const headers = new Headers(nextInit.headers ?? {})
      headers.set('X-Tab-ID', opts.tabId)
      if (opts.csrfToken) {
        headers.set('X-CSRF-Token', opts.csrfToken)
      }
      nextInit.headers = headers
      return originalFetch(input, nextInit)
    },
    {
      preconnect: (...args: Parameters<NonNullable<BrowserFetch['preconnect']>>) => {
        originalPreconnect?.(...args)
      },
    }
  )

  window.fetch = patchedFetch

  return () => {
    window.fetch = originalFetch
  }
}
