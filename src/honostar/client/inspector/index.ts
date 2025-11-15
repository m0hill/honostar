/**
 * Main orchestrator for the Datastar Inspector
 */

import { freeze } from '@/honostar/client/runtime/global'
import { setupFetchListener, setupSignalObserver, setupSignalPatchListener } from './datastar'
import {
  attachEventListeners,
  attachToggleButtonListeners,
  setupGlobalMouseHandlers,
  setupKeyboardShortcut,
} from './handlers'
import { createInitialState, getDatastarSignals, saveState } from './state'
import type {
  InspectorApi,
  InspectorConfig,
  InspectorEvent,
  InspectorPosition,
  InspectorStorageType,
  InspectorTab,
  InspectorViewMode,
} from './types'
import { createOverlayHTML, createToggleButton, getPositionStyles } from './ui'

/**
 * Creates the Datastar Inspector
 *
 * Monitors:
 * - Current signals via Datastar's signal store
 * - Signal patch events (frontend and backend)
 * - SSE events from the server
 * - Persisted signals in localStorage/sessionStorage
 */
export function createInspector(config: InspectorConfig): InspectorApi {
  const state = createInitialState(config)

  let overlayElement: HTMLDivElement | null = null
  let toggleButton: HTMLDivElement | null = null
  const listeners = new Map<string, () => void>()
  let startResize: ((e: MouseEvent) => void) | null = null

  // Event management
  const addEvent = (event: InspectorEvent): void => {
    state.events.unshift(event)
    if (state.events.length > config.maxEvents) {
      state.events = state.events.slice(0, config.maxEvents)
    }
    if (state.isOpen) {
      renderOverlay()
    }
  }

  const computeOverlayStyle = () => `
    position: fixed;
    ${getPositionStyles(state)}
    z-index: 999999;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  `

  const applyOverlayStyles = () => {
    if (overlayElement) {
      overlayElement.style.cssText = computeOverlayStyle()
    }
  }

  // UI rendering
  const renderOverlay = (): void => {
    if (!overlayElement) return
    overlayElement.innerHTML = createOverlayHTML(state)
    applyOverlayStyles()
    attachEventListeners(overlayElement, state, {
      onClose: close,
      onClearEvents: () => {
        state.events = []
        renderOverlay()
      },
      onTabChange: (tab: InspectorTab) => {
        state.currentTab = tab
        saveState(state)
        renderOverlay()
      },
      onViewModeChange: (mode: InspectorViewMode) => {
        state.viewMode = mode
        saveState(state)
        renderOverlay()
      },
      onPositionChange: (pos: InspectorPosition) => {
        state.position = pos
        saveState(state)
        renderOverlay()
      },
      onFilterChange: (filter: { include?: RegExp; exclude?: RegExp }) => {
        state.filter = filter
        renderOverlay()
      },
      onStorageTypeChange: (type: InspectorStorageType) => {
        state.storageType = type
        renderOverlay()
      },
      onStorageClear: () => {
        const storage = state.storageType === 'localStorage' ? localStorage : sessionStorage
        storage.removeItem('datastar')
        renderOverlay()
      },
      onResizeStart: startResize || (() => {}),
    })
  }

  const renderToggleButton = (): void => {
    if (!toggleButton) return
    toggleButton.innerHTML = createToggleButton()
    attachToggleButtonListeners(toggleButton, toggle)
  }

  // Inspector controls
  const open = (): void => {
    if (state.isOpen) return
    state.isOpen = true
    saveState(state)

    overlayElement = document.createElement('div')
    overlayElement.setAttribute('data-inspector-overlay', '')
    applyOverlayStyles()
    overlayElement.innerHTML = createOverlayHTML(state)
    document.body.appendChild(overlayElement)
    attachEventListeners(overlayElement, state, {
      onClose: close,
      onClearEvents: () => {
        state.events = []
        renderOverlay()
      },
      onTabChange: (tab: InspectorTab) => {
        state.currentTab = tab
        saveState(state)
        renderOverlay()
      },
      onViewModeChange: (mode: InspectorViewMode) => {
        state.viewMode = mode
        saveState(state)
        renderOverlay()
      },
      onPositionChange: (pos: InspectorPosition) => {
        state.position = pos
        saveState(state)
        renderOverlay()
      },
      onFilterChange: (filter: { include?: RegExp; exclude?: RegExp }) => {
        state.filter = filter
        renderOverlay()
      },
      onStorageTypeChange: (type: InspectorStorageType) => {
        state.storageType = type
        renderOverlay()
      },
      onStorageClear: () => {
        const storage = state.storageType === 'localStorage' ? localStorage : sessionStorage
        storage.removeItem('datastar')
        renderOverlay()
      },
      onResizeStart: startResize || (() => {}),
    })
  }

  const close = (): void => {
    if (!state.isOpen) return
    state.isOpen = false
    saveState(state)

    if (overlayElement) {
      overlayElement.remove()
      overlayElement = null
    }
  }

  const toggle = (): void => {
    if (state.isOpen) {
      close()
    } else {
      open()
    }
  }

  // Setup Datastar integration
  const setupDatastarIntegration = (): void => {
    // Signal patch listener
    listeners.set(
      'signal-patch',
      setupSignalPatchListener(addEvent, () => {
        if (state.isOpen && state.currentTab === 'signals') {
          renderOverlay()
        }
      })
    )

    // Fetch/SSE listener
    listeners.set('fetch', setupFetchListener(addEvent))

    // Signal observer
    listeners.set(
      'signal-observer',
      setupSignalObserver(() => {
        if (state.isOpen && state.currentTab === 'signals') {
          renderOverlay()
        }
      })
    )
  }

  // Setup keyboard shortcut
  listeners.set('keyboard', setupKeyboardShortcut(config.keyboardShortcut, toggle))

  // Setup global mouse handlers for resize
  const { startResize: startResizeHandler, cleanup: cleanupMouseHandlers } =
    setupGlobalMouseHandlers(
      state,
      () => overlayElement,
      applyOverlayStyles,
      () => {
        saveState(state)
      }
    )
  startResize = startResizeHandler
  listeners.set('mouse-handlers', cleanupMouseHandlers)

  // Initialize
  if (config.enabled) {
    const initialize = () => {
      // Create toggle button
      toggleButton = document.createElement('div')
      toggleButton.setAttribute('data-inspector-toggle', '')
      document.body.appendChild(toggleButton)
      renderToggleButton()

      setupDatastarIntegration()

      // Auto-open if was previously open
      if (state.isOpen) {
        open()
      }

      console.log('[Inspector] Initialized - Press Ctrl+Shift+D to toggle')
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize)
    } else {
      initialize()
    }
  }

  const api: InspectorApi = freeze({
    isOpen: () => state.isOpen,
    open,
    close,
    toggle,
    setTab: (tab: InspectorTab) => {
      state.currentTab = tab
      saveState(state)
      if (state.isOpen) renderOverlay()
    },
    setViewMode: (mode: InspectorViewMode) => {
      state.viewMode = mode
      saveState(state)
      if (state.isOpen) renderOverlay()
    },
    setFilter: (filter: { include?: RegExp; exclude?: RegExp }) => {
      state.filter = filter
      if (state.isOpen) renderOverlay()
    },
    clearEvents: () => {
      state.events = []
      if (state.isOpen) renderOverlay()
    },
    getSignals: () => getDatastarSignals(),
    getEvents: () => [...state.events],
    destroy: () => {
      close()
      if (toggleButton) {
        toggleButton.remove()
        toggleButton = null
      }
      listeners.forEach(cleanup => cleanup())
      listeners.clear()
    },
  })

  return api
}
