import type { Context } from "hono"
import { Hono } from "hono"
import {
  createConfig,
  csrf,
  fxResponder,
  initContext,
  patchRegion,
  renderer,
  type AppEnv,
  type EffectDefinition,
  type QueryHandler,
  type QueryRegistration,
} from "@honostar/core/server"
import {
  createCloudflareDurableObjectBus,
  createCloudflareSseEndpoint,
} from "@honostar/cloudflare/server"

export { CloudflareBusHub } from "@honostar/cloudflare/server"

// ---------------------------------------------------------------------------
// Topics & Regions
// ---------------------------------------------------------------------------
const TOPIC_COUNTER = "demo:counter"
const TOPIC_TODOS = "demo:todos"
const TOPIC_CHAT = "demo:chat"

const REGION_COUNTER = "demo:counter"
const REGION_TODOS = "demo:todos"
const REGION_CHAT = "demo:chat"

// ---------------------------------------------------------------------------
// In-memory state (resets on redeploy — fine for a demo)
// ---------------------------------------------------------------------------
let counter = 0

type Todo = { id: number; text: string; done: boolean; createdAt: number }
let nextTodoId = 1
const todos: Todo[] = []

type ChatMessage = { id: number; author: string; text: string; ts: number }
let nextChatId = 1
const chatMessages: ChatMessage[] = []

// ---------------------------------------------------------------------------
// Query handlers — re-render regions on events
// ---------------------------------------------------------------------------
const counterQuery: QueryHandler = async () => {
  return [patchRegion(REGION_COUNTER, <CounterCard count={counter} />)]
}

const todosQuery: QueryHandler = async () => {
  return [patchRegion(REGION_TODOS, <TodoList items={todos} />)]
}

const chatQuery: QueryHandler = async () => {
  return [patchRegion(REGION_CHAT, <ChatLog messages={chatMessages} />)]
}

const collectedQueries: QueryRegistration[] = [
  [TOPIC_COUNTER, counterQuery],
  [TOPIC_TODOS, todosQuery],
  [TOPIC_CHAT, chatQuery],
]

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const config = createConfig({
  assets: {
    css: "/styles.css",
    runtime: "/runtime.js",
    datastar: "/datastar.js",
    plugins: [],
  },
})

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = new Hono<AppEnv>()

app.use("*", csrf(config))
app.use("*", renderer(config))
app.use("*", initContext)

app.use("*", async (c, next) => {
  const hub = getBinding(c, "HONOSTAR_SSE_HUB")
  if (!hub) return c.text("Missing Durable Object binding: HONOSTAR_SSE_HUB", 500)
  try {
    c.set(
      "bus",
      createCloudflareDurableObjectBus({ hub, hubName: "shared", waitUntil: getWaitUntil(c) })
    )
  } catch (err) {
    console.error("[my-app] Failed to init Cloudflare DO bus", err)
    return c.text("Failed to init Cloudflare DO bus", 500)
  }
  await next()
})

app.use("*", fxResponder)

// SSE endpoint
app.get(
  "/_/events",
  createCloudflareSseEndpoint({
    hubName: "shared",
    queries: collectedQueries,
  })
)

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
app.get("/", (c: Context<AppEnv>) => {
  c.set("sseTopics", [TOPIC_COUNTER, TOPIC_TODOS, TOPIC_CHAT])
  return c.render(<Home count={counter} items={todos} messages={chatMessages} />)
})

// ---------------------------------------------------------------------------
// Commands — Counter
// ---------------------------------------------------------------------------
app.post("/increment", async (c: Context<AppEnv>) => {
  counter++
  await c.var.fx.publish(TOPIC_COUNTER, "counter:changed", { count: counter })
  return c.var.fx.ok()
})

app.post("/decrement", async (c: Context<AppEnv>) => {
  counter--
  await c.var.fx.publish(TOPIC_COUNTER, "counter:changed", { count: counter })
  return c.var.fx.ok()
})

app.post("/reset-counter", async (c: Context<AppEnv>) => {
  counter = 0
  await c.var.fx.publish(TOPIC_COUNTER, "counter:changed", { count: counter })
  return c.var.fx.ok()
})

// ---------------------------------------------------------------------------
// Commands — Todos
// ---------------------------------------------------------------------------
app.post("/todos", async (c: Context<AppEnv>) => {
  const signals = await c.req.json<Record<string, unknown>>()
  const text = typeof signals.todoInput === "string" ? signals.todoInput.trim() : ""
  if (!text) {
    return c.var.fx.reply([["patch-signals", { todoError: "Todo text is required" }]], {
      status: 400,
    })
  }
  const todo: Todo = { id: nextTodoId++, text, done: false, createdAt: Date.now() }
  todos.push(todo)
  await c.var.fx.publish(TOPIC_TODOS, "todo:created", { id: todo.id })
  return c.var.fx.reply([["patch-signals", { todoInput: "", todoError: "" }]])
})

