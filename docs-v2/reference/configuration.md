# Configuration Reference

Reference for `HonostarConfig` used by `createConfig(...)`.

## Top-level shape

```ts
type HonostarConfig = {
  document?: { title?: string; lang?: string }
  assets: {
    css: string
    runtime: string
    datastar: string
    plugins?: string[]
    version?: string
  }
  endpoints: { sse: string }
  security: {
    csp: string
    csrf?: {
      cookieName?: string
      headerName?: string
      exceptPaths?: (string | RegExp)[]
    }
    topics?: {
      cookieName?: string
      maxAgeSec?: number
      secretEnv?: string
      bindToClientId?: boolean
    }
  }
  sse?: { pingIntervalMs?: number }
  devtools?: {
    inspector?: {
      enabled?: boolean
      maxEvents?: number
      defaultTab?: "signals" | "patches" | "sse" | "persisted"
      defaultViewMode?: "json" | "table"
      defaultPosition?: "bottom" | "right" | "left" | "top"
    }
  }
}
```

## Defaults

Important defaults from `DEFAULT_CONFIG`:

- `document.title`: `"Honostar"`
- `document.lang`: `"en"`
- `assets.css`: `"/styles.css"`
- `assets.runtime`: `"/runtime.js"`
- `assets.datastar`: `"/datastar.js"`
- `assets.plugins`: `[]`
- `assets.version`: `process.env.HONOSTAR_ASSET_VERSION ?? ""`
- `endpoints.sse`: `"/_/events"`
- `security.csp`: `script-src 'self' 'unsafe-eval' 'nonce-${nonce}';`
- `security.csrf.cookieName`: `"ds_csrf"`
- `security.csrf.headerName`: `"X-CSRF-Token"`
- `security.topics.cookieName`: `"honostar_topics"`
- `security.topics.maxAgeSec`: `300`
- `security.topics.secretEnv`: `"HONOSTAR_SIGNING_SECRET"`
- `security.topics.bindToClientId`: `false`
- `sse.pingIntervalMs`: `25000`

## Merge behavior

`createConfig(user)` deep-merges user values with defaults.

Special behavior:

- If `security.csrf.exceptPaths` is not provided, it auto-syncs to `[endpoints.sse]`.

## Security notes

- CSP must include `'unsafe-eval'` because Datastar evaluates expressions with `Function()`.
- Use `${nonce}` in CSP so renderer can inject per-request nonce.
- Topic signing secret is mandatory for production topic allowlist enforcement.

## Example

```ts
const config = createConfig({
  document: { title: "Acme" },
  assets: {
    css: "/assets/app.css",
    runtime: "/assets/runtime.js",
    datastar: "/datastar.js",
    plugins: ["/assets/plugins.js"],
  },
  endpoints: { sse: "/_/events" },
  security: {
    csp: "script-src 'self' 'unsafe-eval' 'nonce-${nonce}';",
    csrf: { exceptPaths: [/^\/webhooks\//, "/_/events"] },
    topics: { secretEnv: "HONOSTAR_SIGNING_SECRET", maxAgeSec: 300 },
  },
})
```
