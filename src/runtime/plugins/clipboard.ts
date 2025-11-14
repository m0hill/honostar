import { registerRuntimePlugin } from '@/core/runtime/plugins'

/**
 * Clipboard Plugin
 *
 * Provides a @clipboard action for copying text to the clipboard.
 *
 * @example
 * ```tsx
 * <button data-on:click="@clipboard('Hello, world!')">
 *   Copy to Clipboard
 * </button>
 *
 * // With feedback
 * <button
 *   data-on:click="@clipboard('Hello, world!'); $copied = true"
 *   data-signals={JSON.stringify({ copied: false })}
 * >
 *   {$copied ? 'Copied!' : 'Copy'}
 * </button>
 * ```
 */

registerRuntimePlugin('clipboard', async (ctx, text: string) => {
  if (!navigator.clipboard) {
    return ctx.error('Clipboard API not supported in this browser')
  }

  try {
    await navigator.clipboard.writeText(text)
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error('Failed to copy to clipboard'))
  }
})
