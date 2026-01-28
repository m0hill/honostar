let counter = 0

export function getCounter(): number {
  return counter
}

export function incrementCounter(): number {
  counter += 1
  return counter
}