app.post("/todos/:id/toggle", async (c: Context<AppEnv>) => {
  const id = Number(c.req.param("id"))
  const todo = todos.find((t) => t.id === id)
  if (!todo) return c.text("Not found", 404)
  todo.done = !todo.done
  await c.var.fx.publish(TOPIC_TODOS, "todo:toggled", { id: todo.id })
  return c.var.fx.ok()
})

app.post("/todos/:id/delete", async (c: Context<AppEnv>) => {
  const id = Number(c.req.param("id"))
  const idx = todos.findIndex((t) => t.id === id)
  if (idx === -1) return c.text("Not found", 404)
  todos.splice(idx, 1)
  await c.var.fx.publish(TOPIC_TODOS, "todo:deleted", { id })
  return c.var.fx.ok()
})

app.post("/todos/clear-done", async (c: Context<AppEnv>) => {
  const removed = todos.filter((t) => t.done)
  for (let i = todos.length - 1; i >= 0; i--) {
    if (todos[i]?.done) todos.splice(i, 1)
  }
  if (removed.length > 0) {
    await c.var.fx.publish(TOPIC_TODOS, "todo:cleared", { count: removed.length })
  }
  return c.var.fx.ok()
})

// ---------------------------------------------------------------------------
// Commands — Chat
// ---------------------------------------------------------------------------
app.post("/chat", async (c: Context<AppEnv>) => {
  const signals = await c.req.json<Record<string, unknown>>()
  const text = typeof signals.chatInput === "string" ? signals.chatInput.trim() : ""
  const author = typeof signals.chatAuthor === "string" ? signals.chatAuthor.trim() : ""
  if (!text) {
    return c.var.fx.reply([["patch-signals", { chatError: "Message is required" }]], {
      status: 400,
    })
  }
  const msg: ChatMessage = {
    id: nextChatId++,
    author: author || "Anonymous",
    text,
    ts: Date.now(),
  }
  chatMessages.push(msg)
  if (chatMessages.length > 50) chatMessages.shift()
  await c.var.fx.publish(TOPIC_CHAT, "chat:message", { id: msg.id })
  return c.var.fx.reply([["patch-signals", { chatInput: "", chatError: "" }]])
})

// ---------------------------------------------------------------------------
// Commands — Server time (reply-only, no broadcast)
// ---------------------------------------------------------------------------
app.post("/server-time", async (c: Context<AppEnv>) => {
  const now = new Date()
  const effects: EffectDefinition[] = [["patch-signals", { serverTime: now.toISOString() }]]
  return c.var.fx.reply(effects)
})

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function Home(props: { count: number; items: Todo[]; messages: ChatMessage[] }) {
  return (
    <main style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;">
      <h1 style="margin-bottom: 4px;">HonoStar Cloudflare Demo</h1>
      <p style="color: #666; margin-top: 0;">
        Server-rendered HTML + SSE patches via Durable Object hub. Open in multiple tabs to see
        real-time sync.
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
        <div>
          <CounterCard count={props.count} />
          <ServerTimeCard />
        </div>
        <TodoCard items={props.items} />
      </div>

      <div style="margin-top: 24px;">
        <ChatCard messages={props.messages} />
      </div>
    </main>
  )
}

// --- Counter ---
function CounterCard(props: { count: number }) {
  return (
    <section
      data-honostar-region={REGION_COUNTER}
      data-honostar-region-kind="card"
      style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px;"
    >
      <h2 style="margin-top: 0;">Counter</h2>
      <p style="font-size: 2rem; font-weight: bold; margin: 8px 0;">{props.count}</p>
      <div style="display: flex; gap: 8px;">
        <button data-on:click="@post('/decrement')" style={btnStyle}>
          −
        </button>
        <button data-on:click="@post('/increment')" style={btnStyle}>
          +
        </button>
        <button data-on:click="@post('/reset-counter')" style={btnStyleSecondary}>
          Reset
        </button>
      </div>
    </section>
  )
}

// --- Server Time (reply-only, no broadcast) ---
function ServerTimeCard() {
  return (
    <section style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
      <h2 style="margin-top: 0;">Server Time</h2>
      <p style="font-family: monospace; margin: 8px 0;" data-text="$serverTime || 'Click to fetch'">
        Click to fetch
      </p>
      <button data-on:click="@post('/server-time')" style={btnStyle}>
        Fetch Server Time
      </button>
      <p style="font-size: 0.8rem; color: #888; margin-bottom: 0;">
        Uses <code>fx.reply</code> — only updates the requesting tab (no broadcast).
      </p>
    </section>
  )
}

