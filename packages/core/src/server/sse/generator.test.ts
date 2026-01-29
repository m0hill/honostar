import { describe, expect, test } from "bun:test"
import { SseFormatter } from "./generator"

describe("SseFormatter", () => {
  test("formats patch-elements event", () => {
    const formatter = new SseFormatter()
    const html = "<div>Hello World</div>"

    const result = formatter.patchElements(html, {})

    expect(result).toContain("event: datastar-patch-elements")
    expect(result).toContain("data:")
    expect(result).toContain(html)
  })

  test("formats patch-elements with selector", () => {
    const formatter = new SseFormatter()
    const html = '<div id="target">Content</div>'
    const options = { selector: "#target" }

    const result = formatter.patchElements(html, options)

    expect(result).toContain("event: datastar-patch-elements")
    expect(result).toContain(html)
    expect(result).toContain("selector")
  })

  test("formats patch-elements with mode", () => {
    const formatter = new SseFormatter()
    const html = "<li>Item</li>"
    const options = { mode: "append" as const, selector: "#list" }

    const result = formatter.patchElements(html, options)

    expect(result).toContain("event: datastar-patch-elements")
    expect(result).toContain("append")
  })

  test("formats patch-signals event", () => {
    const formatter = new SseFormatter()
    const signals = JSON.stringify({ count: 42, message: "hello" })

    const result = formatter.patchSignals(signals, {})

    expect(result).toContain("event: datastar-patch-signals")
    expect(result).toContain("data:")
    expect(result).toContain("count")
    expect(result).toContain("42")
    expect(result).toContain("message")
    expect(result).toContain("hello")
  })

  test("formats execute-script event", () => {
    const formatter = new SseFormatter()
    const script = 'console.log("test")'

    const result = formatter.executeScript(script)

    expect(result).toContain("event: datastar-patch-elements")
    expect(result).toContain("data:")
    expect(result).toContain(script)
  })

  test("formats execute-script with autoRemove option", () => {
    const formatter = new SseFormatter()
    const script = 'console.log("test")'
    const options = { autoRemove: true }

    const result = formatter.executeScript(script, options)

    expect(result).toContain("event: datastar-patch-elements")
    expect(result).toContain("data-effect")
  })

  test("formats remove-elements event", () => {
    const formatter = new SseFormatter()
    const selector = "#target"

    const result = formatter.removeElements(selector)

    expect(result).toContain("event: datastar-patch-elements")
    expect(result).toContain("remove")
    expect(result).toContain(selector)
  })

  test("formats remove-signals event", () => {
    const formatter = new SseFormatter()
    const keys = ["key1", "key2"]

    const result = formatter.removeSignals(keys)

    expect(result).toContain("event: datastar-patch-signals")
    expect(result).toContain("key1")
    expect(result).toContain("key2")
  })

  test("properly escapes newlines in data", () => {
    const formatter = new SseFormatter()
    const html = "<div>\nMulti\nLine\n</div>"

    const result = formatter.patchElements(html, {})

    // SSE format requires newlines to be prefixed with 'data: '
    const lines = result.split("\n")
    const dataLines = lines.filter((line) => line.startsWith("data: "))

    expect(dataLines.length).toBeGreaterThan(0)
  })

  test("rejects empty HTML without remove mode", () => {
    const formatter = new SseFormatter()

    expect(() => formatter.patchElements("", {})).toThrow(/elements is required/)
  })

  test("handles complex nested signals", () => {
    const formatter = new SseFormatter()
    const signals = JSON.stringify({
      user: {
        name: "Alice",
        preferences: {
          theme: "dark",
          language: "en",
        },
      },
      count: 123,
    })

    const result = formatter.patchSignals(signals, {})

    expect(result).toContain("event: datastar-patch-signals")
    expect(result).toContain("Alice")
    expect(result).toContain("dark")
    expect(result).toContain("123")
  })

  test("handles special characters in HTML", () => {
    const formatter = new SseFormatter()
    const html = '<div data-value="test & <special>">Content</div>'

    const result = formatter.patchElements(html, {})

    expect(result).toContain("event: datastar-patch-elements")
    expect(result).toContain(html)
  })

  test("validates element patch mode", () => {
    const formatter = new SseFormatter()

    expect(() => formatter.patchElements("<div></div>", { mode: "invalid" as any })).toThrow(
      /Invalid ElementPatchMode/
    )
  })

  test("requires elements parameter for patch", () => {
    const formatter = new SseFormatter()

    expect(() => formatter.patchElements("", {})).toThrow(/elements is required/)
  })

  test("requires signals parameter", () => {
    const formatter = new SseFormatter()

    expect(() => formatter.patchSignals("", {})).toThrow(/signals is required/)
  })

  test("remove mode with selector allows empty elements", () => {
    const formatter = new SseFormatter()

    const result = formatter.removeElements("#target")

    expect(result).toContain("event: datastar-patch-elements")
    expect(result).toContain("remove")
    expect(result).toContain("#target")
  })
})
