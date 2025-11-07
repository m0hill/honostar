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

    // 1) Broadcast updated list to everyone on the issues:list topic
    await c.var.datastar.fx('issues:list', [
      ['patch-elements', issuesList, { selector: '#issues-list' }],
    ])

    // 2) Close the modal and reset the issue signal for the requesting client only
    return c.var.datastar.reply(
      [
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
      ],
      { status: 201 }
    )
  },
})
