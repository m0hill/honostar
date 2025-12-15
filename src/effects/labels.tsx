import type { EffectHandler } from '@/honostar/server'
import { topics } from '@/lib/topics'

export const labelCreatedSuccess: EffectHandler<[labelName: string]> = async (c, labelName) => {
  c.var.fx.publish(topics.labels.list(), 'label:created', { name: labelName })

  await c.var.fx.reply([['toast:show', `Label "${labelName}" created successfully!`, 'success']])
}

export const labelEffects = {
  'label:created-success': labelCreatedSuccess,
} as const
