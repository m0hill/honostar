declare const process:
  | {
      env?: Record<string, string | undefined>
    }
  | undefined

export function envGet(name: string): string | undefined {
  if (typeof process === "undefined") return undefined
  return process.env?.[name]
}

export function envIsProduction(): boolean {
  return envGet("NODE_ENV") === "production"
}
