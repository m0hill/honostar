# Runtime Compatibility

Honostar is designed to be **runtime-agnostic** and work with any JavaScript runtime supported by Hono.

## Current Status

### ✅ Fully Runtime-Agnostic (Core Framework)

The entire `src/core/` directory uses only:
- **Standard Web APIs** (`crypto`, `Response`, `ReadableStream`, etc.)
- **Node.js built-ins** (`node:fs`, `node:path`, `node:url`) - available in Node.js, Bun, and Deno
- **Hono** - officially supports Node.js, Bun, Deno, Cloudflare Workers, and more

**Key runtime-agnostic components:**
- Router system (`src/core/router/`)
- Route manifest generator (`src/core/router/generator.ts`)
- SSE bus abstraction (`MemoryBus` and `RedisBus`)
- Datastar responder and SSE streaming
- Theme system
- Security (CSRF)
- Page and handler abstractions

### 🟡 Application-Level Adapters Needed

These parts need runtime-specific adapters when deploying to different environments:

1. **`src/index.ts`** - Server entry point
   - Currently uses `serveStatic` from `hono/bun`
   - **Solution**: Swap to runtime-specific static file middleware
     - Node.js: `hono/node-server` + `serveStatic`
     - Deno: `hono/deno` + `serveStatic`
     - Cloudflare Workers: Use R2 or CDN for static assets

2. **`src/lib/auth.tsx`** - Password hashing
   - Currently uses `Bun.password.hash()` and `Bun.password.verify()`
   - **Solution**: Use `bcrypt` or `argon2` (works on all runtimes)

3. **`src/db/index.ts`** - Database adapter
   - Currently uses `better-sqlite3` (Node/Bun compatible)
   - **Solution**: Already runtime-agnostic if using Drizzle with appropriate driver

## Running on Different Runtimes

### Node.js

```bash
# Generate routes (works with Node.js)
npm run routes:generate

# Start server (needs adapter changes)
# 1. Change src/index.ts to use hono/node-server
# 2. Replace Bun.password with bcrypt
npm start
```

### Bun (Current)

```bash
bun run routes:generate
bun run dev
```

### Deno

```bash
# Generate routes
deno task routes:generate

# Start server (needs adapter changes)
# 1. Change src/index.ts to use hono/deno
# 2. Replace Bun.password with deno-native crypto
deno task dev
```

### Cloudflare Workers

Requires more significant changes:
1. Replace static file serving with R2/CDN
2. Replace SQLite with D1 or remote database
3. Adapt Redis bus to use Durable Objects or Redis via TCP
4. Use Web Crypto API for password hashing

## Creating Runtime Adapters

To make switching runtimes easier, create adapter files:

```typescript
// src/adapters/password.ts
export const hashPassword = (password: string) => {
  // Runtime-specific implementation
}

export const verifyPassword = (password: string, hash: string) => {
  // Runtime-specific implementation
}

// src/adapters/static-files.ts
export const createStaticMiddleware = () => {
  // Runtime-specific serveStatic
}
```

Then use environment-based imports or build-time module resolution.

## Summary

**Core Framework**: ✅ Already runtime-agnostic  
**Route Generation**: ✅ Works with Node.js, Bun, Deno  
**Application Code**: 🟡 Needs 2-3 small adapter changes per runtime

The framework is designed to be portable - the core abstractions work everywhere, only the application-level integrations need runtime-specific adapters.
