import { z } from 'zod'
import IssueModal from '@/components/IssueModal'
import { labels } from '@/db/schema'
import { createHandler } from '@/honostar/server'
import { requireAuth } from '@/lib/auth-middleware'

// No data expected from client - empty schema
const emptySchema = z.object({}).optional()

export const GET = createHandler({
  schema: emptySchema,
  use: [requireAuth],
  async handler(c) {
    const allLabels = await c.var.db.select().from(labels)
    return c.var.fx.reply(
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
