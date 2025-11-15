/**
 * Custom Effects for Honostar Issue Tracker
 *
 * Domain-specific effects that make handlers cleaner and more maintainable.
 */

import type { SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { CommentsSection } from '@/components/CommentsSection'
import IssuesList from '@/components/IssuesList'
import type { comments as commentsTable, issues as issuesTable } from '@/db/schema'
import type { EffectHandler } from '@/honostar/server'
import type { Issue } from '@/types'

// Drizzle ORM query builder types for proper type safety
type IssuesTable = typeof issuesTable
type CommentsTable = typeof commentsTable
type OrderByColumn = SQLiteColumn | SQL
type OrderByFn = (column: OrderByColumn) => SQL

// ============================================================================
// Toast Notifications Component
// ============================================================================

type ToastType = 'success' | 'error' | 'info'

function Toast({ message, type }: { message: string; type: ToastType }) {
  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[type]

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }[type]

  const timestamp = new Date().getTime()
  return (
    <div
      id={`toast-${timestamp}`}
      class={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 mb-2 animate-slide-in`}
      data-init="setTimeout(() => this.remove(), 4000)"
    >
      <span class="text-lg font-bold">{icon}</span>
      <span>{message}</span>
    </div>
  )
}

// ============================================================================
// Toast Effects
// ============================================================================

export const toastShow: EffectHandler<[message: string, type: ToastType]> = async (
  c,
  message,
  type
) => {
  await c.var.datastar.reply([
    [
      'patch-elements',
      <Toast message={message} type={type} />,
      { selector: '#toast-container', mode: 'append' },
    ],
  ])
}

export const toastSuccess: EffectHandler<[message: string]> = async (c, message) => {
  await c.var.datastar.reply([['toast:show', message, 'success']])
}

export const toastError: EffectHandler<[message: string]> = async (c, message) => {
  await c.var.datastar.reply([['toast:show', message, 'error']])
}

// ============================================================================
// Issue Effects - Domain-specific abstractions
// ============================================================================

export const issueCreatedSuccess: EffectHandler<[issue: Issue]> = async (c, issue) => {
  // Fetch fresh issues list
  const allIssues = await c.var.db.query.issues.findMany({
    with: { author: true },
    orderBy: (issues: IssuesTable['_']['columns'], { desc }: { desc: OrderByFn }) => [
      desc(issues.createdAt),
    ],
  })

  // Broadcast updated list to all viewers on the issues:list topic
  await c.var.datastar.fx('issues:list', [
    ['patch-elements', <IssuesList issues={allIssues} />, { selector: '#issues-list' }],
  ])

  // Reply to the creator with success feedback
  await c.var.datastar.reply([
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

export const commentCreatedSuccess: EffectHandler<[issueId: number, commentCount: number]> = async (
  c,
  issueId,
  commentCount
) => {
  // Fetch updated comments
  const updatedComments = await c.var.db.query.comments.findMany({
    where: (
      comments: CommentsTable['_']['columns'],
      { eq }: { eq: (column: OrderByColumn, value: number) => SQL }
    ) => eq(comments.issueId, issueId),
    with: { author: true },
    orderBy: (comments: CommentsTable['_']['columns'], { asc }: { asc: OrderByFn }) => [
      asc(comments.createdAt),
    ],
  })

  // Broadcast to all viewers on this issue's comments topic
  const topics = await import('@/lib/topics')
  await c.var.datastar.broadcast(topics.topics.issue(issueId).comments(), [
    [
      'patch-elements',
      <CommentsSection comments={updatedComments} />,
      { selector: '#comments-section' },
    ],
    ['patch-signals', { commentError: '', comment: '' }],
  ])

  // Show success toast to commenter
  await c.var.datastar.reply([['toast:show', `Comment posted! (${commentCount} total)`, 'success']])
}

// ============================================================================
// Export all custom effects
// ============================================================================

export const customEffects = {
  // Toast notifications
  'toast:show': toastShow,
  'toast:success': toastSuccess,
  'toast:error': toastError,

  // Domain-specific issue effects
  'issue:created-success': issueCreatedSuccess,
  'comment:created-success': commentCreatedSuccess,
}
