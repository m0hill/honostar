import { factory } from "@honostar/core/server"
import { deleteCookie, getCookie } from "hono/cookie"
import { verify } from "hono/jwt"

export const auth = factory.createMiddleware(async (c, next) => {
  const token = getCookie(c, "token")

  if (!token) {
    c.set("user", null)
    return next()
  }

  try {
    const decodedPayload = await verify(token, process.env.JWT_SECRET!, "HS256")

    if (
      !decodedPayload ||
      typeof decodedPayload !== "object" ||
      !("id" in decodedPayload) ||
      typeof decodedPayload.id !== "number"
    ) {
      throw new Error("Invalid JWT payload")
    }

    const userId = decodedPayload.id

    const user = await c.var.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    })

    c.set("user", user || null)
  } catch (e) {
    console.error("Auth middleware error:", e)
    deleteCookie(c, "token", { path: "/" })
    c.set("user", null)
  }

  await next()
})
