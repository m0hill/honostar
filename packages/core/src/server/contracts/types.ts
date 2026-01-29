import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { EventContract } from "./api"

export type ContractsDefinition = { events: readonly EventContract[] }

export type ContractTopicName<C extends ContractsDefinition> = Extract<
  C["events"][number]["topic"],
  string
>

export type ContractEventName<C extends ContractsDefinition, Topic extends ContractTopicName<C>> =
  Topic extends ContractTopicName<C>
    ? Extract<C["events"][number], { topic: Topic }>["event"]
    : never

export type ContractPayload<
  C extends ContractsDefinition,
  Topic extends ContractTopicName<C>,
  Event extends ContractEventName<C, Topic>,
> =
  Topic extends ContractTopicName<C>
    ? Event extends ContractEventName<C, Topic>
      ? StandardSchemaV1.InferOutput<
          Extract<C["events"][number], { topic: Topic; event: Event }>["schema"]
        >
      : never
    : never
