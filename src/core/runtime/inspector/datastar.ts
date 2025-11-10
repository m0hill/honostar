/**
 * Datastar integration for the inspector
 */

import type { InspectorEvent } from './types'

/**
 * Setup event listener for signal patches
 */
export function setupSignalPatchListener(
  onSignalPatch: (event: InspectorEvent) => void,
  onRenderNeeded: () => void
): () => void {
  const listener = (evt: Event) => {
    const detail = evt instanceof CustomEvent ? evt.detail || {} : {}

    const event: InspectorEvent = {
      timestamp: Date.now(),
      type: 'signal-patch',
      data: detail,
      source: 'backend',
    }

    onSignalPatch(event)
    onRenderNeeded()
  }

  document.addEventListener('datastar-signal-patch', listener)
  return () => document.removeEventListener('datastar-signal-patch', listener)
}

/**
 * Setup event listener for fetch/SSE events
 */
export function setupFetchListener(onSSEEvent: (event: InspectorEvent) => void): () => void {
  const listener = (evt: Event) => {
    const detail = evt instanceof CustomEvent ? evt.detail : undefined
    if (detail && typeof detail === 'object') {
      const event: InspectorEvent = {
        timestamp: Date.now(),
        type: 'sse',
        data: detail,
        source: 'backend',
      }
      onSSEEvent(event)
    }
  }

  document.addEventListener('datastar-fetch', listener)
  return () => document.removeEventListener('datastar-fetch', listener)
}

/**
 * Setup mutation observer to watch for signal changes
 */
export function setupSignalObserver(onSignalChange: () => void): () => void {
  const signalsEl = document.getElementById('ds-inspector-signals')
  if (!signalsEl) {
    console.warn('[Inspector] #ds-inspector-signals element not found')
    return () => {}
  }

  const observer = new MutationObserver(() => {
    onSignalChange()
  })

  observer.observe(signalsEl, {
    childList: true,
    characterData: true,
    subtree: true,
  })

  return () => observer.disconnect()
}
