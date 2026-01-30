import { defineQueryPage } from "@honostar/core/server"

export default defineQueryPage({
  loader: async () => ({}),
  component: () => {
    return (
      <main style="padding: 2rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
        <h1>Bad Apple (ASCII)</h1>
        <p>
          Streams frames at ~30fps and updates signals via <code>patch-signals</code>.
        </p>
        <p>
          Also see: <a href="/examples/bad_apple/raster">raster/base64 frames</a>.
        </p>

        <label
          data-signals="{_percentage: 0, _contents: 'bad apple frames go here', _running: false, _status: 'idle'}"
          style="display: grid; gap: 0.5rem; width: fit-content;"
        >
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button
              data-on:click="@get('/examples/bad_apple/start')"
              data-attr:disabled="$_running"
            >
              Start
            </button>
            <button
              data-on:click="@get('/examples/bad_apple/pause')"
              data-attr:disabled="!$_running"
            >
              Pause
            </button>
            <button data-on:click="@get('/examples/bad_apple/stop')">Stop</button>
            <span data-text="`Status: ${$_status}`">Status: idle</span>
          </div>

          <span data-text="`Percentage: ${$_percentage.toFixed(2)}%`">Percentage: 0%</span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.01"
            disabled
            style="cursor: default; width: 420px"
            data-attr:value="$_percentage"
          />
        </label>

        <pre
          style="
            line-height: 100%;
            font-size: 8px;
            letter-spacing: 0;
            background: #000;
            color: #fff;
            padding: 10px;
            display: inline-block;
            white-space: pre;
            overflow: hidden;
          "
          data-text="$_contents"
        >
          bad apple frames go here
        </pre>
      </main>
    )
  },
})
