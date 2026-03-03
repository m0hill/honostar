# Harden for Production

This checklist focuses on HonoStar's built-in security and correctness controls.

## 1. Set topic signing secret

Set `HONOSTAR_SIGNING_SECRET` (or your configured `security.topics.secretEnv`).

Without a secret:

- development mode: topic enforcement is disabled with warnings
- production mode: verification throws and SSE topic authorization fails

## 2. Use explicit config

```ts
const config = createConfig({
  security: {
    csp: "script-src 'self' 'unsafe-eval' 'nonce-${nonce}';",
    csrf: {
      cookieName: "ds_csrf",
      headerName: "X-CSRF-Token",
      exceptPaths: ["/_/events"],
    },
    topics: {
      secretEnv: "HONOSTAR_SIGNING_SECRET",
      maxAgeSec: 300,
      bindToClientId: false,
    },
  },
})
```

## 3. Keep middleware order correct

```ts
app.use("*", csrf(config))
app.use("*", renderer(config))
app.use("*", initContext)
app.use("*", attachBus)
app.use("*", fxResponder)
```

## 4. Use fat patches for canonical shared state

Return full region patches from queries:

```ts
patchRegion("issues:list", <IssuesList issues={allIssues} />)
```

Avoid incremental patch modes for canonical state.

## 5. Enforce stricter region discipline (optional)

Set:

```bash
HONOSTAR_REGION_PATCH_DISCIPLINE=strict
```

Values:

- `off`
- `warn` (default)
- `strict`

## 6. Enforce event contracts in staging/CI

Set:

```bash
HONOSTAR_EVENT_CONTRACTS=strict
```

Values:

- `off`
- `warn` (default in non-production)
- `strict`

## 7. Configure SSE for long-lived connections

- Keep compression enabled for `/_/events`.
- For Bun, disable idle timeout for SSE workloads (`idleTimeout: 0`).
- Tune ping interval via `sse.pingIntervalMs` only if infra requires it.

## 8. Validate topic design

- Topics must not leak cross-tenant data.
- Include tenant scope in topic strings when needed.
- Prefer deterministic topic builders in one module.

## 9. Monitor deployment behavior

Track:

- SSE connection count
- reconnect frequency
- command latency vs query latency
- bus publish failures
- contract validation warnings/errors
