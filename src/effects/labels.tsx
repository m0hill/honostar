import LabelsSection from '@/components/LabelsSection'
import { labels as labelsTable } from '@/db/schema'
import type { EffectHandler } from '@/honostar/server'
import { topics } from '@/lib/topics'

export const labelCreatedSuccess: EffectHandler<[labelName: string]> = async (c, labelName) => {
  const allLabels = await c.var.db.select().from(labelsTable)

  await c.var.fx.broadcast(topics.labels.list(), [
    ['patch-elements', <LabelsSection labels={allLabels} />],
  ])

  await c.var.fx.reply([['toast:show', `Label "${labelName}" created successfully!`, 'success']])
}

export const labelEffects = {
  'label:created-success': labelCreatedSuccess,
} as const
