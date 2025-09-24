import LabelsSection from '@/components/LabelsSection'
import { createHandler } from '@/core/page'
import { labels } from '@/db/schema'

export const POST = createHandler({
  async handler(c) {
    try {
      const body = await c.req.json()
      const newLabel: string = body?.issue?.newLabel?.trim() ?? ''

      if (!newLabel) {
        return c.var.datastar.reply([['patch-signals', { error: 'Label name required' }]], {
          status: 400,
        })
      }

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
            { selector: '#labels-section', mode: 'inner' },
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
