# Honostar Plugin System

The Honostar plugin system provides a clean, type-safe API for registering custom Datastar actions that extend the client runtime without requiring server roundtrips.

## Overview

Plugins are purely client-side Datastar actions that can be invoked from templates using the `@pluginName(args)` syntax. They're perfect for common UI operations that don't need server interaction.

## Built-in Plugins

Honostar ships with several useful plugins out of the box:

### `@clipboard(text)`
Copy text to the clipboard using the Clipboard API.

```tsx
<button data-on:click="@clipboard('Hello, world!')">
  Copy to Clipboard
</button>

// With feedback
<button 
  data-on:click="@clipboard($issueUrl); $copied = true"
  data-signals={JSON.stringify({ copied: false, issueUrl: 'https://...' })}
>
  {$copied ? 'Copied!' : 'Copy Link'}
</button>
```

###`@focus(selector)`
Focus an element by CSS selector.

```tsx
<button data-on:click="@focus('#search-input')">
  Focus Search
</button>

// Focus first input in a form
<button data-on:click="@focus('form input:first-of-type')">
  Start Form
</button>
```

### `@scroll(selector, behavior?, block?)`
Scroll an element into view with optional smooth scrolling.

```tsx
// Basic scroll
<button data-on:click="@scroll('#comments')">
  Jump to Comments
</button>

// Smooth scroll
<button data-on:click="@scroll('#top', 'smooth')">
  Back to Top
</button>

// Scroll with alignment
<button data-on:click="@scroll('#bottom', 'smooth', 'end')">
  Scroll to Bottom
</button>
```

**Parameters:**
- `selector` - CSS selector for target element
- `behavior` - `'auto'` | `'smooth'` (default: `'smooth'`)
- `block` - `'start'` | `'center'` | `'end'` | `'nearest'` (default: `'start'`)

### `@beacon(url, data?)`
Send analytics/telemetry data using the Navigator sendBeacon API. Ideal for tracking without blocking the UI or delaying page unload.

```tsx
// Track button click
<button data-on:click="@beacon('/api/analytics', { event: 'button_click', label: 'signup' })">
  Sign Up
</button>

// Track page exit
<body data-on:beforeunload__window="@beacon('/api/analytics', { event: 'page_exit', duration: $sessionDuration })">
```

### `@toast(message, type?, options?)`
Show temporary notification messages. Requires a `#toast-container` element in your layout.

```tsx
// In your layout
<div id="toast-container" class="fixed bottom-4 right-4 z-50 space-y-2"></div>

// Show toasts
<button data-on:click="@toast('Settings saved!', 'success')">
  Save Settings
</button>

<button data-on:click="@toast('Invalid email', 'error')">
  Submit
</button>
```

**Parameters:**
- `message` - Toast message text
- `type` - `'info'` | `'success'` | `'warning'` | `'error'` (default: `'info'`)
- `options` - `{ duration?: number, dismissible?: boolean }`

**Types:**
- `info` - Blue background, informational
- `success` - Green background, success messages
- `warning` - Yellow background, warnings
- `error` - Red background, error messages

## Usage

### Import All Built-in Plugins

```typescript
// In your app entry point or custom runtime bootstrap
import '@/runtime/plugins'
```

### Import Selective Plugins

```typescript
// Only import what you need
import '@/runtime/plugins/clipboard'
import '@/runtime/plugins/focus'
```

## Creating Custom Plugins

All plugin modules run in the browser bundle, which means they might execute
before the runtime finishes installing the plugin system. Use the
`registerRuntimePlugin()` helper to automatically queue your plugin until
`window.Honostar.plugins` is ready:

```typescript
import { registerRuntimePlugin } from '@/core/runtime/plugins'
```

### Basic Plugin

```typescript
// src/runtime/plugins/my-plugin.ts
import { registerRuntimePlugin } from '@/core/runtime/plugins'

registerRuntimePlugin('myPlugin', (ctx, arg1: string, arg2: number) => {
  // Your plugin logic here
  console.log(arg1, arg2)
})
```

### Plugin with Error Handling

