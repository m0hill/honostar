import LabelsSection from '@/components/LabelsSection'
import type { AppHandler } from '@/core'
import { labels } from '@/db/schema'

export const POST: AppHandler = async c => {
  try {
    const body = await c.req.json()
    const newLabel: string = body?.issue?.newLabel?.trim() ?? ''

    if (!newLabel) {
      return c.var.datastar.respond({
        effects: [['patch-signals', { error: 'Label name required' }]],
        status: 400,
      })
    }

    const already = await c.var.db.query.labels.findFirst({
      where: (l, { eq }) => eq(l.name, newLabel),
    })

    if (!already) {
      c.var.db.insert(labels).values({ name: newLabel, color: '#999999' }).run()
    }

    const currentLabels = await c.var.db.select().from(labels)

    return c.var.datastar.respond({
      effects: [
        [
          'patch-elements',
          <LabelsSection labels={currentLabels} />,
          { selector: '#labels-section', mode: 'inner' },
        ],
      ],
      toClient: true,
      status: 201,
    })
  } catch (e: unknown) {
    console.error('Labels POST error:', e)
    return c.var.datastar.respond({
      effects: [['patch-signals', { error: 'Failed to create label' }]],
      status: 500,
    })
  }
}
