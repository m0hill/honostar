export const topics = {
  counter: "counter",
} as const

export type TopicId = (typeof topics)[keyof typeof topics]

export const regions = {
  counter: topics.counter,
  counterDot: "counter:dot",
} as const

export type RegionId = (typeof regions)[keyof typeof regions]
