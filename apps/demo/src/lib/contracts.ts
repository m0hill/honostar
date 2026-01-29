import { defineContracts, topic, topicPattern } from "@honostar/core/server"
import { z } from "zod"

export const issueCreated = topic("issues:list").event(
  "issue:created",
  z.object({
    id: z.number().int().positive(),
  })
)

export const issueStatusChangedList = topic("issues:list").event(
  "issue:status-changed",
  z.object({
    id: z.number().int().positive(),
    status: z.enum(["open", "closed"]),
  })
)

export const labelCreated = topic("labels:list").event(
  "label:created",
  z.object({
    name: z.string().min(1),
  })
)

export const commentCreated = topicPattern(/^issue:(?<id>\d+):comments$/).event(
  "comment:created",
  z.object({
    issueId: z.number().int().positive(),
  })
)

export const issueStatusChangedDetail = topicPattern(/^issue:(?<id>\d+):detail$/).event(
  "issue:status-changed",
  z.object({
    id: z.number().int().positive(),
    status: z.enum(["open", "closed"]),
  })
)

export const contracts = defineContracts(
  () =>
    [
      issueCreated,
      issueStatusChangedList,
      labelCreated,
      commentCreated,
      issueStatusChangedDetail,
    ] as const
)
