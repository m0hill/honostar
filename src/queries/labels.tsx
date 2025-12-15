import LabelsSection from '@/components/LabelsSection'
import { labels as labelsTable } from '@/db/schema'
import type { QueryHandler } from '@/honostar/server'

export const labelsListQuery: QueryHandler = async ({ c }) => {
  const allLabels = await c.var.db.select().from(labelsTable)
  return [['patch-elements', <LabelsSection labels={allLabels} />]]
}
