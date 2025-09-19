export type PatchMode =
  | 'outer'
  | 'inner'
  | 'remove'
  | 'replace'
  | 'prepend'
  | 'append'
  | 'before'
  | 'after'

export function elementsData(opts: {
  html: string
  selector?: string
  mode?: PatchMode
  useViewTransition?: boolean
}): string {
  const lines = [`elements ${opts.html}`]
  if (opts.selector) lines.push(`selector ${opts.selector}`)
  if (opts.mode) lines.push(`mode ${opts.mode}`)
  if (opts.useViewTransition) lines.push('useViewTransition true')
  return lines.join('\n')
}

export function signalsData(signals: unknown, opts?: { onlyIfMissing?: boolean }): string {
  const lines = [`signals ${JSON.stringify(signals)}`]
  if (opts?.onlyIfMissing != null) {
    lines.push(`onlyIfMissing ${opts.onlyIfMissing ? 'true' : 'false'}`)
  }
  return lines.join('\n')
}
