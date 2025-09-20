// oxlint-disable no-useless-fallback-in-spread
import {
  DatastarDatalineElements,
  DatastarDatalinePatchMode,
  DatastarDatalineSelector,
  DatastarDatalineSignals,
  DefaultSseRetryDurationMs,
  ElementPatchModes,
} from '@/core/datastar/consts'
import {
  DatastarEventOptions,
  DefaultMapping,
  type ElementPatchMode,
  type EventType,
  type Jsonifiable,
  type PatchElementsOptions,
  type PatchSignalsOptions,
} from '@/core/datastar/types'

function isRecord(obj: unknown): obj is Record<string, Jsonifiable> {
  return typeof obj === 'object' && obj !== null
}

export class SseFormatter {
  protected validateElementPatchMode(mode: string): asserts mode is ElementPatchMode {
    if (!(ElementPatchModes as readonly string[]).includes(mode)) {
      throw new Error(
        `Invalid ElementPatchMode: "${mode}". Valid modes are: ${ElementPatchModes.join(', ')}`
      )
    }
  }

  protected validateRequired(
    value: string | undefined,
    paramName: string
  ): asserts value is string {
    if (!value || value.trim() === '') {
      throw new Error(`${paramName} is required and cannot be empty`)
    }
  }

  protected format(event: EventType, dataLines: string[], options: DatastarEventOptions): string[] {
    const { eventId, retryDuration } = options || {}

    const typeLine = [`event: ${event}\n`]
    const idLine = eventId ? [`id: ${eventId}\n`] : []
    const retryLine =
      !retryDuration || retryDuration === 1000
        ? []
        : [`retry: ${retryDuration ?? DefaultSseRetryDurationMs}\n`]

    return typeLine.concat(
      idLine,
      retryLine,
      dataLines.map(data => {
        return `data: ${data}\n`
      }),
      ['\n']
    )
  }

  protected eachNewlineIsADataLine(prefix: string, data: string) {
    return data.split('\n').map(line => {
      return `${prefix} ${line}`
    })
  }

  protected eachOptionIsADataLine(options: Record<string, Jsonifiable>): string[] {
    return Object.keys(options)
      .filter(key => {
        return !this.hasDefaultValue(key, options[key])
      })
      .flatMap(key => {
        const value = options[key]
        const stringValue =
          typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
        return this.eachNewlineIsADataLine(key, stringValue)
      })
  }

  protected hasDefaultValue(key: string, val: unknown): boolean {
    if (key in DefaultMapping) {
      return val === (DefaultMapping as Record<string, unknown>)[key]
    }

    return false
  }

  public patchElements(elements: string, options?: PatchElementsOptions): string {
    const { eventId, retryDuration, ...renderOptions } =
      options || ({} as Partial<PatchElementsOptions>)

    const patchMode = renderOptions[DatastarDatalinePatchMode] ?? ''
    if (patchMode) {
      this.validateElementPatchMode(patchMode)
    }

    const selector = renderOptions[DatastarDatalineSelector] ?? ''
    const isRemoveWithSelector = patchMode === 'remove' && selector

    if (!isRemoveWithSelector) {
      this.validateRequired(elements, 'elements')
    }

    if (!selector && patchMode === 'remove') {
      if (!elements || elements.trim() === '') {
        throw new Error('For remove mode without selector, elements parameter with IDs is required')
      }
    }

    const dataLines = this.eachOptionIsADataLine(renderOptions)
    if (!isRemoveWithSelector || (elements && elements.trim() !== '')) {
      dataLines.push(...this.eachNewlineIsADataLine(DatastarDatalineElements, elements))
    }

    const sendOptions: DatastarEventOptions = {}
    if (eventId) {
      sendOptions.eventId = eventId
    }
    if (retryDuration) {
      sendOptions.retryDuration = retryDuration
    }
    return this.format('datastar-patch-elements', dataLines, sendOptions).join('')
  }

  public patchSignals(signals: string, options?: PatchSignalsOptions): string {
    this.validateRequired(signals, 'signals')

    const { eventId, retryDuration, ...eventOptions } =
      options || ({} as Partial<PatchSignalsOptions>)

    const dataLines = this.eachOptionIsADataLine(eventOptions).concat(
      this.eachNewlineIsADataLine(DatastarDatalineSignals, signals)
    )

    const sendOptions: DatastarEventOptions = {}
    if (eventId) {
      sendOptions.eventId = eventId
    }
    if (retryDuration) {
      sendOptions.retryDuration = retryDuration
    }
    return this.format('datastar-patch-signals', dataLines, sendOptions).join('')
  }

  public executeScript(
    script: string,
    options?: {
      autoRemove?: boolean
      attributes?: string[] | Record<string, string>
      eventId?: string
      retryDuration?: number
    }
  ): string {
    const { autoRemove = true, attributes = {}, eventId, retryDuration } = options || {}

    let attrString = ''

    if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
      attrString = Object.entries(attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('')
    } else if (Array.isArray(attributes)) {
      attrString = attributes.length > 0 ? ' ' + attributes.join(' ') : ''
    }

    if (autoRemove) {
      attrString += ' data-effect="el.remove()"'
    }

    const scriptTag = `<script${attrString}>${script}</script>`

    const dataLines = [
      ...this.eachNewlineIsADataLine('mode', 'append'),
      ...this.eachNewlineIsADataLine('selector', 'body'),
      ...this.eachNewlineIsADataLine('elements', scriptTag),
    ]

    const sendOptions: DatastarEventOptions = {}
    if (eventId) {
      sendOptions.eventId = eventId
    }
    if (retryDuration) {
      sendOptions.retryDuration = retryDuration
    }
    return this.format('datastar-patch-elements', dataLines, sendOptions).join('')
  }

  public removeElements(
    selector?: string,
    elements?: string,
    options?: {
      eventId?: string
      retryDuration?: number
    }
  ): string {
    if (!selector && (!elements || elements.trim() === '')) {
      throw new Error('Either selector or elements (with IDs) must be provided to remove elements.')
    }
    const patchOptions: PatchElementsOptions = {
      mode: 'remove',
    }
    if (selector) {
      patchOptions.selector = selector
    }
    if (options?.eventId) {
      patchOptions.eventId = options.eventId
    }
    if (options?.retryDuration) {
      patchOptions.retryDuration = options.retryDuration
    }
    return this.patchElements(elements ?? '', patchOptions)
  }

  public removeSignals(
    signalKeys: string | string[],
    options?: {
      onlyIfMissing?: boolean
      eventId?: string
      retryDuration?: number
    }
  ): string {
    const keys = Array.isArray(signalKeys) ? signalKeys : [signalKeys]
    const patch: Record<string, null> = {}
    for (const key of keys) {
      patch[key] = null
    }
    return this.patchSignals(JSON.stringify(patch), options)
  }

  // Move the static utility method here
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
