import IssuesList from '@/components/IssuesList'
import type { AppHandler } from '@/core'
import { issues, issuesToLabels, labels as labelsTable } from '@/db/schema'

export const POST: AppHandler = async c => {
  // Read all signals; Datastar actions send JSON signals by default for POST.
  const body = await c.req.json()
  const issueSig = body?.issue ?? {}
  const title: string = issueSig.title?.trim() ?? ''
  const description: string = issueSig.description ?? ''
  const labelIds: number[] = (issueSig.labels ?? []).map((v: string) => Number(v)).filter(Boolean)
  const newLabel: string = (issueSig.newLabel ?? '').trim()
  const _imageBase64 = issueSig.image ?? null // you can store or upload elsewhere

  if (!c.var.user) {
    return c.var.datastar.respond({
      effects: [['execute-script', "alert('Please log in to create an issue.')"]],
      status: 401,
    })
  }

  if (!title) {
    return c.var.datastar.respond({
      effects: [['execute-script', "alert('Title is required')"]],
      status: 400,
    })
  }

  // Create new label if requested
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

  // Store image (optional). Here we skip persistence to keep example simple.
  // If you store it, set imageUrl accordingly.
  const imageUrl = null as string | null

  // Insert issue
  const [created] = await c.var.db
    .insert(issues)
    .values({
      title,
      description,
      authorId: c.var.user.id,
      imageUrl,
    })
    .returning()

  // Link labels
  if (created && labelIds.length) {
    await c.var.db
      .insert(issuesToLabels)
      .values(labelIds.map(labelId => ({ issueId: created.id, labelId })))
  }

  // Re-fetch list for broadcast
  const allIssues = await c.var.db.query.issues.findMany({
    with: { author: true },
    orderBy: (i, { desc }) => [desc(i.createdAt)],
  })

  // Broadcast to everyone subscribed to 'issues'
  const issuesList = <IssuesList issues={allIssues} />
  await c.var.datastar.respond({
    topics: ['issues'],
    effects: [['patch-elements', issuesList, { selector: '#issues-list', mode: 'outer' }]],
  })

  // Signal success to creator (modal closes via form submission signal)
  return c.var.datastar.respond({
    effects: [
      [
        'execute-script',
        `$issue = { title: "", description: "", labels: [], newLabel: "", image: null }`,
      ],
    ],
    toClient: true,
    status: 201,
  })
}