```typescript
registerRuntimePlugin('validateEmail', (ctx, email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    return ctx.error('Invalid email format')
  }
  
  // Valid email - proceed with logic
})
```

### Async Plugin

```typescript
registerRuntimePlugin('fetchUser', async (ctx, userId: string) => {
  try {
    const response = await fetch(`/api/users/${userId}`)
    const user = await response.json()
    
    // Update signals or DOM as needed
    console.log('Fetched user:', user)
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error('Failed to fetch user'))
  }
})
```

### Plugin with DOM Manipulation

```typescript
registerRuntimePlugin('highlight', (ctx, selector: string, color: string) => {
  const elements = document.querySelectorAll(selector)
  
  if (elements.length === 0) {
    return ctx.error(`No elements found matching: ${selector}`)
  }
  
  elements.forEach(el => {
    if (el instanceof HTMLElement) {
      el.style.backgroundColor = color
    }
  })
})
```

## Plugin Context API

Every plugin handler receives a `ctx` object as its first parameter:

```typescript
interface DatastarActionContext {
  el: HTMLElement  // The element that triggered the action
  error: (message: string | Error) => void  // Report an error
}
```

### `ctx.el`

The DOM element that triggered the action (has `data-on:*` attribute).

```typescript
registerRuntimePlugin('disable', (ctx) => {
  ctx.el.setAttribute('disabled', 'true')
})
```

### `ctx.error(message)`

Report an error to the Datastar error handling system.

```typescript
registerRuntimePlugin('example', (ctx, value: string) => {
  if (!value) {
    return ctx.error('Value is required')
  }
  
  try {
    // ... plugin logic
  } catch (err) {
    ctx.error(err instanceof Error ? err.message : 'Unknown error')
  }
})
```

## Programmatic API

Access the plugin registry via `window.Honostar.plugins`:

### `register(name, handler)`

Register a new plugin or override an existing one.

```typescript
window.Honostar.plugins.register('myAction', (ctx, ...args) => {
  // Plugin logic
})
```

### `registerAll(plugins)`

Register multiple plugins at once.

```typescript
window.Honostar.plugins.registerAll({
  action1: (ctx) => { /* ... */ },
  action2: (ctx, arg) => { /* ... */ },
  action3: (ctx, a, b) => { /* ... */ },
})
```

### `has(name)`

Check if a plugin is registered.

```typescript
if (window.Honostar.plugins.has('clipboard')) {
  // Clipboard plugin is available
}
```

### `getNames()`

Get all registered plugin names.

```typescript
const plugins = window.Honostar.plugins.getNames()
console.log('Available plugins:', plugins)
```

### `unregister(name)`

Unregister a plugin (rare, mainly for testing).

```typescript
window.Honostar.plugins.unregister('myPlugin')
```

## Best Practices

### 1. **Type Safety**

Use TypeScript to define strict types for your plugin arguments:

```typescript
type ToastType = 'info' | 'success' | 'warning' | 'error'

window.Honostar.plugins.register(
  'toast',
  (ctx, message: string, type: ToastType = 'info') => {
    // TypeScript ensures type is always valid
  }
)
```

### 2. **Error Handling**

Always validate inputs and use `ctx.error()` for error reporting:

```typescript
window.Honostar.plugins.register('divide', (ctx, a: number, b: number) => {
  if (b === 0) {
    return ctx.error('Cannot divide by zero')
  }
  
  return a / b
})
```

### 3. **DOM Safety**

Check element existence and types before manipulating:

```typescript
window.Honostar.plugins.register('setText', (ctx, selector: string, text: string) => {
  const el = document.querySelector(selector)
  
  if (!el) {
    return ctx.error(`Element not found: ${selector}`)
  }
  
  if (!(el instanceof HTMLElement)) {
    return ctx.error(`Element is not an HTMLElement: ${selector}`)
  }
  
  el.textContent = text
})
```

### 4. **Async Operations**

Use async/await for asynchronous work and handle errors properly:

