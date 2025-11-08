/**
 * Client-side theme API for use in components.
 *
 * Bonsai exposes a namespaced theme actions API to avoid polluting the global scope.
 * All theme actions are available under `window.Bonsai.actions.theme`.
 *
 * @example
 * // In a Datastar attribute (recommended):
 * <button data-on:click="window.Bonsai.actions.theme.setLight()">Light Mode</button>
 * <button data-on:click="window.Bonsai.actions.theme.setDark()">Dark Mode</button>
 * <button data-on:click="window.Bonsai.actions.theme.setSystem()">System</button>
 * <button data-on:click="window.Bonsai.actions.theme.toggle()">Toggle</button>
 *
 * // Or use the expression constants:
 * import { themeExpressions } from '@/core/theme-client'
 * <button data-on:click={themeExpressions.setLight}>Light</button>
 *
 * // Advanced usage via the controller:
 * <button data-on:click="window.Bonsai.theme.setTheme('light')">Light</button>
 */

/**
 * Expression strings for setting theme preferences.
 * Use these when composing more complex Datastar expressions.
 *
 * These use the namespaced API to avoid polluting the global scope.
 */
export const themeExpressions = {
  /** Set theme to light mode */
  setLight: 'window.Bonsai.actions.theme.setLight()',
  /** Set theme to dark mode */
  setDark: 'window.Bonsai.actions.theme.setDark()',
  /** Set theme to follow system preference */
  setSystem: 'window.Bonsai.actions.theme.setSystem()',
  /** Toggle between light and dark */
  toggle: 'window.Bonsai.actions.theme.toggle()',
} as const
