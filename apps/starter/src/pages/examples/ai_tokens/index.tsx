import { defineQueryPage } from "@honostar/core/server"

export default defineQueryPage({
  loader: async () => ({}),
  component: () => {
    return (
      <main style="padding: 2rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
        <h1>AI Token Stream (Example)</h1>
        <p>
          Demonstrates streaming chunks over the main <code>/_/events</code> SSE connection. Chunks
          are coalesced (~50ms) and appended to a signal without re-rendering HTML.
        </p>

        <section
          data-signals="{_tokens: '', _running: false, _status: 'idle'}"
          style="display: grid; gap: 0.75rem; width: min(900px, 100%);"
        >
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button
              data-on:click="@get('/examples/ai_tokens/start')"
              data-attr:disabled="$_running"
            >
              Start
            </button>
            <button
              data-on:click="@get('/examples/ai_tokens/stop')"
              data-attr:disabled="!$_running"
            >
              Stop
            </button>
            <span data-text="`Status: ${$_status}`">Status: idle</span>
          </div>

          <pre
            style="
              background: #0b1020;
              color: #e9eefc;
              padding: 12px;
              border-radius: 8px;
              min-height: 160px;
              white-space: pre-wrap;
              overflow-wrap: anywhere;
            "
            data-text="$_tokens"
          ></pre>
        </section>
      </main>
    )
  },
})
