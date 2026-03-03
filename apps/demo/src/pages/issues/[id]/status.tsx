import { defineCommand } from "@honostar/core/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { issues } from "@/db/schema"
import { requireAuth } from "@/lib/auth-middleware"
import { issueStatusChangedDetail, issueStatusChangedList } from "@/lib/contracts"
import { topics } from "@/lib/topics"
import { routes } from "@/generated/routes"

const payloadSchema = z.object({
  status: z.enum(["open", "closed"]),
})

export const POST = defineCommand({
  schema: payloadSchema,
  use: [requireAuth],
  hook: (result, c) => {
    const error = result.error[0]?.message || "Invalid status"
    if (c.var.isDatastarRequest) {
      return c.var.fx.reply([["toast:show", error, "error"]], { status: 400 })
    }
    return c.text(error, 400)
  },

  async handler(c, data) {
    const { id } = c.req.param()
    const issueId = Number(id)
    if (!Number.isFinite(issueId) || issueId <= 0) {
      return c.text("Invalid issue ID", 400)
    }

    const existing = await c.var.db.query.issues.findFirst({
      where: (i, { eq }) => eq(i.id, issueId),
    })
    if (!existing) {
      return c.text("Issue not found", 404)
    }

    if (existing.status !== data.status) {
      await c.var.db.update(issues).set({ status: data.status }).where(eq(issues.id, issueId))
    }

    await c.var.fx.publishTo(topics.issues.list(), issueStatusChangedList, {
      id: issueId,
      status: data.status,
    })
    await c.var.fx.publishTo(topics.issue(issueId).detail(), issueStatusChangedDetail, {
      id: issueId,
      status: data.status,
    })

    if (c.var.isDatastarRequest) {
      const label = data.status === "closed" ? "Issue closed" : "Issue reopened"
      return c.var.fx.reply([["toast:show", label, "success"]], { status: 200 })
    }

    return c.redirect(routes.issues.show.href({ id: String(issueId) }), 303)
  },
})