```typescript
window.Honostar.plugins.register('loadData', async (ctx, url: string) => {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      return ctx.error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    // Process data...
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error('Network error'))
  }
})
```

### 5. **Naming Conventions**

Use clear, descriptive names with namespacing for related plugins:

```typescript
// Good
window.Honostar.plugins.register('analytics:track', ...)
window.Honostar.plugins.register('analytics:page', ...)
window.Honostar.plugins.register('ui:toast', ...)
window.Honostar.plugins.register('ui:modal', ...)

// Avoid generic names
window.Honostar.plugins.register('do', ...)  // ❌ Too generic
window.Honostar.plugins.register('action', ...)  // ❌ Too generic
```

### 6. **Documentation**

Document your plugins with JSDoc comments:

```typescript
/**
 * Copy text to the clipboard
 * @param text - The text to copy
 * @example
 * ```tsx
 * <button data-on:click="@clipboard('Hello')">Copy</button>
 * ```
 */
window.Honostar.plugins.register('clipboard', async (ctx, text: string) => {
  // ...
})
```

## Advanced Patterns

### Plugin Composition

Build complex plugins by composing simpler ones:

```typescript
// Base notification plugin
window.Honostar.plugins.register('notify', (ctx, message: string, type: string) => {
  // ... notification logic
})

// Specialized success notification
window.Honostar.plugins.register('notifySuccess', (ctx, message: string) => {
  window.Honostar.plugins.register('notify', (ctx, message, 'success'))
})
```

### State Management

Plugins can interact with Datastar signals:

```tsx
// In your template
<div data-signals={JSON.stringify({ count: 0 })}>
  <button data-on:click="@increment()">Count: {$count}</button>
</div>

// Plugin that modifies signals
window.Honostar.plugins.register('increment', (ctx) => {
  // Access signals via Datastar's signal system
  // Note: Direct signal access requires Datastar's signal API
})
```

### Integration with External Libraries

Wrap third-party libraries as plugins:

```typescript
// Wrap a charting library
import Chart from 'chart.js/auto'

window.Honostar.plugins.register(
  'chart',
  (ctx, data: unknown, options: unknown) => {
    if (!(ctx.el instanceof HTMLCanvasElement)) {
      return ctx.error('Chart action must be used on a <canvas> element')
    }
    
    new Chart(ctx.el, {
      type: 'line',
      data,
      options,
    })
  }
)
```

## Debugging

Enable plugin debugging by checking registration status:

```typescript
// Check if plugin system is available
if (window.Honostar?.plugins) {
  console.log('Plugin system ready')
  console.log('Registered plugins:', window.Honostar.plugins.getNames())
} else {
  console.error('Plugin system not initialized')
}

// Verify specific plugin
if (window.Honostar.plugins.has('myPlugin')) {
  console.log('myPlugin is registered')
} else {
  console.warn('myPlugin not found')
}
```

## FAQ

**Q: When should I use a plugin vs. a server-side effect?**

A: Use plugins for:
- Pure client-side operations (clipboard, focus, scroll)
- UI feedback that doesn't require server state
- Integrations with browser APIs
- Wrapper actions for third-party libraries

Use server-side effects for:
- Data mutations
- Business logic
- State that must be persisted
- Operations requiring authorization

**Q: Can plugins modify Datastar signals?**

A: Plugins run in the context of Datastar expressions and can interact with signals through Datastar's signal system. However, for most cases, it's cleaner to return values or trigger Datastar events rather than directly manipulating signals.

**Q: Are plugins loaded automatically?**

A: No. You must explicitly import plugins in your application code. Built-in plugins can be imported via `import '@/runtime/plugins'`.

**Q: Can I override built-in plugins?**

A: Yes. Calling `register()` with an existing plugin name will override it, though a warning will be logged to the console.

**Q: Do plugins work with SSR?**

A: Plugins are client-only and registered in the browser runtime. They're automatically skipped during server-side rendering.

## See Also

- [Datastar Documentation](https://data-star.dev)
- [Custom Effects](../../../CUSTOM_EFFECTS.md)
- [Honostar Runtime](../../core/runtime/)
