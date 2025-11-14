import { createHandler } from '@/core/page'
import { issues, issuesToLabels, labels as labelsTable } from '@/db/schema'
import { requireAuth } from '@/lib/auth-middleware'
import { saveBase64Image } from '@/lib/images'

export const POST = createHandler({
  use: [requireAuth],

  async handler(c) {
    const body = await c.req.json()
    const issueSig = body?.issue ?? {}
    const title: string = issueSig.title?.trim() ?? ''
    const description: string = issueSig.description ?? ''
    const labelsValue = issueSig.labels ?? []
    console.log(
      '[DEBUG] Raw labels value:',
      JSON.stringify(labelsValue),
      'Type:',
      typeof labelsValue,
      'IsArray:',
      Array.isArray(labelsValue)
    )
    const labelIds: number[] = (
      Array.isArray(labelsValue) ? labelsValue : Object.values(labelsValue)
    )
      .map((v: string) => Number(v))
      .filter(Boolean)
    console.log('[DEBUG] Processed labelIds:', labelIds)
    const newLabel: string = (issueSig.newLabel ?? '').trim()
    const imageBase64 = issueSig.image ?? null

    const user = c.var.user!

    if (!title) {
      return c.var.datastar.reply(
        [['patch-signals', { createIssueModal: { error: 'Title is required' } }]],
        { status: 400 }
      )
    }

    if (newLabel.length > 0) {
      const exists = await c.var.db.query.labels.findFirst({
        where: (l, { eq }) => eq(l.name, newLabel),
      })
      if (!exists) {
        const [inserted] = await c.var.db
          .insert(labelsTable)
          .values({ name: newLabel, color: '#999999' })
          .returning()
        if (inserted) labelIds.push(inserted.id)
      } else {
        labelIds.push(exists.id)
      }
    }

    let imageUrl: string | null = null
    if (imageBase64) {
      try {
        imageUrl = await saveBase64Image(imageBase64)
      } catch (error) {
        console.error('Failed to save image:', error)
      }
    }

    const [created] = await c.var.db
      .insert(issues)
      .values({
        title,
        description,
        authorId: user.id,
        imageUrl,
      })
      .returning()

    if (created && labelIds.length) {
      await c.var.db
        .insert(issuesToLabels)
        .values(labelIds.map(labelId => ({ issueId: created.id, labelId })))
    }

    // Use custom effect instead of manual composition!
    // This single effect handles:
    // - Broadcasting updated list to all viewers
    // - Showing success toast to creator
    // - Closing modal and resetting form
    return c.var.datastar.reply([['issue:created-success', created]], { status: 201 })
  },
})
