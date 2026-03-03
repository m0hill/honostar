import { DurableObject } from "cloudflare:workers"
import {
  BOARD_SIZE,
  CHUNK_BYTES,
  DEFAULT_VIEW_COLS,
  DEFAULT_VIEW_ROWS,
  bitIndexForCell,
  bitIsSet,
  chunkIdForCell,
  chunkIdsForViewport,
  clamp,
  clampCols,
  clampRows,
  extractViewportFromBody,
  hasAnyBit,
  isPlainRecord,
  maxXForCols,
  maxYForRows,
  setBit,
  toNonNegativeInt,
  type ToggleResult,
  type ViewportSnapshot,
  type ViewportState,
  type ViewportUpdateResult,
} from "./domain"

type StateEnv = Record<string, unknown>

export class BillionCheckboxesState extends DurableObject<StateEnv> {
  private initialized = false

  private ensureSchema(): void {
    if (this.initialized) return

    const sql = this.ctx.storage.sql
    sql.exec("CREATE TABLE IF NOT EXISTS chunks (id INTEGER PRIMARY KEY, bits BLOB NOT NULL)")
    sql.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)")
    sql.exec("INSERT OR IGNORE INTO meta (key, value) VALUES ('checked_count', 0)")
    sql.exec(
      `CREATE TABLE IF NOT EXISTS client_viewports (
        client_id TEXT PRIMARY KEY,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        rows INTEGER NOT NULL DEFAULT ${DEFAULT_VIEW_ROWS},
        cols INTEGER NOT NULL DEFAULT ${DEFAULT_VIEW_COLS},
        updated_at INTEGER NOT NULL
      )`
    )
    this.ensureViewportColumns()

