import IssuesList from '@/components/IssuesList'
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
    const labelIds: number[] = (issueSig.labels ?? []).map((v: string) => Number(v)).filter(Boolean)
    const newLabel: string = (issueSig.newLabel ?? '').trim()
    const imageBase64 = issueSig.image ?? null

    const user = c.var.user!

    if (!title) {
      return c.var.datastar.reply([['execute-script', "alert('Title is required')"]], {
        status: 400,
      })
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

    const allIssues = await c.var.db.query.issues.findMany({
      with: { author: true },
      orderBy: (i, { desc }) => [desc(i.createdAt)],
    })

    const issuesList = <IssuesList issues={allIssues} />

    return c.var.datastar.broadcast(
      'issues:list',
      [['patch-elements', issuesList, { selector: '#issues-list', mode: 'outer' }]],
      { status: 201 }
    )
  },
})
