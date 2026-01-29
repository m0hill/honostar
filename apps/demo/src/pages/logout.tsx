import { defineCommand } from "@honostar/core/server"
import { deleteCookie } from "hono/cookie"
import { routes } from "@/routes"

export const POST = defineCommand({
  async handler(c) {
    deleteCookie(c, "token", { path: "/" })
    return c.redirect(routes.auth.login.href(), 303)
  },
})
