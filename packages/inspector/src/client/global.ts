export function freeze<T extends object>(obj: T): T {
  return Object.freeze(obj)
}
