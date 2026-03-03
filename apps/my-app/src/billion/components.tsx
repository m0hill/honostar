import { regionAttrs } from "@honostar/core/server"
import {
  BOARD_PIXEL_SIZE,
  BOARD_SIZE,
  CELL_GAP_PX,
  CELL_SIZE_PX,
  CELL_STRIDE_PX,
  REGION_BOARD,
  REGION_STATS,
  TOTAL_CELLS,
  VIEW_OVERSCAN_COLS,
  VIEW_OVERSCAN_ROWS,
  type ViewportSnapshot,
} from "./domain"

function StatsCard(props: { checkedCount: number; x: number; y: number }) {
  return (
    <section
      {...regionAttrs(REGION_STATS)}
      style="margin-bottom: 10px; border: 1px solid #d8d8d8; border-radius: 8px; padding: 10px 12px; background: #fafafa;"
    >
      <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <div>
          <strong>Total checked:</strong> {props.checkedCount.toLocaleString()}
        </div>
        <div>
          <strong>Board:</strong> {BOARD_SIZE.toLocaleString()} x {BOARD_SIZE.toLocaleString()} (
          {TOTAL_CELLS.toLocaleString()} cells)
        </div>
        <div>
          <strong>Viewport origin:</strong> ({props.x.toLocaleString()}, {props.y.toLocaleString()})
        </div>
      </div>
    </section>
  )
}

function ScrollableBoard(props: { snapshot: ViewportSnapshot }) {
  const initScroll = [
    `$vrows = Math.ceil($_boardViewport.clientHeight / ${CELL_STRIDE_PX}) + ${VIEW_OVERSCAN_ROWS};`,
    `$vcols = Math.ceil($_boardViewport.clientWidth / ${CELL_STRIDE_PX}) + ${VIEW_OVERSCAN_COLS};`,
    `$_boardViewport.scrollTo(${props.snapshot.x * CELL_STRIDE_PX}, ${props.snapshot.y * CELL_STRIDE_PX});`,
    `$vx = Math.floor($_boardViewport.scrollLeft / ${CELL_STRIDE_PX});`,
    `$vy = Math.floor($_boardViewport.scrollTop / ${CELL_STRIDE_PX});`,
    `@post('/viewport', { contentType: 'json', openWhenHidden: true });`,
  ].join(" ")

  const syncScroll = `$vrows = Math.ceil(evt.target.clientHeight / ${CELL_STRIDE_PX}) + ${VIEW_OVERSCAN_ROWS}; $vcols = Math.ceil(evt.target.clientWidth / ${CELL_STRIDE_PX}) + ${VIEW_OVERSCAN_COLS}; $vx = Math.floor(evt.target.scrollLeft / ${CELL_STRIDE_PX}); $vy = Math.floor(evt.target.scrollTop / ${CELL_STRIDE_PX}); @post('/viewport', { contentType: 'json', openWhenHidden: true })`

  const scrollAttrs = {
    "data-on:scroll__debounce.80ms": syncScroll,
  }

  return (
    <section>
      <div
        data-ref="_boardViewport"
        data-signals={`{ vx: ${props.snapshot.x}, vy: ${props.snapshot.y}, vrows: ${props.snapshot.rows}, vcols: ${props.snapshot.cols} }`}
        data-init={initScroll}
        {...scrollAttrs}
        style="height: 72vh; overflow: auto; border: 1px solid #d8d8d8; border-radius: 8px; background: #fff;"
      >
        <div
          style={`position: relative; width: ${BOARD_PIXEL_SIZE}px; height: ${BOARD_PIXEL_SIZE}px;`}
        >
          <BoardRegion snapshot={props.snapshot} />
        </div>
      </div>
    </section>
  )
}

function BoardRegion(props: { snapshot: ViewportSnapshot }) {
  const checked = new Set(props.snapshot.checkedLocal)
  const cells = []

  for (let vr = 0; vr < props.snapshot.rows; vr++) {
    for (let vc = 0; vc < props.snapshot.cols; vc++) {
      const row = props.snapshot.y + vr
      const col = props.snapshot.x + vc
      const localIndex = vr * props.snapshot.cols + vc
      const isChecked = checked.has(localIndex)

      cells.push(
        <input
          key={`${row}:${col}`}
          type="checkbox"
          checked={isChecked}
          title={`(${col}, ${row})`}
          data-on:change={`@post('/toggle/${row}/${col}', { openWhenHidden: true })`}
          style={checkboxStyle}
        />
      )
    }
  }

  const left = props.snapshot.x * CELL_STRIDE_PX
  const top = props.snapshot.y * CELL_STRIDE_PX

  return (
    <section
      {...regionAttrs(REGION_BOARD)}
      style={`position: absolute; left: ${left}px; top: ${top}px; pointer-events: none;`}
    >
      <div
        style={`display: grid; grid-template-columns: repeat(${props.snapshot.cols}, ${CELL_SIZE_PX}px); gap: ${CELL_GAP_PX}px; padding: 4px; background: #fff; border-radius: 4px; pointer-events: all;`}
      >
        {cells}
      </div>
    </section>
  )
}

export function Home(props: { snapshot: ViewportSnapshot }) {
  return (
    <main style="padding: 18px; max-width: 1280px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;">
      <h1 style="margin: 0;">One Billion Checkboxes (Cloudflare)</h1>
      <p style="margin-top: 8px; color: #555;">
        Scroll horizontally and vertically to navigate. Viewport is persisted per tab and synced in
        realtime.
      </p>

      <StatsCard
        checkedCount={props.snapshot.checkedCount}
        x={props.snapshot.x}
        y={props.snapshot.y}
      />
      <ScrollableBoard snapshot={props.snapshot} />
    </main>
  )
}

export function StatsRegion(props: { snapshot: ViewportSnapshot }) {
  return (
    <StatsCard
      checkedCount={props.snapshot.checkedCount}
      x={props.snapshot.x}
      y={props.snapshot.y}
    />
  )
}

export function BoardRegionPatch(props: { snapshot: ViewportSnapshot }) {
  return <BoardRegion snapshot={props.snapshot} />
}

const checkboxStyle = `width: ${CELL_SIZE_PX}px; height: ${CELL_SIZE_PX}px; margin: 0; cursor: pointer; accent-color: #111827; border-radius: 4px;`
