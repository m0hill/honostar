type BrowserFetch = typeof window.fetch
type BrowserFetchWithPreconnect = BrowserFetch & {
  preconnect?: (...args: any[]) => unknown
}

export function installFetchAugmentation(opts: {
  tabId: string
  csrfToken: string | null
}): () => void {
  // The server injects a tiny inline bootstrap that patches fetch before Datastar initializes.
  // When present, avoid double-wrapping fetch in the client runtime.
  if (typeof window !== "undefined" && window.__honostarFetchBootstrapped) {
    return () => {}
  }

  const originalFetch: BrowserFetchWithPreconnect = window.fetch
  const originalPreconnect =
    typeof originalFetch.preconnect === "function"
      ? originalFetch.preconnect.bind(originalFetch)
      : null

  const patchedFetch: BrowserFetchWithPreconnect = Object.assign(
    (input: Parameters<BrowserFetch>[0], init?: Parameters<BrowserFetch>[1]) => {
      const nextInit = init ?? {}
      const headers = new Headers(nextInit.headers ?? {})
      headers.set("X-Tab-ID", opts.tabId)
      if (opts.csrfToken) {
        headers.set("X-CSRF-Token", opts.csrfToken)
      }
      nextInit.headers = headers
      return originalFetch(input, nextInit)
    },
    originalPreconnect
      ? {
          preconnect: (...args: any[]) => {
            originalPreconnect(...args)
          },
        }
      : {}
  )

  window.fetch = patchedFetch as BrowserFetch

  return () => {
    window.fetch = originalFetch as BrowserFetch
  }
}
