import type { InferSelectModel } from 'drizzle-orm'
import type { issues, users } from '@/db/schema'

export type User = InferSelectModel<typeof users>
export type Issue = InferSelectModel<typeof issues>

export type IssueWithAuthor = Issue & {
  author: User
}
