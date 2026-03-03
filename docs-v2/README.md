# HonoStar Documentation

This documentation set follows the **Diataxis** framework:

- **Tutorials**: learning-oriented, step-by-step lessons.
- **How-to guides**: goal-oriented instructions for real work.
- **Reference**: factual API and behavior documentation.
- **Explanation**: architectural rationale and tradeoffs.

HonoStar is a runtime-agnostic meta-framework for hypermedia-first web apps with server-rendered HTML, SSE updates, and CQRS-style event flow.

## Start Here

If you are new to HonoStar:

1. [Build a Live Page (Tutorial)](./tutorials/build-a-live-issues-page.md)
2. [Bootstrap a HonoStar App (How-to)](./how-to/bootstrap-a-honostar-app.md)
3. [Server API Reference](./reference/server-api.md)
4. [Architecture and Mental Model](./explanation/architecture-and-mental-model.md)

## Documentation Map

### Tutorials

- [Tutorials Overview](./tutorials/README.md)
- [Build a Live Page with CQRS + SSE](./tutorials/build-a-live-issues-page.md)
- [Add Typed Contracts and Regions](./tutorials/add-typed-contracts-and-regions.md)

### How-to guides

- [How-to Overview](./how-to/README.md)
- [Bootstrap a HonoStar App](./how-to/bootstrap-a-honostar-app.md)
- [Add a Command with Validation](./how-to/add-a-command-with-validation.md)
- [Add Query Re-rendering over SSE](./how-to/add-query-re-rendering-over-sse.md)
- [Register Custom Effects](./how-to/register-custom-effects.md)
- [Stream Live Data](./how-to/stream-live-data.md)
- [Tune Prefetch Behavior](./how-to/tune-prefetch-behavior.md)
- [Configure Bus Backends](./how-to/configure-bus-backends.md)
- [Harden for Production](./how-to/harden-for-production.md)
- [Use Cloudflare Durable Objects](./how-to/use-cloudflare-durable-objects.md)

### Reference

- [Reference Overview](./reference/README.md)
- [Server API](./reference/server-api.md)
- [FX Responder API](./reference/fx-responder-api.md)
- [Configuration Reference](./reference/configuration.md)
- [Build and Assets](./reference/build-and-assets.md)
- [SSE and Effects Protocol](./reference/sse-and-effects-protocol.md)
- [Routing and Codegen](./reference/routing-and-codegen.md)
- [Client Runtime API](./reference/client-runtime-api.md)
- [Packages and Exports](./reference/packages-and-exports.md)

### Explanation

- [Explanation Overview](./explanation/README.md)
- [Architecture and Mental Model](./explanation/architecture-and-mental-model.md)
- [Fat Patches and Self-Healing](./explanation/fat-patches-and-self-healing.md)
- [Reply vs Publish vs Broadcast](./explanation/reply-vs-publish-vs-broadcast.md)
- [Security Model](./explanation/security-model.md)
- [Transport and Runtime Design](./explanation/transport-and-runtime-design.md)

## Scope and Source of Truth

This documentation is written from the current source under:

- `packages/core/src/`
- `packages/standard/src/`
- `packages/inspector/src/`
- `packages/cli/src/`
- `packages/cloudflare/src/`
- `apps/starter/src/`
- `apps/demo/src/`

Where docs and code disagree, the code is authoritative.
