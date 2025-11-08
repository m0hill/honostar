import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { SseFormatter } from './generator'

describe('SseFormatter', () => {
  test('formats patch-elements event', () => {
    const formatter = new SseFormatter()
    const html = '<div>Hello World</div>'

    const result = formatter.patchElements(html, {})

    assert.ok(result.includes('event: datastar-patch-elements'))
    assert.ok(result.includes('data:'))
    assert.ok(result.includes(html))
  })

  test('formats patch-elements with selector', () => {
    const formatter = new SseFormatter()
    const html = '<div id="target">Content</div>'
    const options = { selector: '#target' }

    const result = formatter.patchElements(html, options)

    assert.ok(result.includes('event: datastar-patch-elements'))
    assert.ok(result.includes(html))
    assert.ok(result.includes('selector'))
  })

  test('formats patch-elements with mode', () => {
    const formatter = new SseFormatter()
    const html = '<li>Item</li>'
    const options = { mode: 'append' as const, selector: '#list' }

    const result = formatter.patchElements(html, options)

    assert.ok(result.includes('event: datastar-patch-elements'))
    assert.ok(result.includes('append'))
  })

  test('formats patch-signals event', () => {
    const formatter = new SseFormatter()
    const signals = JSON.stringify({ count: 42, message: 'hello' })

    const result = formatter.patchSignals(signals, {})

    assert.ok(result.includes('event: datastar-patch-signals'))
    assert.ok(result.includes('data:'))
    assert.ok(result.includes('count'))
    assert.ok(result.includes('42'))
    assert.ok(result.includes('message'))
    assert.ok(result.includes('hello'))
  })

  test('formats execute-script event', () => {
    const formatter = new SseFormatter()
    const script = 'console.log("test")'

    const result = formatter.executeScript(script)

    assert.ok(result.includes('event: datastar-patch-elements'))
    assert.ok(result.includes('data:'))
    assert.ok(result.includes(script))
  })

  test('formats execute-script with autoRemove option', () => {
    const formatter = new SseFormatter()
    const script = 'console.log("test")'
    const options = { autoRemove: true }

    const result = formatter.executeScript(script, options)

    assert.ok(result.includes('event: datastar-patch-elements'))
    assert.ok(result.includes('data-effect'))
  })

  test('formats remove-elements event', () => {
    const formatter = new SseFormatter()
    const selector = '#target'

    const result = formatter.removeElements(selector)

    assert.ok(result.includes('event: datastar-patch-elements'))
    assert.ok(result.includes('remove'))
    assert.ok(result.includes(selector))
  })

  test('formats remove-signals event', () => {
    const formatter = new SseFormatter()
    const keys = ['key1', 'key2']

    const result = formatter.removeSignals(keys)

    assert.ok(result.includes('event: datastar-patch-signals'))
    assert.ok(result.includes('key1'))
    assert.ok(result.includes('key2'))
  })

  test('properly escapes newlines in data', () => {
    const formatter = new SseFormatter()
    const html = '<div>\nMulti\nLine\n</div>'

    const result = formatter.patchElements(html, {})

    // SSE format requires newlines to be prefixed with 'data: '
    const lines = result.split('\n')
    const dataLines = lines.filter(line => line.startsWith('data: '))

    assert.ok(dataLines.length > 0, 'Should have multiple data lines for multi-line content')
  })

  test('rejects empty HTML without remove mode', () => {
    const formatter = new SseFormatter()

    assert.throws(() => formatter.patchElements('', {}), /elements is required/)
  })

  test('handles complex nested signals', () => {
    const formatter = new SseFormatter()
    const signals = JSON.stringify({
      user: {
        name: 'Alice',
        preferences: {
          theme: 'dark',
          language: 'en',
        },
      },
      count: 123,
    })

    const result = formatter.patchSignals(signals, {})

    assert.ok(result.includes('event: datastar-patch-signals'))
    assert.ok(result.includes('Alice'))
    assert.ok(result.includes('dark'))
    assert.ok(result.includes('123'))
  })

  test('handles special characters in HTML', () => {
    const formatter = new SseFormatter()
    const html = '<div data-value="test & <special>">Content</div>'

    const result = formatter.patchElements(html, {})

    assert.ok(result.includes('event: datastar-patch-elements'))
    assert.ok(result.includes(html))
  })

  test('validates element patch mode', () => {
    const formatter = new SseFormatter()

    assert.throws(
      () => formatter.patchElements('<div></div>', { mode: 'invalid' as any }),
      /Invalid ElementPatchMode/
    )
  })

  test('requires elements parameter for patch', () => {
    const formatter = new SseFormatter()

    assert.throws(() => formatter.patchElements('', {}), /elements is required/)
  })

  test('requires signals parameter', () => {
    const formatter = new SseFormatter()

    assert.throws(() => formatter.patchSignals('', {}), /signals is required/)
  })

  test('remove mode with selector allows empty elements', () => {
    const formatter = new SseFormatter()

    const result = formatter.removeElements('#target')

    assert.ok(result.includes('event: datastar-patch-elements'))
    assert.ok(result.includes('remove'))
    assert.ok(result.includes('#target'))
  })
})
