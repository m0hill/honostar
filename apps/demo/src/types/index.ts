import type { InferSelectModel } from "drizzle-orm"
import type { comments, issues, labels, users } from "@/db/schema"

export type User = InferSelectModel<typeof users>
export type Issue = InferSelectModel<typeof issues>
export type Label = InferSelectModel<typeof labels>
export type Comment = InferSelectModel<typeof comments>

export type IssueWithAuthor = Issue & {
  author: User
}

export type CommentWithAuthor = Comment & {
  author: User
}

export type IssueWithDetails = Issue & {
  author: User
  labels: Label[]
  comments: CommentWithAuthor[]
}
