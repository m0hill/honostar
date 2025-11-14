/**
 * Bonsai Built-in Plugins
 *
 * This file imports all built-in plugins and registers them with the runtime.
 * Users can selectively import individual plugins or import this file to get all of them.
 *
 * @example
 * ```tsx
 * // In your app entry point or a custom runtime bootstrap
 * import '@/runtime/plugins' // Registers all built-in plugins
 *
 * // Or selectively import
 * import '@/runtime/plugins/clipboard'
 * import '@/runtime/plugins/focus'
 * ```
 */

import './clipboard'
import './focus'
import './scroll'
import './toast'
