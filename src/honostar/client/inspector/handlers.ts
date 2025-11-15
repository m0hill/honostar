/**
 * Event handlers for the inspector
 */

import { saveState } from './state'
import type {
  InspectorPosition,
  InspectorState,
  InspectorStorageType,
  InspectorTab,
  InspectorViewMode,
} from './types'

// Type guard functions
const isValidTab: (t: string | null) => t is InspectorTab = (t): t is InspectorTab =>
  t !== null && ['signals', 'patches', 'sse', 'persisted'].includes(t)

const isValidViewMode: (m: string | null) => m is InspectorViewMode = (m): m is InspectorViewMode =>
  m !== null && ['json', 'table'].includes(m)

const isValidPosition: (p: string | null) => p is InspectorPosition = (p): p is InspectorPosition =>
  p !== null && ['top', 'bottom', 'left', 'right'].includes(p)

/**
 * Attach event listeners to the overlay element
 */
export function attachEventListeners(
  overlayElement: HTMLDivElement,
  state: InspectorState,
  callbacks: {
    onClose: () => void
    onClearEvents: () => void
    onTabChange: (tab: InspectorTab) => void
    onViewModeChange: (mode: InspectorViewMode) => void
    onPositionChange: (pos: InspectorPosition) => void
    onFilterChange: (filter: { include?: RegExp; exclude?: RegExp }) => void
    onStorageTypeChange: (type: InspectorStorageType) => void
    onStorageClear: () => void
    onResizeStart: (e: MouseEvent) => void
  }
): void {
  // Close button
  const closeBtn = overlayElement.querySelector('#inspector-close')
  closeBtn?.addEventListener('click', callbacks.onClose)

  // Clear events button
  const clearBtn = overlayElement.querySelector('#inspector-clear')
  clearBtn?.addEventListener('click', callbacks.onClearEvents)

  // Tab buttons
  overlayElement.querySelectorAll('[data-inspector-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-inspector-tab')
      if (isValidTab(tab)) {
        callbacks.onTabChange(tab)
      }
    })
  })

  // View mode buttons
  overlayElement.querySelectorAll('[data-inspector-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-inspector-view')
      if (isValidViewMode(mode)) {
        callbacks.onViewModeChange(mode)
      }
    })
  })

  // Position buttons
  overlayElement.querySelectorAll('[data-inspector-position]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pos = btn.getAttribute('data-inspector-position')
      if (isValidPosition(pos)) {
        callbacks.onPositionChange(pos)
      }
    })
  })

  // Filter inputs
  const includeInput = overlayElement.querySelector('#inspector-filter-include')
  const excludeInput = overlayElement.querySelector('#inspector-filter-exclude')

  includeInput?.addEventListener('input', e => {
    try {
      const target = e.target
      if (target instanceof HTMLInputElement) {
        const val = target.value.trim()
        const filter = { ...state.filter }
        if (val) {
          filter.include = new RegExp(val)
        } else {
          delete filter.include
        }
        callbacks.onFilterChange(filter)
      }
    } catch {
      // Ignore invalid regex
    }
  })

  excludeInput?.addEventListener('input', e => {
    try {
      const target = e.target
      if (target instanceof HTMLInputElement) {
        const val = target.value.trim()
        const filter = { ...state.filter }
        if (val) {
          filter.exclude = new RegExp(val)
        } else {
          delete filter.exclude
        }
        callbacks.onFilterChange(filter)
      }
    } catch {
      // Ignore invalid regex
    }
  })

  // Storage type buttons
  const localBtn = overlayElement.querySelector('#inspector-storage-local')
  const sessionBtn = overlayElement.querySelector('#inspector-storage-session')
  const clearStorageBtn = overlayElement.querySelector('#inspector-storage-clear')

  localBtn?.addEventListener('click', () => {
    callbacks.onStorageTypeChange('localStorage')
  })

  sessionBtn?.addEventListener('click', () => {
    callbacks.onStorageTypeChange('sessionStorage')
  })

  clearStorageBtn?.addEventListener('click', callbacks.onStorageClear)

  // Resize handle
  const resizeHandle = overlayElement.querySelector('#inspector-resize-handle')
  resizeHandle?.addEventListener('mousedown', (e: Event) => {
    if (e instanceof MouseEvent) {
      callbacks.onResizeStart(e)
    }
  })
}

/**
 * Attach event listeners to the toggle button
 */
export function attachToggleButtonListeners(
  toggleButton: HTMLDivElement,
  onToggle: () => void
): void {
  const btn = toggleButton.querySelector('#inspector-toggle-btn')
  btn?.addEventListener('click', onToggle)

  // Hover effect
  btn?.addEventListener('mouseenter', () => {
    if (btn instanceof HTMLElement) {
      btn.style.transform = 'scale(1.05)'
    }
  })
  btn?.addEventListener('mouseleave', () => {
    if (btn instanceof HTMLElement) {
      btn.style.transform = 'scale(1)'
    }
  })
}

/**
 * Setup global mouse handlers for resize functionality
 */
export function setupGlobalMouseHandlers(
  state: InspectorState,
  getOverlayElement: () => HTMLDivElement | null,
  applyOverlayStyles: () => void,
  onResizeEnd: () => void
): { startResize: (e: MouseEvent) => void; cleanup: () => void } {
  let isResizing = false
  let dragStartX = 0
  let dragStartY = 0
  let resizeStartHeight = 0
  let resizeStartWidth = 0

  const mouseMoveHandler = (e: MouseEvent) => {
    if (!isResizing) return

    const overlayElement = getOverlayElement()
    if (!overlayElement) return

    const isHorizontal = state.position === 'bottom' || state.position === 'top'

    if (isHorizontal) {
      const delta = state.position === 'bottom' ? dragStartY - e.clientY : e.clientY - dragStartY
      state.height = Math.max(200, Math.min(window.innerHeight * 0.8, resizeStartHeight + delta))
    } else {
      const delta = state.position === 'right' ? dragStartX - e.clientX : e.clientX - dragStartX
      state.width = Math.max(300, Math.min(window.innerWidth * 0.8, resizeStartWidth + delta))
    }

    applyOverlayStyles()
  }

  const mouseUpHandler = () => {
    if (isResizing) {
      isResizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      saveState(state)
      onResizeEnd()
    }
  }

  const startResize = (e: MouseEvent) => {
    e.preventDefault()
    isResizing = true
    const isHorizontal = state.position === 'bottom' || state.position === 'top'
    resizeStartHeight = state.height
    resizeStartWidth = state.width
    dragStartX = e.clientX
    dragStartY = e.clientY
    document.body.style.cursor = isHorizontal ? 'ns-resize' : 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  document.addEventListener('mousemove', mouseMoveHandler)
  document.addEventListener('mouseup', mouseUpHandler)

  const cleanup = () => {
    document.removeEventListener('mousemove', mouseMoveHandler)
    document.removeEventListener('mouseup', mouseUpHandler)
  }

  return { startResize, cleanup }
}
