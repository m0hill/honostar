export const TOPIC_BOARD = "billion:checkboxes"
export const REGION_BOARD = "billion:board"
export const REGION_STATS = "billion:stats"

export const TOTAL_CELLS = 1_000_000_000
export const BOARD_SIZE = Math.ceil(Math.sqrt(TOTAL_CELLS))

export const CHUNK_SIZE = 32
export const CHUNK_BITS = CHUNK_SIZE * CHUNK_SIZE
export const CHUNK_BYTES = CHUNK_BITS / 8
export const CHUNKS_PER_ROW = Math.ceil(BOARD_SIZE / CHUNK_SIZE)

export const CELL_SIZE_PX = 20
export const CELL_GAP_PX = 2
export const CELL_STRIDE_PX = CELL_SIZE_PX + CELL_GAP_PX

export const DEFAULT_VIEW_ROWS = 36
export const DEFAULT_VIEW_COLS = 72
export const MIN_VIEW_ROWS = 18
export const MIN_VIEW_COLS = 30
export const MAX_VIEW_ROWS = 120
export const MAX_VIEW_COLS = 220
export const VIEW_OVERSCAN_ROWS = 6
export const VIEW_OVERSCAN_COLS = 8

export const BOARD_PIXEL_SIZE = BOARD_SIZE * CELL_STRIDE_PX

export const STATE_OBJECT_NAME = "shared"

export type ViewportSnapshot = {
  x: number
  y: number
  rows: number
  cols: number
  checkedCount: number
  checkedLocal: number[]
}

export type ToggleResult = {
  row: number
  col: number
  checked: boolean
  checkedCount: number
}

export type ViewportUpdateResult = {
  changed: boolean
  snapshot: ViewportSnapshot
}

export type ViewportState = {
  x: number
  y: number
  rows: number
  cols: number
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function toNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value
  if (typeof value !== "string") return null

  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) return null
  return n
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clampRows(value: number): number {
  return clamp(Math.floor(value), MIN_VIEW_ROWS, MAX_VIEW_ROWS)
}

export function clampCols(value: number): number {
  return clamp(Math.floor(value), MIN_VIEW_COLS, MAX_VIEW_COLS)
}

export function maxXForCols(cols: number): number {
  return Math.max(0, BOARD_SIZE - cols)
}

export function maxYForRows(rows: number): number {
  return Math.max(0, BOARD_SIZE - rows)
}

type QueryReader = {
  req: {
    query: (key: string) => string | undefined
  }
}

export function parseViewportQuery(c: QueryReader): { x: number; y: number } {
  const xRaw = toNonNegativeInt(c.req.query("x"))
  const yRaw = toNonNegativeInt(c.req.query("y"))

  return {
    x: clamp(xRaw ?? 0, 0, maxXForCols(DEFAULT_VIEW_COLS)),
    y: clamp(yRaw ?? 0, 0, maxYForRows(DEFAULT_VIEW_ROWS)),
  }
}

export function parseRouteCoord(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  if (parsed < 0) return null
  return parsed
}

export function bitIsSet(bits: Uint8Array, index: number): boolean {
  const byteIndex = index >> 3
  const mask = 1 << (index & 7)
  const byte = bits[byteIndex] ?? 0
  return (byte & mask) !== 0
}

export function setBit(bits: Uint8Array, index: number, checked: boolean): void {
  const byteIndex = index >> 3
  const mask = 1 << (index & 7)
  const byte = bits[byteIndex] ?? 0
  bits[byteIndex] = checked ? byte | mask : byte & ~mask
}

export function hasAnyBit(bits: Uint8Array): boolean {
  for (const value of bits) {
    if (value !== 0) return true
  }
  return false
}

export function chunkIdForCell(row: number, col: number): number {
  const chunkRow = Math.floor(row / CHUNK_SIZE)
  const chunkCol = Math.floor(col / CHUNK_SIZE)
  return chunkRow * CHUNKS_PER_ROW + chunkCol
}

export function bitIndexForCell(row: number, col: number): number {
  const localRow = row % CHUNK_SIZE
  const localCol = col % CHUNK_SIZE
  return localRow * CHUNK_SIZE + localCol
}

export function chunkIdsForViewport(x: number, y: number, rows: number, cols: number): number[] {
  const startChunkX = Math.floor(x / CHUNK_SIZE)
  const endChunkX = Math.floor((x + cols - 1) / CHUNK_SIZE)
  const startChunkY = Math.floor(y / CHUNK_SIZE)
  const endChunkY = Math.floor((y + rows - 1) / CHUNK_SIZE)

  const ids: number[] = []
  for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
    for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
      ids.push(chunkY * CHUNKS_PER_ROW + chunkX)
    }
  }
  return ids
}

export function parseTogglePayload(payload: unknown): { row: number; col: number } | null {
  if (!isPlainRecord(payload)) return null

  const row = toNonNegativeInt(payload.row)
  const col = toNonNegativeInt(payload.col)
  if (row === null || col === null) return null

  return { row, col }
}

export function viewportContains(snapshot: ViewportSnapshot, row: number, col: number): boolean {
  return (
    row >= snapshot.y &&
    row < snapshot.y + snapshot.rows &&
    col >= snapshot.x &&
    col < snapshot.x + snapshot.cols
  )
}

export function extractViewportFromBody(body: unknown): ViewportState {
  if (!isPlainRecord(body)) {
    return {
      x: 0,
      y: 0,
      rows: DEFAULT_VIEW_ROWS,
      cols: DEFAULT_VIEW_COLS,
    }
  }

  const rawX = body.vx ?? body.x
  const rawY = body.vy ?? body.y
  const rawRows = body.vrows ?? body.rows
  const rawCols = body.vcols ?? body.cols

  const rows = clampRows(toNonNegativeInt(rawRows) ?? DEFAULT_VIEW_ROWS)
  const cols = clampCols(toNonNegativeInt(rawCols) ?? DEFAULT_VIEW_COLS)
  const x = clamp(toNonNegativeInt(rawX) ?? 0, 0, maxXForCols(cols))
  const y = clamp(toNonNegativeInt(rawY) ?? 0, 0, maxYForRows(rows))

  return { x, y, rows, cols }
}
