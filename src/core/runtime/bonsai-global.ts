export function ensureBonsai(): NonNullable<Window['Bonsai']> {
  const w: Window & { Bonsai?: NonNullable<Window['Bonsai']> } = window
  if (!w.Bonsai) {
    w.Bonsai = {}
  }
  return w.Bonsai as NonNullable<Window['Bonsai']>
}

export function freeze<T extends object>(obj: T): T {
  return Object.freeze(obj)
}
