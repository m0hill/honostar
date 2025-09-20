# Agent Guidelines

## Commands
- `bun run dev` - Start development server with hot reload
- `bun run lint` - Run oxlint with type checking
- `bun run format` - Format code with Biome
- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:migrate` - Run database migrations

## Code Style
- **Formatting**: 2 spaces, 100 char lines, single quotes, semicolons as needed
- **Imports**: Use `@/*` path aliases for src imports
- **Types**: Strict TypeScript with noImplicitAny, exactOptionalPropertyTypes
- **Linting**: oxlint with correctness/suspicious rules, unicorn/typescript plugins
- **Framework**: Hono with JSX, Drizzle ORM, Zod validation
- **Testing**: No test framework configured yet

## Framework Overview
This is a full-stack framework built on Hono with Datastar integration for real-time updates.

### Core Components
- **Datastar**: Server-sent events for reactive UI updates with element/signals patching
- **SSE System**: Pub/sub bus for client/topic messaging with automatic cleanup
- **Routing**: File-based routing from `src/routes/` with dynamic parameters
- **Context**: Type-safe app context with DB, bus, and rendering utilities