    this.initialized = true
  }

  private ensureViewportColumns(): void {
    const columns = this.ctx.storage.sql
      .exec<{ name: string }>("PRAGMA table_info(client_viewports)")
      .toArray()
    const names = new Set(columns.map((column) => column.name))

    if (!names.has("rows")) {
      this.ctx.storage.sql.exec(
        `ALTER TABLE client_viewports ADD COLUMN rows INTEGER NOT NULL DEFAULT ${DEFAULT_VIEW_ROWS}`
      )
    }

    if (!names.has("cols")) {
      this.ctx.storage.sql.exec(
        `ALTER TABLE client_viewports ADD COLUMN cols INTEGER NOT NULL DEFAULT ${DEFAULT_VIEW_COLS}`
      )
    }
  }

  private normalizeViewport(viewport: ViewportState): ViewportState {
    const rows = clampRows(viewport.rows)
    const cols = clampCols(viewport.cols)

    return {
      x: clamp(Math.floor(viewport.x), 0, maxXForCols(cols)),
      y: clamp(Math.floor(viewport.y), 0, maxYForRows(rows)),
      rows,
      cols,
    }
  }

  private getCheckedCount(): number {
    const row = this.ctx.storage.sql
      .exec<{ value: number }>("SELECT value FROM meta WHERE key = 'checked_count'")
      .toArray()[0]

    return typeof row?.value === "number" ? row.value : 0
  }

  private loadChunkBits(chunkId: number): Uint8Array {
    const row = this.ctx.storage.sql
      .exec<{ bits: ArrayBuffer }>("SELECT bits FROM chunks WHERE id = ?", chunkId)
      .toArray()[0]

    if (!row?.bits) return new Uint8Array(CHUNK_BYTES)

    const bytes = new Uint8Array(row.bits)
    if (bytes.byteLength === CHUNK_BYTES) return bytes

    const normalized = new Uint8Array(CHUNK_BYTES)
    normalized.set(bytes.subarray(0, CHUNK_BYTES))
    return normalized
  }

  private saveChunkBits(chunkId: number, bits: Uint8Array): void {
    const sql = this.ctx.storage.sql
    if (hasAnyBit(bits)) {
      sql.exec(
        "INSERT INTO chunks (id, bits) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET bits = excluded.bits",
        chunkId,
        bits.buffer.slice(0)
      )
      return
    }

    sql.exec("DELETE FROM chunks WHERE id = ?", chunkId)
  }

  private readClientViewport(clientId: string): ViewportState | null {
    const row = this.ctx.storage.sql
      .exec<{ x: number; y: number; rows: number; cols: number }>(
        "SELECT x, y, rows, cols FROM client_viewports WHERE client_id = ?",
        clientId
      )
      .toArray()[0]

    if (!row) return null

    return this.normalizeViewport({
      x: row.x,
      y: row.y,
      rows: row.rows,
      cols: row.cols,
    })
  }

  private writeClientViewport(clientId: string, viewport: ViewportState): void {
    const normalized = this.normalizeViewport(viewport)

    this.ctx.storage.sql.exec(
      "INSERT INTO client_viewports (client_id, x, y, rows, cols, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(client_id) DO UPDATE SET x = excluded.x, y = excluded.y, rows = excluded.rows, cols = excluded.cols, updated_at = excluded.updated_at",
      clientId,
      normalized.x,
      normalized.y,
      normalized.rows,
      normalized.cols,
      Date.now()
    )
  }

  private toggle(row: number, col: number): ToggleResult {
    const chunkId = chunkIdForCell(row, col)
    const bitIndex = bitIndexForCell(row, col)

    const bits = this.loadChunkBits(chunkId)
    const checkedBefore = bitIsSet(bits, bitIndex)
    const checkedAfter = !checkedBefore

    setBit(bits, bitIndex, checkedAfter)
    this.saveChunkBits(chunkId, bits)

    const delta = checkedAfter ? 1 : -1
    this.ctx.storage.sql.exec(
      "UPDATE meta SET value = value + ? WHERE key = 'checked_count'",
      delta
    )

    return {
      row,
      col,
      checked: checkedAfter,
      checkedCount: this.getCheckedCount(),
    }
  }

  private viewport(viewport: ViewportState): ViewportSnapshot {
    const normalized = this.normalizeViewport(viewport)
    const chunkIds = chunkIdsForViewport(
      normalized.x,
      normalized.y,
      normalized.rows,
      normalized.cols
    )
    const chunks = new Map<number, Uint8Array>()

    if (chunkIds.length > 0) {
      const placeholders = chunkIds.map(() => "?").join(",")
      const query = `SELECT id, bits FROM chunks WHERE id IN (${placeholders})`
      const rows = this.ctx.storage.sql
        .exec<{ id: number; bits: ArrayBuffer }>(query, ...chunkIds)
        .toArray()

      for (const row of rows) {
        if (typeof row.id !== "number" || !row.bits) continue
        chunks.set(row.id, new Uint8Array(row.bits))
      }
    }

    const checkedLocal: number[] = []

    for (let vr = 0; vr < normalized.rows; vr++) {
      const row = normalized.y + vr
      if (row >= BOARD_SIZE) continue

      for (let vc = 0; vc < normalized.cols; vc++) {
        const col = normalized.x + vc
        if (col >= BOARD_SIZE) continue

        const chunkId = chunkIdForCell(row, col)
        const bits = chunks.get(chunkId)
        if (!bits) continue

        const bitIndex = bitIndexForCell(row, col)
        if (bitIsSet(bits, bitIndex)) {
          checkedLocal.push(vr * normalized.cols + vc)
        }
      }
    }

    return {
      x: normalized.x,
      y: normalized.y,
      rows: normalized.rows,
      cols: normalized.cols,
      checkedCount: this.getCheckedCount(),
      checkedLocal,
    }
  }

  async fetch(request: Request): Promise<Response> {
    this.ensureSchema()

    const url = new URL(request.url)
    const body = await request.json<unknown>().catch(() => null)

    if (request.method === "POST" && url.pathname === "/toggle") {
      if (!isPlainRecord(body)) return new Response("Invalid body", { status: 400 })

      const row = toNonNegativeInt(body.row)
      const col = toNonNegativeInt(body.col)
      if (row === null || col === null) return new Response("Invalid coordinates", { status: 400 })
      if (row >= BOARD_SIZE || col >= BOARD_SIZE)
        return new Response("Out of range", { status: 400 })

      const result = this.toggle(row, col)
      return new Response(JSON.stringify(result), {
        headers: { "content-type": "application/json" },
      })
    }

    if (request.method === "POST" && url.pathname === "/viewport") {
      const viewport = extractViewportFromBody(body)
      const snapshot = this.viewport(viewport)
      return new Response(JSON.stringify(snapshot), {
        headers: { "content-type": "application/json" },
      })
    }

    if (request.method === "POST" && url.pathname === "/viewport-for-client") {
      if (!isPlainRecord(body) || typeof body.clientId !== "string" || body.clientId.length === 0) {
        return new Response("Missing clientId", { status: 400 })
      }

      const fallbackRows = clampRows(toNonNegativeInt(body.fallbackRows) ?? DEFAULT_VIEW_ROWS)
      const fallbackCols = clampCols(toNonNegativeInt(body.fallbackCols) ?? DEFAULT_VIEW_COLS)
      const fallbackX = clamp(toNonNegativeInt(body.fallbackX) ?? 0, 0, maxXForCols(fallbackCols))
      const fallbackY = clamp(toNonNegativeInt(body.fallbackY) ?? 0, 0, maxYForRows(fallbackRows))
      const normalizedFallback = this.normalizeViewport({
        x: fallbackX,
        y: fallbackY,
        rows: fallbackRows,
        cols: fallbackCols,
      })

      const existing = this.readClientViewport(body.clientId)
      const viewport = existing ?? normalizedFallback
      if (!existing) {
        this.writeClientViewport(body.clientId, viewport)
      }

      const snapshot = this.viewport(viewport)
      return new Response(JSON.stringify(snapshot), {
        headers: { "content-type": "application/json" },
      })
    }

    if (request.method === "POST" && url.pathname === "/set-viewport") {
      if (!isPlainRecord(body) || typeof body.clientId !== "string" || body.clientId.length === 0) {
        return new Response("Missing clientId", { status: 400 })
      }

      const rows = clampRows(toNonNegativeInt(body.rows) ?? DEFAULT_VIEW_ROWS)
      const cols = clampCols(toNonNegativeInt(body.cols) ?? DEFAULT_VIEW_COLS)
      const x = clamp(toNonNegativeInt(body.x) ?? 0, 0, maxXForCols(cols))
      const y = clamp(toNonNegativeInt(body.y) ?? 0, 0, maxYForRows(rows))
      const prev = this.readClientViewport(body.clientId)

      const same =
        prev !== null && prev.x === x && prev.y === y && prev.rows === rows && prev.cols === cols

      if (!same) {
        this.writeClientViewport(body.clientId, { x, y, rows, cols })
      }

      const snapshot = this.viewport({ x, y, rows, cols })
      return new Response(
        JSON.stringify({ changed: !same, snapshot } satisfies ViewportUpdateResult),
        {
          headers: { "content-type": "application/json" },
        }
      )
    }

    return new Response("Not found", { status: 404 })
  }
}
