import { beforeEach, describe, expect, test } from 'bun:test'
import { createInitialState } from './state'
import type { InspectorConfig, InspectorState } from './types'
import { createOverlayHTML, createToggleButton, getPositionStyles } from './ui'

// Mock DOM APIs for testing
global.document = {
  getElementById: () => null,
} as any

global.DOMParser = class {
  parseFromString(html: string) {
    // Simple mock that can find elements by basic string matching
    return {
      querySelector: (selector: string) => {
        if (html.includes(selector.replace(/["\[\]]/g, ''))) {
          return { textContent: 'found' }
        }
        return null
      },
    }
  }
} as any

describe('Inspector UI', () => {
  let state: InspectorState

  beforeEach(() => {
    const config: InspectorConfig = {
      enabled: true,
      maxEvents: 100,
      defaultTab: 'signals',
      defaultViewMode: 'table',
      defaultPosition: 'bottom',
    }
    state = createInitialState(config)
  })

  describe('createOverlayHTML', () => {
    test('generates valid HTML structure', () => {
      const html = createOverlayHTML(state)

      // Check that it contains essential elements
      expect(html).toContain('inspector-resize-handle')
      expect(html).toContain('Honostar Devtools')
      expect(html).toContain('data-inspector-tab="signals"')
      expect(html).toContain('data-inspector-tab="patches"')
      expect(html).toContain('data-inspector-tab="sse"')
      expect(html).toContain('data-inspector-tab="persisted"')
    })

    test('uses inline styles instead of CSS classes', () => {
      const html = createOverlayHTML(state)

      // Should not contain Tailwind classes that depend on app CSS
      expect(html).not.toContain('class="flex')
      expect(html).not.toContain('class="bg-')
      expect(html).not.toContain('class="text-')
      expect(html).not.toContain('class="border-')

      // Should contain inline styles
      expect(html).toContain('style="')
      expect(html).toContain('background: #0a0a0a')
      expect(html).toContain('color: #fafafa')
    })

    test('includes self-contained dark theme styles', () => {
      const html = createOverlayHTML(state)

      // Should have dark background and light text
      expect(html).toContain('background: #0a0a0a')
      expect(html).toContain('color: #fafafa')

      // Should have consistent border colors
      expect(html).toContain('border: 1px solid #333')
      expect(html).toContain('border-bottom: 1px solid #333')
    })

    test('generates tab buttons with correct active state', () => {
      state.currentTab = 'signals'
      const html = createOverlayHTML(state)

      // Should mark signals tab as active
      expect(html).toContain('data-inspector-tab="signals"')
      expect(html).toContain('background: rgba(255, 255, 255, 0.15)')

      // Other tabs should be inactive
      expect(html).toContain('data-inspector-tab="patches"')
      expect(html).toContain('background: transparent')
    })

    test('generates position buttons with correct active state', () => {
      state.position = 'bottom'
      const html = createOverlayHTML(state)

      // Should mark bottom position as active
      expect(html).toContain('data-inspector-position="bottom"')
      expect(html).toContain('background: #3b82f6')

      // Other positions should be inactive
      expect(html).toContain('data-inspector-position="left"')
      expect(html).toContain('background: transparent')
    })

    test('includes view mode buttons when on signals or persisted tab', () => {
      state.currentTab = 'signals'
      let html = createOverlayHTML(state)
      expect(html).toContain('data-inspector-view="json"')
      expect(html).toContain('data-inspector-view="table"')

      state.currentTab = 'persisted'
      html = createOverlayHTML(state)
      expect(html).toContain('data-inspector-view="json"')
      expect(html).toContain('data-inspector-view="table"')

      state.currentTab = 'patches'
      html = createOverlayHTML(state)
      expect(html).not.toContain('data-inspector-view=')
    })
  })

  describe('createToggleButton', () => {
    test('generates toggle button with self-contained styles', () => {
      const html = createToggleButton()

      expect(html).toContain('inspector-toggle-btn')
      expect(html).toContain('background: #0a0a0a')
      expect(html).toContain('border: 1px solid #333')

      // Should not use CSS classes
      expect(html).not.toContain('class="')
    })

    test('includes hover effects via inline event handlers', () => {
      const html = createToggleButton()

      expect(html).toContain('onmouseover=')
      expect(html).toContain('onmouseout=')
      expect(html).toContain('this.style.background=')
    })
  })

  describe('getPositionStyles', () => {
    test('returns correct styles for bottom position', () => {
      state.position = 'bottom'
      state.height = 300

      const styles = getPositionStyles(state)

      expect(styles).toContain('bottom: 0')
      expect(styles).toContain('left: 0')
      expect(styles).toContain('right: 0')
      expect(styles).toContain('height: 300px')
      expect(styles).toContain('max-height: 80vh')
    })

    test('returns correct styles for right position', () => {
      state.position = 'right'
      state.width = 400

      const styles = getPositionStyles(state)

      expect(styles).toContain('top: 0')
      expect(styles).toContain('right: 0')
      expect(styles).toContain('bottom: 0')
      expect(styles).toContain('width: 400px')
      expect(styles).toContain('max-width: 80vw')
    })

    test('returns correct styles for top position', () => {
      state.position = 'top'
      state.height = 250

      const styles = getPositionStyles(state)

      expect(styles).toContain('top: 0')
      expect(styles).toContain('left: 0')
      expect(styles).toContain('right: 0')
      expect(styles).toContain('height: 250px')
      expect(styles).toContain('max-height: 80vh')
    })

    test('returns correct styles for left position', () => {
      state.position = 'left'
      state.width = 350

      const styles = getPositionStyles(state)

      expect(styles).toContain('top: 0')
      expect(styles).toContain('left: 0')
      expect(styles).toContain('bottom: 0')
      expect(styles).toContain('width: 350px')
      expect(styles).toContain('max-width: 80vw')
    })
  })

  describe('HTML structure validation', () => {
    test('generates valid HTML with expected elements', () => {
      const html = createOverlayHTML(state)

      // Should contain essential elements
      expect(html).toContain('data-inspector-tab="signals"')
      expect(html).toContain('id="inspector-resize-handle"')
      expect(html).toContain('Honostar Devtools')

      // Should be valid HTML structure
      expect(html.trim()).toMatch(/^<div.*<\/div>$/s)
    })

    test('toggle button generates valid HTML', () => {
      const html = createToggleButton()

      expect(html).toContain('id="inspector-toggle-btn"')
      expect(html).not.toContain('Datastar')

      // Should be valid HTML structure
      expect(html.trim()).toMatch(/^<div.*<\/div>$/s)
    })
  })
})
