# Custom Effects Guide

This guide explains how to use Honostar's extensible effect system to create domain-specific abstractions that make your code cleaner and more maintainable.

## Why Custom Effects?

Without custom effects, your handlers can become verbose with repeated patterns:

```typescript
// ❌ Verbose and repetitive
export const POST = createHandler({
  async handler(c) {
    const issue = await createIssue(c)
    
    // Every time you create an issue, you repeat this pattern:
    return c.var.datastar.respond({
      effects: [
        ['patch-elements', <IssuesList issues={await fetchIssues(c)} />],
        ['patch-elements', <Toast message="Success!" type="success" />, { selector: '#toast-container', mode: 'append' }],
        ['patch-elements', '', { selector: '#create-issue-modal', mode: 'remove' }],
        ['patch-signals', { 'createIssueModal.open': false }]
      ],
      topics: ['issues:list'],
      toClient: true
    })
  }
})
```

With custom effects, you can create semantic, reusable abstractions:

```typescript
// ✅ Clean and semantic
export const POST = createHandler({
  async handler(c) {
    const issue = await createIssue(c)
    
    return c.var.datastar.reply([
      ['issue:created', issue]
    ])
  }
})
```

## Creating Custom Effects

### 1. Define Your Effect Handler

```typescript
import type { EffectHandler, TypedEffectHandler } from '@/core'

// Option 1: Using EffectHandler with explicit types
const toastShow: EffectHandler<[message: string, type: 'success' | 'error']> = async (c, message, type) => {
  await c.var.datastar.reply([
    ['patch-elements', <Toast message={message} type={type} />, { selector: '#toast-container', mode: 'append' }]
  ])
}

// Option 2: Using TypedEffectHandler for full type safety
type ToastShowEffect = ['toast:show', message: string, type: 'success' | 'error']
const toastShowTyped: TypedEffectHandler<ToastShowEffect> = async (c, message, type) => {
  // TypeScript enforces correct argument types
  await c.var.datastar.reply([
    ['patch-elements', <Toast message={message} type={type} />, { selector: '#toast-container', mode: 'append' }]
  ])
}
```

### 2. Register Your Effects

Register effects early in your middleware chain (before route handlers):

```typescript
// In src/index.ts
import { registerEffect, registerEffects } from '@/core'

// Register a single effect
app.use('*', registerEffect('toast:show', toastShow))

// Or register multiple effects at once
app.use('*', registerEffects({
  'toast:show': toastShow,
  'modal:close': modalClose,
  'analytics:track': analyticsTrack,
  'issue:created': issueCreated
}))
```

### 3. Use Your Effects

Now you can use your custom effects in any handler:

```typescript
export const POST = createHandler({
  async handler(c) {
    // Use your custom effects
    return c.var.datastar.reply([
      ['toast:show', 'Success!', 'success'],
      ['modal:close', 'my-modal'],
      ['analytics:track', 'user:action', { action: 'submit-form' }]
    ])
  }
})
```

## Effect Patterns

### Composing Built-in Effects

Most custom effects compose built-in effects:

```typescript
const modalClose: EffectHandler<[modalId: string]> = async (c, modalId) => {
  await c.var.datastar.reply([
    ['patch-elements', '', { selector: `#${modalId}`, mode: 'remove' }],
    ['patch-signals', { [`${modalId}.open`]: false }]
  ])
}
```

### Side-Effect Only Effects

Some effects don't update the UI at all:

```typescript
const analyticsTrack: EffectHandler<[event: string, properties?: Record<string, unknown>]> = async (c, event, properties = {}) => {
  await fetch('https://analytics.example.com/track', {
    method: 'POST',
    body: JSON.stringify({ event, properties, timestamp: Date.now() })
  })
}
```

### Domain-Specific Effects

Create effects that encapsulate complex domain logic:

```typescript
const issueCreated: EffectHandler<[issue: Issue]> = async (c, issue) => {
  // Broadcast update to all viewers
  await c.var.datastar.broadcast('issues:list', [
    ['patch-elements', <IssuesList issues={await fetchIssues(c)} />]
  ])
  
  // Show success toast to creator
  await c.var.datastar.reply([
    ['toast:show', `Issue "${issue.title}" created!`, 'success'],
    ['modal:close', 'create-issue-modal']
  ])
  
  // Track analytics
  await analyticsTrack(c, 'issue:created', { issueId: issue.id })
}
```

### Calling Other Custom Effects

Effects can call other custom effects:

```typescript
const issueDeleted: EffectHandler<[issueId: number]> = async (c, issueId) => {
  // Update UI
  await c.var.datastar.broadcast('issues:list', [
    ['patch-elements', <IssuesList issues={await fetchIssues(c)} />]
  ])
  
  // Use another custom effect
  await toastShow(c, 'Issue deleted', 'success')
  await analyticsTrack(c, 'issue:deleted', { issueId })
}
```

## Naming Conventions

Use namespaced names to organize your effects:

- `toast:show`, `toast:error`, `toast:success`
- `modal:open`, `modal:close`
- `analytics:track`, `analytics:identify`
- `issue:created`, `issue:updated`, `issue:deleted`
- `notification:send`, `notification:mark-read`

## Best Practices

### ✅ Do

1. **Create effects for repeated patterns** - If you're composing the same effects in multiple places, extract them.
2. **Use semantic names** - Name effects after domain actions, not implementation details.
3. **Compose, don't duplicate** - Custom effects should compose built-in or other custom effects.
4. **Keep effects focused** - Each effect should do one thing well.
5. **Document your effects** - Add JSDoc comments explaining what each effect does.

### ❌ Don't

1. **Don't create effects for one-off usage** - Just use built-in effects directly.
2. **Don't create wrapper effects** - If an effect just wraps a single built-in effect without adding value, skip it.
3. **Don't mutate shared state** - Effects should be pure except for their side-effects (DB updates, API calls, etc.).
4. **Don't over-abstract** - Start with built-in effects and extract custom effects when patterns emerge.

## Type Safety

For maximum type safety, use `TypedEffectHandler`:

```typescript
import type { TypedEffectHandler } from '@/core'

// Define your effect signature
type MyEffect = ['my:effect', arg1: string, arg2: number, arg3?: boolean]

// TypeScript enforces the signature
const myEffect: TypedEffectHandler<MyEffect> = async (c, arg1, arg2, arg3) => {
  // arg1 is string, arg2 is number, arg3 is boolean | undefined
}
```

## Advanced: Effect Registry API

You can access the effect registry directly via `c.var.datastar.effectRegistry`:

```typescript
// Check if effect exists
if (c.var.datastar.effectRegistry.has('toast:show')) {
  console.log('Toast effect is registered')
}

// Get all registered effects
const effects = c.var.datastar.effectRegistry.getEffectNames()
console.log('Available effects:', effects)

// Unregister an effect (rare)
c.var.datastar.effectRegistry.unregister('toast:show')

// Clone the registry (useful for testing)
const cloned = c.var.datastar.effectRegistry.clone()
```

## Examples

See `src/example-custom-effects.tsx` for a complete working example with:

- Toast notifications
- Modal management
- Analytics tracking
- Domain-specific issue lifecycle effects
- Notification system

## Inspiration

Honostar's extensible effect system is inspired by [datastar.wow](https://github.com/starfederation/datastar.wow), a Clojure library that uses the [nexus](https://github.com/cjohansen/nexus) effect system to make Datastar SSE responses declarative and composable.

## Further Reading

- See `AGENTS.md` section 10 for the canonical guide
- See `src/core/datastar/effect-registry.ts` for implementation details
- See `src/core/datastar/effect-registry.test.ts` for test examples
