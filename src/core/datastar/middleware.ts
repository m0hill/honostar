import type { StatusCode } from 'hono/utils/http-status'
import type { DatastarResponder } from '@/core/datastar/responder'
import { factory } from '@/core/middleware'

export type FxResponse = {
  fx: Parameters<DatastarResponder['fx']>[1]
  close?: boolean
  status?: StatusCode
  topics?: string[]
  toClient?: boolean
  headers?: Record<string, string>
}

function isFxResponse(value: unknown): value is FxResponse {
  if (typeof value !== 'object' || value === null || value instanceof Response) {
    return false
  }

  return 'fx' in value && Array.isArray((value as { fx: unknown }).fx)
}

export const fxResponder = factory.createMiddleware(async (c, next) => {
  await next()

  const fxResponse = c.var.fxResponse
  if (isFxResponse(fxResponse)) {
    c.res = await c.var.datastar.respond({
      effects: fxResponse.fx,
      ...(fxResponse.close !== undefined && { close: fxResponse.close }),
      ...(fxResponse.status !== undefined && { status: fxResponse.status }),
      ...(fxResponse.topics !== undefined && { topics: fxResponse.topics }),
      ...(fxResponse.toClient !== undefined && { toClient: fxResponse.toClient }),
      ...(fxResponse.headers !== undefined && { headers: fxResponse.headers }),
    })
  }
})
