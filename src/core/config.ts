/**
 * Bonsai Framework Configuration
 *
 * Centralizes hardcoded client/server values behind a typed config consumed by core modules.
 * Provides safe defaults while allowing app authors to override paths and policies.
 */

export type BonsaiConfig = {
  /**
   * Asset paths for CSS and client-side scripts
   */
  assets: {
    /** Path to the main CSS file (default: '/styles.css') */
    css: string
    /** Path to the runtime bootstrap script (default: '/runtime.js') */
    runtime: string
    /** Path to the Datastar library (default: '/datastar.js') */
    datastar: string
  }
  /**
   * Framework endpoint paths
   */
  endpoints: {
    /**
     * SSE endpoint path for server-sent events
     * Renderer constructs `@get('<path>?topics=...')` using this value
     * (default: '/_/events')
     */
    sse: string
  }
  /**
   * Security policies
   */
  security: {
    /**
     * Content Security Policy for scripts
     * Template string where `${nonce}` will be replaced with the per-request nonce
     * MUST include `'unsafe-eval'` (Datastar expressions use Function())
     * (default: "script-src 'self' 'unsafe-eval' 'nonce-${nonce}';")
     */
    csp: string
    /**
     * CSRF protection configuration
     */
    csrf?: {
      /**
       * Cookie name for CSRF token storage
       * (default: 'ds_csrf')
       */
      cookieName?: string
      /**
       * Header name for CSRF token validation
       * (default: 'X-CSRF-Token')
       */
      headerName?: string
      /**
       * Paths to exempt from CSRF validation
       * Defaults to [config.endpoints.sse] to allow SSE connections
       * (default: ['/_/events'])
       */
      exceptPaths?: (string | RegExp)[]
    }
  }
  /**
   * Server-Sent Events configuration
   */
  sse?: {
    /**
     * Heartbeat interval in milliseconds to keep connections alive
     * (default: 25000)
     */
    pingIntervalMs?: number
  }
}

/**
 * Default configuration matching current hardcoded behavior
 * Ensures zero-config backwards compatibility
 */
export const DEFAULT_CONFIG: BonsaiConfig = {
  assets: {
    css: '/styles.css',
    runtime: '/runtime.js',
    datastar: '/datastar.js',
  },
  endpoints: {
    sse: '/_/events',
  },
  security: {
    csp: "script-src 'self' 'unsafe-eval' 'nonce-${nonce}';",
    csrf: {
      cookieName: 'ds_csrf',
      headerName: 'X-CSRF-Token',
      exceptPaths: ['/_/events'], // Will be overridden by createConfig to match endpoints.sse
    },
  },
  sse: {
    pingIntervalMs: 25000,
  },
}

/**
 * Deep-merge user config with defaults
 * Preserves all defaults unless explicitly overridden
 * Automatically syncs CSRF exceptPaths with SSE endpoint if not explicitly set
 */
export function createConfig(user?: Partial<BonsaiConfig>): BonsaiConfig {
  const merged = {
    ...DEFAULT_CONFIG,
    ...user,
    assets: { ...DEFAULT_CONFIG.assets, ...user?.assets },
    endpoints: { ...DEFAULT_CONFIG.endpoints, ...user?.endpoints },
    security: {
      ...DEFAULT_CONFIG.security,
      ...user?.security,
      csrf: {
        ...DEFAULT_CONFIG.security.csrf,
        ...user?.security?.csrf,
      },
    },
    sse: { ...DEFAULT_CONFIG.sse, ...user?.sse },
  }

  // Auto-sync CSRF exceptPaths with SSE endpoint if not explicitly overridden
  if (!user?.security?.csrf?.exceptPaths && merged.security.csrf) {
    merged.security.csrf.exceptPaths = [merged.endpoints.sse]
  }

  return merged
}
