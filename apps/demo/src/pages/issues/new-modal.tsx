import { createHandler } from "@honostar/core/server"
import { z } from "zod"
import IssueModal from "@/components/IssueModal"
import { labels } from "@/db/schema"
import { requireAuth } from "@/lib/auth-middleware"
import { routes } from "@/routes"

// No data expected from client - empty schema
const emptySchema = z.object({}).optional()

export const GET = createHandler({
  schema: emptySchema,
  use: [requireAuth],
  async handler(c) {
    // HTML-first fallback: treat this as a normal navigation.
    if (c.req.header("datastar-request") === null) {
      return c.redirect(routes.issues.new.href(), 303)
    }

    const allLabels = await c.var.db.select().from(labels)
    return c.var.fx.reply(
      [
        [
          "patch-elements",
          <IssueModal labels={allLabels} />,
          { selector: "#ds-overlays", mode: "append" },
        ],
      ],
      { status: 200 }
    )
  },
})
