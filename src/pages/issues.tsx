import { z } from 'zod'
import { createHandler } from '@/core'
import { issues, issuesToLabels, labels as labelsTable } from '@/db/schema'
import { requireAuth } from '@/lib/auth-middleware'
import { saveBase64Image } from '@/lib/images'

/**
 * Define the schema for the incoming JSON payload from Datastar.
 * This matches the `issue` signal defined in `IssueModal.tsx`.
 */
const issueSchema = z.object({
  issue: z.object({
    title: z.string().trim().min(1, 'Title is required'),
    description: z.string().optional(),
    labels: z.array(z.string()).default([]),
    newLabel: z.string().trim().optional(),
    image: z.any().optional(), // `saveBase64Image` handles null or the file object
  }),
})

export const POST = createHandler({
  schema: issueSchema,
  use: [requireAuth],
  hook: (result, c) => {
    const error = result.error[0]?.message || 'Invalid input'
    return c.var.datastar.reply([['patch-signals', { createIssueModal: { error } }]], {
      status: 400,
    })
  },

  async handler(c, data) {
    // Data is now 100% type-safe! No type assertions needed.
    const { issue } = data
    const user = c.var.user!

    const labelIds: number[] = issue.labels.map((v: string) => Number(v)).filter(Boolean)

    const newLabel = issue.newLabel?.trim()

    if (newLabel) {
      const exists = await c.var.db.query.labels.findFirst({
        where: (l, { eq }) => eq(l.name, newLabel),
      })
      if (!exists) {
        const [inserted] = await c.var.db
          .insert(labelsTable)
          .values({ name: newLabel, color: '#999999' })
          .returning()
        if (inserted) labelIds.push(inserted.id)
      } else {
        labelIds.push(exists.id)
      }
    }

    let imageUrl: string | null = null
    if (issue.image) {
      try {
        imageUrl = await saveBase64Image(issue.image)
      } catch (error) {
        console.error('Failed to save image:', error)
      }
    }

    const [created] = await c.var.db
      .insert(issues)
      .values({
        title: issue.title, // Guaranteed to be a non-empty string
        description: issue.description,
        authorId: user.id,
        imageUrl,
      })
      .returning()

    if (created && labelIds.length) {
      await c.var.db
        .insert(issuesToLabels)
        .values(labelIds.map(labelId => ({ issueId: created.id, labelId })))
    }

    // Use custom effect instead of manual composition!
    // This single effect handles:
    // - Broadcasting updated list to all viewers
    // - Showing success toast to creator
    // - Closing modal and resetting form
    return c.var.datastar.reply([['issue:created-success', created]], { status: 201 })
  },
})
