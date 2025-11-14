/**
 * Example: Custom Effects with Bonsai's Extensible Effect System
 *
 * This file demonstrates how to create and use custom effects to build
 * domain-specific abstractions that make your handlers cleaner and more maintainable.
 *
 * Inspired by the datastar.wow effect registry pattern from the Clojure ecosystem.
 */

import type { Context } from 'hono'
import type { JSX } from 'hono/jsx/jsx-runtime'
import { type EffectHandler, type TypedEffectHandler } from '@/core'
import type { AppEnv } from '@/core/context'

// ============================================================================
// Toast Notifications
// ============================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info'

// Simple toast component (you'd have a real implementation)
function Toast({ message, type }: { message: string; type: ToastType }) {
  return (
    <div
      id={`toast-${Date.now()}`}
      class={`toast toast-${type}`}
      data-on:load="setTimeout(() => this.remove(), 3000)"
    >
      {message}
    </div>
  )
}

// Type-safe effect definition
type ToastShowEffect = ['toast:show', message: string, type: ToastType]

const toastShow: TypedEffectHandler<ToastShowEffect> = async (c, message, type) => {
  await c.var.datastar.reply([
    [
      'patch-elements',
      <Toast message={message} type={type} />,
      { selector: '#toast-container', mode: 'append' },
    ],
  ])
}

// ============================================================================
// Modal Management
// ============================================================================

const modalClose: EffectHandler<[modalId: string]> = async (c, modalId) => {
  await c.var.datastar.reply([
    ['patch-elements', '', { selector: `#${modalId}`, mode: 'remove' }],
    ['patch-signals', { [`${modalId}.open`]: false }],
  ])
}

const modalOpen: EffectHandler<[modalId: string, component: JSX.Element]> = async (
  c,
  modalId,
  component
) => {
  await c.var.datastar.reply([
    ['patch-elements', component, { selector: '#ds-overlays', mode: 'append' }],
    ['patch-signals', { [`${modalId}.open`]: true }],
  ])
}

// ============================================================================
// Analytics & Observability
// ============================================================================

const analyticsTrack: EffectHandler<[event: string, properties?: Record<string, unknown>]> = async (
  c,
  event,
  properties = {}
) => {
  // Side-effect only - no UI update
  console.log('[Analytics]', event, properties)

  // In production, you'd send to your analytics service
  // await fetch('https://analytics.example.com/track', {
  //   method: 'POST',
  //   body: JSON.stringify({ event, properties, timestamp: Date.now() })
  // })
}

// ============================================================================
// Domain-Specific Effects
// ============================================================================

/**
 * Example: Issue lifecycle effects
 * These compose multiple lower-level effects into domain-specific actions
 */

const issueCreated: EffectHandler<[issue: { id: number; title: string }]> = async (c, issue) => {
  // Broadcast to all connected clients on the issues topic
  await c.var.datastar.broadcast('issues:list', [
    // Refetch and re-render the issues list
    ['patch-elements', <div>Issue list would be re-rendered here</div>],
  ])

  // Show success toast to the creator
  await c.var.datastar.reply([
    ['toast:show', `Issue "${issue.title}" created successfully!`, 'success'],
    ['modal:close', 'create-issue-modal'],
  ])

  // Track analytics
  await analyticsTrack(c, 'issue:created', { issueId: issue.id })
}

const issueDeleted: EffectHandler<[issueId: number]> = async (c, issueId) => {
  await c.var.datastar.broadcast('issues:list', [
    ['patch-elements', <div>Updated list without deleted issue</div>],
  ])

  await c.var.datastar.reply([['toast:show', 'Issue deleted', 'success']])

  await analyticsTrack(c, 'issue:deleted', { issueId })
}

// ============================================================================
// Notification System
// ============================================================================

type NotificationPayload = {
  userId: string
  message: string
  link?: string
}

const notificationSend: EffectHandler<[payload: NotificationPayload]> = async (_c, payload) => {
  // Send push notification (example)
  console.log('[Notification] Sending to', payload.userId, ':', payload.message)

  // Update notification badge for the user (this would need access to c in real implementation)
  // await c.var.datastar.broadcast(`user:${payload.userId}`, [
  //   [
  //     'patch-elements',
  //     <span class="notification-badge">1</span>,
  //     { selector: '#notification-badge' },
  //   ],
  // ])
}

// ============================================================================
// Export all custom effects
// ============================================================================

/**
 * Register all custom effects in your app's entry point:
 *
 * ```typescript
 * // In src/index.ts
 * import { customEffects } from './example-custom-effects'
 *
 * app.use('*', registerEffects(customEffects))
 * ```
 */
export const customEffects = {
  // Toast notifications
  'toast:show': toastShow,

  // Modal management
  'modal:close': modalClose,
  'modal:open': modalOpen,

  // Analytics
  'analytics:track': analyticsTrack,

  // Domain-specific
  'issue:created': issueCreated,
  'issue:deleted': issueDeleted,

  // Notifications
  'notification:send': notificationSend,
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example handler using custom effects
 */
export function exampleHandler(c: Context<AppEnv>) {
  // Before custom effects (verbose):
  // return c.var.datastar.reply([
  //   ['patch-elements', <Toast message="Success!" type="success" />, { selector: '#toast-container', mode: 'append' }],
  //   ['patch-elements', '', { selector: '#my-modal', mode: 'remove' }],
  //   ['patch-signals', { 'myModal.open': false }]
  // ])

  // After custom effects (clean and semantic):
  return c.var.datastar.reply([
    ['toast:show', 'Success!', 'success'],
    ['modal:close', 'my-modal'],
    ['analytics:track', 'user:action', { action: 'submit-form' }],
  ])
}

/**
 * Example: Composing effects in domain logic
 */
export function exampleDomainLogic(c: Context<AppEnv>) {
  const newIssue = { id: 123, title: 'Bug: Fix the thing' }

  // Single effect call handles:
  // - Broadcasting update to all viewers
  // - Showing toast to creator
  // - Closing modal
  // - Tracking analytics
  return c.var.datastar.reply([['issue:created', newIssue]])
}

/**
 * Example: Type-safe custom effects
 */
export async function exampleTypeSafety(c: Context<AppEnv>) {
  // TypeScript enforces correct argument types
  await c.var.datastar.reply([
    ['toast:show', 'Message', 'success'], // ✅ OK
    // ['toast:show', 'Message', 'invalid'], // ❌ Type error: 'invalid' is not a valid ToastType
    // ['toast:show', 123, 'success'],       // ❌ Type error: message must be string
  ])
}
