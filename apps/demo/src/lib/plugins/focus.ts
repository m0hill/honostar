import { registerRuntimePlugin } from '@honostar/core/client'

/**
 * Focus Plugin
 *
 * Provides a @focus action for programmatically focusing elements.
 *
 * @example
 * ```tsx
 * // Focus by selector
 * <button data-on:click="@focus('#search-input')">
 *   Focus Search
 * </button>
 *
 * // Focus first input in form
 * <button data-on:click="@focus('form input:first-of-type')">
 *   Focus First Input
 * </button>
 * ```
 */

registerRuntimePlugin('focus', (ctx, selector: string) => {
  const target = document.querySelector(selector)

  if (!target) {
    return ctx.error(`Element not found: ${selector}`)
  }

  if (!(target instanceof HTMLElement)) {
    return ctx.error(`Element is not focusable: ${selector}`)
  }

  try {
    target.focus()
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error('Failed to focus element'))
  }
})
