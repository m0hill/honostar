import { defineCommand } from '@honostar/core/server'
import { z } from 'zod'
import { labels } from '@/db/schema'
import { topics } from '@/lib/topics'

const labelSchema = z.object({
  issue: z.object({
    newLabel: z.string().trim().min(1, 'Label name required'),
  }),
})

export const POST = defineCommand({
  schema: labelSchema,
  hook: (result, c) => {
    const error = result.error[0]?.message || 'Invalid input'
    return c.var.fx.reply([['toast:show', error, 'error']], { status: 400 })
  },

  async handler(c, data) {
    try {
      const newLabel = data.issue.newLabel

      const already = await c.var.db.query.labels.findFirst({
        where: (l, { eq }) => eq(l.name, newLabel),
      })

      if (!already) {
        await c.var.db.insert(labels).values({ name: newLabel, color: '#999999' })

        // CQRS: publish domain event for queries; show success toast to creator.
        c.var.fx.publish(topics.labels.list(), 'label:created', { name: newLabel })
        return c.var.fx.reply(
          [['toast:show', `Label "${newLabel}" created successfully!`, 'success']],
          {
            status: 201,
          }
        )
      } else {
        return c.var.fx.reply([['toast:show', 'Label already exists', 'error']], { status: 409 })
      }
    } catch (e: unknown) {
      console.error('Labels POST error:', e)
      return c.var.fx.reply([['toast:show', 'Failed to create label', 'error']], { status: 500 })
    }
  },
})
