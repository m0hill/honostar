type Primitive = string | number | boolean | null | undefined

type SignalPath<T> = T extends Primitive ? string : { [K in keyof T]: SignalPath<T[K]> } & string

export function createSignalStore<T extends object>(prefix = '$'): SignalPath<T> {
  const pathOf = (parts: string[]): any =>
    new Proxy(() => {}, {
      get(_, prop: string) {
        if (prop === 'toString' || prop === 'valueOf') {
          return () => prefix + parts.join('.')
        }
        return pathOf([...parts, prop])
      },
      apply() {
        return prefix + parts.join('.')
      },
    })

  return pathOf([]) as SignalPath<T>
}

export const actions = {
  get: (route: string) => `@get('${route}')`,
  post: (route: string) => `@post('${route}')`,
  put: (route: string) => `@put('${route}')`,
  patch: (route: string) => `@patch('${route}')`,
  delete: (route: string) => `@delete('${route}')`,
}

export const AppEvent = {
  Reordered: 'reordered',
  ShowNotification: 'showNotification',
} as const

class ModifierBuilder {
  private parts: string[] = []
  constructor(private base: string) {}
  debounce(ms: number, leading = false) {
    this.parts.push(`debounce.${ms}ms${leading ? '.leading' : ''}`)
    return this
  }
  throttle(ms: number) {
    this.parts.push(`throttle.${ms}ms`)
    return this
  }
  once() {
    this.parts.push('once')
    return this
  }
  window() {
    this.parts.push('window')
    return this
  }
  toString() {
    return `${this.base}__${this.parts.join('__')}`
  }
}

export function on(eventName: string) {
  return new ModifierBuilder(`data-on-${eventName}`)
}