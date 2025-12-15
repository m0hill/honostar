import type { EffectHandler } from '@/honostar/server'
import { topics } from '@/lib/topics'

export const commentCreatedSuccess: EffectHandler<[issueId: number, commentCount: number]> = async (
  c,
  issueId,
  commentCount
) => {
  c.var.fx.publish(topics.issue(issueId).comments(), 'comment:created', { issueId })

  await c.var.fx.reply([
    ['patch-signals', { commentError: '', comment: '' }],
    ['toast:show', `Comment posted! (${commentCount} total)`, 'success'],
  ])
}

export const commentEffects = {
  'comment:created-success': commentCreatedSuccess,
} as const
