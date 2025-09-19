import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { join } from 'path'
import * as schema from '@/db/schema'

const sqlite = new Database(join(process.cwd(), 'sqlite.db'), { create: true })

export const db = drizzle({
  client: sqlite,
  schema,
  logger: true,
})
