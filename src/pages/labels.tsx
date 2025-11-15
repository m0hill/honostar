import { z } from 'zod'
import LabelsSection from '@/components/LabelsSection'
import { labels } from '@/db/schema'
import { createHandler } from '@/honostar/server'

const labelSchema = z.object({
  issue: z.object({
    newLabel: z.string().trim().min(1, 'Label name required'),
  }),
})

export const POST = createHandler({
  schema: labelSchema,
  hook: (result, c) => {
    const error = result.error[0]?.message || 'Invalid input'
    return c.var.datastar.reply([['patch-signals', { error }]], { status: 400 })
  },

  async handler(c, data) {
    try {
      const newLabel = data.issue.newLabel

      const already = await c.var.db.query.labels.findFirst({
        where: (l, { eq }) => eq(l.name, newLabel),
      })

      if (!already) {
        await c.var.db.insert(labels).values({ name: newLabel, color: '#999999' })
      }

      const currentLabels = await c.var.db.select().from(labels)

      return c.var.datastar.broadcast(
        'labels:list',
        [
          [
            'patch-elements',
            <LabelsSection labels={currentLabels} />,
            { selector: '#labels-section' },
          ],
        ],
        { status: 201 }
      )
    } catch (e: unknown) {
      console.error('Labels POST error:', e)
      return c.var.datastar.reply([['patch-signals', { error: 'Failed to create label' }]], {
        status: 500,
      })
    }
  },
})
