// oxlint-disable no-useless-fallback-in-spread
import { ServerSentEventGenerator as AbstractSSEGenerator } from '@/core/datastar/abstract'
import {
  type DatastarEventOptions,
  type EventType,
  type Jsonifiable,
  type StreamOptions,
  sseHeaders,
} from '@/core/datastar/types'

function isRecord(obj: unknown): obj is Record<string, Jsonifiable> {
  return typeof obj === 'object' && obj !== null
}

export class ServerSentEventGenerator extends AbstractSSEGenerator {
  protected controller: ReadableStreamDefaultController

  protected constructor(controller: ReadableStreamDefaultController) {
    super()
    this.controller = controller
  }

  public close(): void {
    try {
      this.controller?.close()
    } catch {
      // ignore
    }
  }

  static stream(
    onStart: (stream: ServerSentEventGenerator) => Promise<void> | void,
    options?: StreamOptions
  ): Response {
    const readableStream = new ReadableStream({
      async start(controller) {
        const generator = new ServerSentEventGenerator(controller)

        try {
          const stream = onStart(generator)
          if (stream instanceof Promise) await stream
          if (!options?.keepalive) {
            controller.close()
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'onStart callback threw an error'
          const abortResult = options?.onAbort ? options.onAbort(errorMsg) : null

          if (abortResult instanceof Promise) await abortResult
          if (options && options.onError) {
            const onError = options.onError(error)
            if (onError instanceof Promise) await onError
            controller.close()
          } else {
            controller.close()
            throw error
          }
        }
      },
      async cancel(reason) {
        const abortResult = options && options.onAbort ? options.onAbort(reason) : null
        if (abortResult instanceof Promise) await abortResult
      },
    })

    return new Response(readableStream, {
      ...(options?.responseInit || {}),
      headers: {
        ...sseHeaders,
        ...(options?.responseInit?.headers || {}),
      },
    })
  }

  public sendComment(comment: string): void {
    const line = `:${comment}\n\n`
    this.controller?.enqueue(new TextEncoder().encode(line))
  }

  protected override send(
    event: EventType,
    dataLines: string[],
    options: DatastarEventOptions
  ): string[] {
    const eventLines = super.send(event, dataLines, options)

    const eventText = eventLines.join('')
    this.controller?.enqueue(new TextEncoder().encode(eventText))

    return eventLines
  }

  static async readSignals(
    request: Request
  ): Promise<
    { success: true; signals: Record<string, Jsonifiable> } | { success: false; error: string }
  > {
    try {
      if (request.method === 'GET') {
        const url = new URL(request.url)
        const params = url.searchParams
        if (params.has('datastar')) {
          const signals = JSON.parse(params.get('datastar')!)

          if (isRecord(signals)) {
            return { success: true, signals }
          } else throw new Error('Datastar param is not a record')
        } else throw new Error('No datastar object in request')
      }

      const signals = await request.json()

      if (isRecord(signals)) {
        return { success: true, signals: signals }
      }

      throw new Error('Parsed JSON body is not of type record')
    } catch (e: unknown) {
      if (isRecord(e) && 'message' in e && typeof e.message === 'string') {
        return { success: false, error: e.message }
      }

      return { success: false, error: 'unknown error when parsing request' }
    }
  }
}
