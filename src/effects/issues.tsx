import type { EffectHandler } from '@/honostar/server'
import { topics } from '@/lib/topics'
import type { Issue } from '@/types'

export const issueCreatedSuccess: EffectHandler<[issue: Issue]> = async (c, issue) => {
  c.var.fx.publish(topics.issues.list(), 'issue:created', { id: issue.id })

  await c.var.fx.reply([
    ['toast:show', `Issue "${issue.title}" created successfully!`, 'success'],
    [
      'patch-elements',
      '',
      {
        selector: '#ds-overlays [data-modal-id="create-issue"]',
        mode: 'remove',
      },
    ],
    [
      'patch-signals',
      {
        issue: {
          title: '',
          description: '',
          labels: [],
          newLabel: '',
          image: null,
        },
      },
    ],
  ])
}

export const issueEffects = {
  'issue:created-success': issueCreatedSuccess,
} as const
