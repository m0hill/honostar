import IssueModal from '@/components/IssueModal'
import { createHandler } from '@/core/page'
import { labels } from '@/db/schema'
import { requireAuth } from '@/lib/auth-middleware'

export const GET = createHandler({
  use: [requireAuth],
  async handler(c) {
    const allLabels = await c.var.db.select().from(labels)
    return c.var.datastar.reply(
      [
        [
          'patch-elements',
          <IssueModal labels={allLabels} />,
          { selector: '#ds-overlays', mode: 'append' },
        ],
      ],
      { status: 200 }
    )
  },
})
