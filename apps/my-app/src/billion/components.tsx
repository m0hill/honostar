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
    <section {...regionAttrs(REGION_STATS)} class="billion-stats-container">
      <div class="billion-stats-line">
        <span>Checked:</span>
        <span class="billion-counter">{props.checkedCount.toLocaleString()}</span>
        <span>/ {TOTAL_CELLS.toLocaleString()}</span>
      </div>
      <div class="billion-meta-line">
        <span>
          Viewport: ({props.x.toLocaleString()}, {props.y.toLocaleString()})
        </span>
        <span>
          Board: {BOARD_SIZE.toLocaleString()} x {BOARD_SIZE.toLocaleString()}
        </span>
      </div>
    </section>
  )
}

function ScrollableBoard(props: { snapshot: ViewportSnapshot }) {
  const fitColsExpr = `Math.max(1, Math.floor(($_boardViewport.clientWidth - 12 + ${CELL_GAP_PX}) / ${CELL_STRIDE_PX}))`
  const fitColsFromEventExpr = `Math.max(1, Math.floor((evt.target.clientWidth - 12 + ${CELL_GAP_PX}) / ${CELL_STRIDE_PX}))`

  const initScroll = [
    `$vrows = Math.ceil($_boardViewport.clientHeight / ${CELL_STRIDE_PX}) + ${VIEW_OVERSCAN_ROWS};`,
    `$vcols = ${fitColsExpr} + ${VIEW_OVERSCAN_COLS};`,
    `$_boardViewport.scrollTo(${props.snapshot.x * CELL_STRIDE_PX}, ${props.snapshot.y * CELL_STRIDE_PX});`,
    `$vx = Math.floor($_boardViewport.scrollLeft / ${CELL_STRIDE_PX});`,
    `$vy = Math.floor($_boardViewport.scrollTop / ${CELL_STRIDE_PX});`,
    `@post('/viewport', { contentType: 'json', openWhenHidden: true });`,
  ].join(" ")

  const syncScroll = `$vrows = Math.ceil(evt.target.clientHeight / ${CELL_STRIDE_PX}) + ${VIEW_OVERSCAN_ROWS}; $vcols = ${fitColsFromEventExpr} + ${VIEW_OVERSCAN_COLS}; $vx = Math.floor(evt.target.scrollLeft / ${CELL_STRIDE_PX}); $vy = Math.floor(evt.target.scrollTop / ${CELL_STRIDE_PX}); @post('/viewport', { contentType: 'json', openWhenHidden: true })`

  const scrollAttrs = {
    "data-on:scroll__debounce.80ms": syncScroll,
  }

  return (
    <section class="billion-board-section">
      <div
        data-ref="_boardViewport"
        data-signals={`{ vx: ${props.snapshot.x}, vy: ${props.snapshot.y}, vrows: ${props.snapshot.rows}, vcols: ${props.snapshot.cols} }`}
        data-init={initScroll}
        {...scrollAttrs}
        class="billion-checkbox-container"
      >
        <div
          class="billion-board-canvas"
          style={`width: ${BOARD_PIXEL_SIZE}px; height: ${BOARD_PIXEL_SIZE}px;`}
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
        <label key={`${row}:${col}`} class="billion-custom-checkbox" title={`(${col}, ${row})`}>
          <input
            type="checkbox"
            checked={isChecked}
            data-on:change={`@post('/toggle/${row}/${col}', { openWhenHidden: true })`}
            class="billion-cell-input"
          />
          <span class="billion-checkmark" />
        </label>
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
        class="billion-grid"
        style={`grid-template-columns: repeat(${props.snapshot.cols}, var(--billion-checkbox-size));`}
      >
        {cells}
      </div>
    </section>
  )
}

export function Home(props: { snapshot: ViewportSnapshot }) {
  return (
    <main
      class="billion-app"
      style={`--billion-checkbox-size: ${CELL_SIZE_PX}px; --billion-grid-gap: ${CELL_GAP_PX}px;`}
    >
      <header class="billion-header">
        <h1 class="billion-title">One Billion Checkboxes</h1>
        <p class="billion-subtitle">
          Scroll horizontally and vertically. Viewport is persisted per tab and synced in realtime.
        </p>
        <StatsCard
          checkedCount={props.snapshot.checkedCount}
          x={props.snapshot.x}
          y={props.snapshot.y}
        />
      </header>

      <section class="billion-main">
        <ScrollableBoard snapshot={props.snapshot} />
      </section>
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
