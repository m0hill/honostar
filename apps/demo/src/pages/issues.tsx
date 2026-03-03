import { defineCommand } from "@honostar/core/server"
import { z } from "zod"
import { issues, issuesToLabels, labels as labelsTable } from "@/db/schema"
import { requireAuth } from "@/lib/auth-middleware"
import { issueCreated, labelCreated } from "@/lib/contracts"
import { saveBase64Image } from "@/lib/images"
import { routes } from "@/generated/routes"

/**
 * Define the schema for the incoming JSON payload from Datastar.
 * This matches the `issue` signal defined in `IssueModal.tsx`.
 */
const issueSchema = z.object({
  issue: z.object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().optional(),
    labels: z.preprocess(
      (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
      z.array(z.string())
    ),
    newLabel: z.string().trim().optional(),
    image: z.any().optional(), // `saveBase64Image` handles null or the file object
  }),
})

export const POST = defineCommand({
  schema: issueSchema,
  use: [requireAuth],
  hook: (result, c) => {
    const error = result.error[0]?.message || "Invalid input"
    if (c.var.isDatastarRequest) {
      return c.var.fx.reply(
        [
          [
            "patch-signals",
            {
              createIssueModal: { error },
              issueForm: { error },
            },
          ],
        ],
        { status: 400 }
      )
    }
    return c.redirect(`${routes.issues.new.href()}?error=${encodeURIComponent(error)}`, 303)
  },

  async handler(c, data) {
    // Data is now 100% type-safe! No type assertions needed.
    const { issue } = data
    const user = c.var.user!

    const labelIds: number[] = issue.labels.map((v: string) => Number(v)).filter(Boolean)

    const newLabel = issue.newLabel?.trim()
    let createdNewLabel = false

    if (newLabel) {
      const exists = await c.var.db.query.labels.findFirst({
        where: (l, { eq }) => eq(l.name, newLabel),
      })
      if (!exists) {
        const [inserted] = await c.var.db
          .insert(labelsTable)
          .values({ name: newLabel, color: "#999999" })
          .returning()
        if (inserted) {
          createdNewLabel = true
          labelIds.push(inserted.id)
        }
      } else {
        labelIds.push(exists.id)
      }
    }

    let imageUrl: string | null = null
    if (issue.image) {
      try {
        imageUrl = await saveBase64Image(issue.image)
      } catch (error) {
        console.error("Failed to save image:", error)
      }
    }

    const [created] = await c.var.db
      .insert(issues)
      .values({
        title: issue.title, // Guaranteed to be a non-empty string
        description: issue.description,
        authorId: user.id,
        imageUrl,
      })
      .returning()

    if (!created) {
      const error = "Failed to create issue"
      if (c.var.isDatastarRequest) {
        return c.var.fx.reply(
          [
            [
              "patch-signals",
              {
                createIssueModal: { error },
                issueForm: { error },
              },
            ],
          ],
          { status: 500 }
        )
      }
      return c.redirect(`${routes.issues.new.href()}?error=${encodeURIComponent(error)}`, 303)
    }

    if (created && labelIds.length) {
      await c.var.db
        .insert(issuesToLabels)
        .values(labelIds.map((labelId) => ({ issueId: created.id, labelId })))
    }

    // CQRS: command publishes domain events; queries re-render subscribed regions on SSE.
    await c.var.fx.publish(issueCreated, { id: created.id })
    if (createdNewLabel && newLabel) {
      await c.var.fx.publish(labelCreated, { name: newLabel })
    }

    if (c.var.isDatastarRequest) {
      return c.var.fx.reply(
        [
          ["toast:show", `Issue "${created.title}" created successfully!`, "success"],
          [
            "patch-elements",
            "",
            {
              selector: '#ds-overlays [data-modal-id="create-issue"]',
              mode: "remove",
            },
          ],
          [
            "patch-signals",
            {
              issue: {
                title: "",
                description: "",
                labels: [],
                newLabel: "",
                image: null,
              },
            },
          ],
        ],
        { status: 201 }
      )
    }
    return c.redirect(routes.issues.show.href({ id: created.id }), 303)
  },
})
