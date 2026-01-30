import { defineQueryPage } from "@honostar/core/server"

export default defineQueryPage({
  loader: async () => ({}),
  component: () => {
    return (
      <main style="padding: 2rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
        <h1>Bad Apple (Raster → base64)</h1>
        <p>
          Streams JPEG frames as <code>data:image/jpeg;base64,...</code> and updates an{" "}
          <code>&lt;img&gt;</code> via <code>data-attr:src</code>.
        </p>

        <section
          data-signals="{_percentage: 0, _imgSrc: '', _running: false, _status: 'idle'}"
          style="display: grid; gap: 0.75rem; width: fit-content;"
        >
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button
              data-on:click="@get('/examples/bad_apple/raster/start')"
              data-attr:disabled="$_running"
            >
              Start
            </button>
            <button
              data-on:click="@get('/examples/bad_apple/raster/pause')"
              data-attr:disabled="!$_running"
            >
              Pause
            </button>
            <button data-on:click="@get('/examples/bad_apple/raster/stop')">Stop</button>
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

          <div
            style="
              width: 480px;
              height: 360px;
              background: #000;
              display: grid;
              place-items: center;
              overflow: hidden;
              border-radius: 8px;
            "
          >
            <img
              alt="Bad Apple"
              style="max-width: 100%; max-height: 100%; image-rendering: pixelated;"
              data-attr:src="$_imgSrc"
            />
          </div>
        </section>
      </main>
    )
  },
})
