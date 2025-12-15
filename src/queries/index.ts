import type { QueryRegistration } from '@/honostar/server'
import { topics } from '@/lib/topics'
import { issueCommentsQuery } from '@/queries/comments'
import { issuesListQuery } from '@/queries/issues'
import { labelsListQuery } from '@/queries/labels'

export const customQueries: QueryRegistration[] = [
  [topics.issues.list(), issuesListQuery],
  [topics.labels.list(), labelsListQuery],
  [/^issue:(?<id>\d+):comments$/, issueCommentsQuery],
]
