export function ensureHonostar(): NonNullable<Window['Honostar']> {
  const w: Window & { Honostar?: NonNullable<Window['Honostar']> } = window
  if (!w.Honostar) {
    w.Honostar = {}
  }
  return w.Honostar as NonNullable<Window['Honostar']>
}

export function freeze<T extends object>(obj: T): T {
  return Object.freeze(obj)
}
