import type { StandardSchemaV1 } from "@standard-schema/spec"

export type SchemaOptions<TOutput> = {
  vendor?: string
  message?: string
  validate: (value: unknown) => value is TOutput
}

/**
 * Create a minimal Standard Schema implementation with a type guard.
 *
 * Intended for small apps/examples that don't want to pull in a full schema library.
 */
export function schema<TOutput>(opts: SchemaOptions<TOutput>): StandardSchemaV1<unknown, TOutput> {
  return {
    "~standard": {
      version: 1,
      vendor: opts.vendor ?? "honostar",
      async validate(value: unknown) {
        if (opts.validate(value)) return { value }
        return {
          issues: [
            {
              message: opts.message ?? "Invalid payload",
            },
          ],
        }
      },
    },
  }
}
