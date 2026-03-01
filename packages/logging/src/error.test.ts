import { describe, expect, test } from "bun:test"
import { createError, parseError } from "./error"

describe("@honostar/logging error helpers", () => {
  test("createError builds structured error with status and metadata", () => {
    const err = createError({
      message: "Payment failed",
      status: 402,
      why: "Card declined",
      fix: "Try another card",
      link: "https://docs.example.com/payments",
    })

    expect(err.message).toBe("Payment failed")
    expect(err.status).toBe(402)
    expect(err.statusCode).toBe(402)
    expect(err.data?.why).toBe("Card declined")
    expect(err.data?.fix).toBe("Try another card")
    expect(err.data?.link).toBe("https://docs.example.com/payments")
  })

  test("parseError extracts structured metadata", () => {
    const parsed = parseError({
      message: "Payment failed",
      statusCode: 402,
      data: {
        why: "Card declined",
        fix: "Try another card",
      },
    })

    expect(parsed.message).toBe("Payment failed")
    expect(parsed.status).toBe(402)
    expect(parsed.why).toBe("Card declined")
    expect(parsed.fix).toBe("Try another card")
  })

  test("parseError falls back for unknown values", () => {
    const parsed = parseError("boom")
    expect(parsed.message).toBe("boom")
    expect(parsed.status).toBe(500)
  })
})
