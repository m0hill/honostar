export const DefaultSseRetryDurationMs = 1000

export const DefaultElementsUseViewTransitions = false

export const DefaultPatchSignalsOnlyIfMissing = false
export const DatastarDatalineSelector = 'selector'
export const DatastarDatalinePatchMode = 'mode'
export const DatastarDatalineElements = 'elements'
export const DatastarDatalineUseViewTransition = 'useViewTransition'
export const DatastarDatalineSignals = 'signals'
export const DatastarDatalineOnlyIfMissing = 'onlyIfMissing'
export const DatastarDatalinePaths = 'paths'

export const ElementPatchModes = [
  'outer',

  'inner',

  'replace',

  'prepend',

  'append',

  'before',

  'after',

  'remove',
] as const

export const DefaultElementPatchMode = 'outer'

export const EventTypes = [
  'datastar-patch-elements',

  'datastar-patch-signals',
] as const