// --- Todos ---
function TodoCard(props: { items: Todo[] }) {
  const doneCount = props.items.filter((t) => t.done).length
  return (
    <section style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
      <h2 style="margin-top: 0;">
        Todos{" "}
        <span style="font-size: 0.8rem; color: #888;">
          ({props.items.length} total, {doneCount} done)
        </span>
      </h2>
      <form
        data-on:submit__prevent="@post('/todos')"
        style="display: flex; gap: 8px; margin-bottom: 12px;"
      >
        <input
          type="text"
          name="text"
          placeholder="What needs doing?"
          data-bind="todoInput"
          style="flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px;"
        />
        <button type="submit" style={btnStyle}>
          Add
        </button>
      </form>
      <p
        data-show="$todoError"
        data-text="$todoError"
        style="color: red; font-size: 0.85rem; margin: 0 0 8px 0;"
      />
      <TodoList items={props.items} />
      {props.items.some((t) => t.done) && (
        <button
          data-on:click="@post('/todos/clear-done')"
          style={btnStyleSecondary + " margin-top: 8px;"}
        >
          Clear completed
        </button>
      )}
    </section>
  )
}

function TodoList(props: { items: Todo[] }) {
  return (
    <div data-honostar-region={REGION_TODOS} data-honostar-region-kind="list">
      {props.items.length === 0 ? (
        <p style="color: #999; font-style: italic;">No todos yet.</p>
      ) : (
        <ul style="list-style: none; padding: 0; margin: 0;">
          {props.items.map((t) => (
            <TodoItem key={t.id} todo={t} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TodoItem(props: { todo: Todo }) {
  const { todo } = props
  return (
    <li style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #eee;">
      <input
        type="checkbox"
        checked={todo.done}
        data-on:click={`@post('/todos/${todo.id}/toggle')`}
        style="cursor: pointer;"
      />
      <span style={todo.done ? "text-decoration: line-through; color: #999; flex: 1;" : "flex: 1;"}>
        {todo.text}
      </span>
      <button
        data-on:click={`@post('/todos/${todo.id}/delete')`}
        style="background: none; border: none; color: #c00; cursor: pointer; font-size: 1rem;"
        title="Delete"
      >
        ✕
      </button>
    </li>
  )
}

// --- Chat ---
function ChatCard(props: { messages: ChatMessage[] }) {
  return (
    <section style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
      <h2 style="margin-top: 0;">
        Live Chat{" "}
        <span style="font-size: 0.8rem; color: #888;">({props.messages.length} messages)</span>
      </h2>
      <ChatLog messages={props.messages} />
      <form
        data-on:submit__prevent="@post('/chat')"
        style="display: flex; gap: 8px; margin-top: 12px;"
      >
        <input
          type="text"
          name="author"
          placeholder="Name"
          data-bind="chatAuthor"
          style="width: 120px; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px;"
        />
        <input
          type="text"
          name="text"
          placeholder="Message…"
          data-bind="chatInput"
          style="flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px;"
        />
        <button type="submit" style={btnStyle}>
          Send
        </button>
      </form>
      <p
        data-show="$chatError"
        data-text="$chatError"
        style="color: red; font-size: 0.85rem; margin: 4px 0 0 0;"
      />
    </section>
  )
}

function ChatLog(props: { messages: ChatMessage[] }) {
  return (
    <div
      data-honostar-region={REGION_CHAT}
      data-honostar-region-kind="list"
      style="max-height: 250px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px; padding: 8px; background: #fafafa;"
    >
      {props.messages.length === 0 ? (
        <p style="color: #999; font-style: italic; margin: 0;">No messages yet. Say something!</p>
      ) : (
        props.messages.map((m) => (
          <div key={m.id} style="margin-bottom: 6px;">
            <strong style="color: #333;">{m.author}</strong>{" "}
            <span style="font-size: 0.75rem; color: #aaa;">
              {new Date(m.ts).toLocaleTimeString()}
            </span>
            <div>{m.text}</div>
          </div>
        ))
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const btnStyle =
  "padding: 6px 14px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;"
const btnStyleSecondary =
  "padding: 6px 14px; background: #e5e7eb; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getWaitUntil(c: unknown): ((promise: Promise<unknown>) => void) | undefined {
  if (!isPlainRecord(c)) return undefined
  const executionCtx: unknown = c.executionCtx
  if (!isPlainRecord(executionCtx)) return undefined
  const waitUntil: unknown = executionCtx.waitUntil
  if (typeof waitUntil !== "function") return undefined
  return (promise: Promise<unknown>) => {
    try {
      waitUntil.call(executionCtx, promise)
    } catch (err) {
      console.error("[my-app] executionCtx.waitUntil failed", err)
    }
  }
}

function getBinding(c: Context<AppEnv>, name: string): unknown | null {
  const env: unknown = c.env
  if (!isPlainRecord(env)) return null
  return name in env ? env[name] : null
}

export default app
