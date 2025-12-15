import { commentEffects } from '@/effects/comments'
import { issueEffects } from '@/effects/issues'
import { labelEffects } from '@/effects/labels'
import { toastEffects } from '@/effects/toast'

export const customEffects = {
  ...toastEffects,
  ...issueEffects,
  ...commentEffects,
  ...labelEffects,
} as const
