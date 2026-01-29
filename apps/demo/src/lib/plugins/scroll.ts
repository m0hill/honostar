import { registerRuntimePlugin } from "@honostar/core/client"

/**
 * Scroll Plugin
 *
 * Provides a @scroll action for scrolling elements into view.
 *
 * @example
 * ```tsx
 * // Scroll to element
 * <button data-on:click="@scroll('#comments')">
 *   Jump to Comments
 * </button>
 *
 * // Scroll with smooth behavior
 * <button data-on:click="@scroll('#top', 'smooth')">
 *   Back to Top
 * </button>
 *
 * // Scroll with options
 * <button data-on:click="@scroll('#bottom', 'auto', 'end')">
 *   Scroll to Bottom
 * </button>
 * ```
 */

type ScrollBehavior = "auto" | "smooth"
type ScrollBlock = "start" | "center" | "end" | "nearest"

registerRuntimePlugin(
  "scroll",
  (ctx, selector: string, behavior: ScrollBehavior = "smooth", block: ScrollBlock = "start") => {
    const target = document.querySelector(selector)

    if (!target) {
      return ctx.error(`Element not found: ${selector}`)
    }

    try {
      target.scrollIntoView({
        behavior,
        block,
        inline: "nearest",
      })
    } catch (err) {
      ctx.error(err instanceof Error ? err : new Error("Failed to scroll to element"))
    }
  }
)
