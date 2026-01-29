import { relations } from "drizzle-orm"
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$onUpdateFn(() => new Date()),
}

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
})

export const issues = sqliteTable("issues", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["open", "closed"] })
    .notNull()
    .default("open"),
  imageUrl: text("image_url"),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  ...timestamps,
})

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey(),
  body: text("body").notNull(),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  issueId: integer("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  ...timestamps,
})

export const labels = sqliteTable("labels", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
})

export const issuesToLabels = sqliteTable(
  "issues_to_labels",
  {
    issueId: integer("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.issueId, t.labelId] }),
  })
)

export const usersRelations = relations(users, ({ many }) => ({
  issues: many(issues),
  comments: many(comments),
}))

export const issuesRelations = relations(issues, ({ one, many }) => ({
  author: one(users, {
    fields: [issues.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  issuesToLabels: many(issuesToLabels),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  issue: one(issues, {
    fields: [comments.issueId],
    references: [issues.id],
  }),
}))

export const labelsRelations = relations(labels, ({ many }) => ({
  issuesToLabels: many(issuesToLabels),
}))

export const issuesToLabelsRelations = relations(issuesToLabels, ({ one }) => ({
  issue: one(issues, {
    fields: [issuesToLabels.issueId],
    references: [issues.id],
  }),
  label: one(labels, {
    fields: [issuesToLabels.labelId],
    references: [labels.id],
  }),
}))
