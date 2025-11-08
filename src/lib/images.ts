import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Datastar file upload format (from official docs):
 * Single file: { name: string, contents: string, mime: string }
 * Multiple files: { name: string, contents: string, mime: string }[]
 */
interface DatastarFile {
  name: string
  contents: string // base64 encoded
  mime: string
}

/**
 * Saves a base64-encoded image file to disk.
 * Accepts the Datastar file upload format: { name, contents, mime }
 * For single file uploads, Datastar sends the object directly (not in an array).
 */
export async function saveBase64Image(
  fileData: DatastarFile | DatastarFile[] | null
): Promise<string | null> {
  if (!fileData) return null

  // Handle single file (Datastar sends object directly for single file input without 'multiple')
  const file = Array.isArray(fileData) ? fileData[0] : fileData
  if (!file) return null

  // Extract base64 data (remove data URL prefix if present)
  const base64Clean = file.contents.replace(/^data:image\/\w+;base64,/, '')

  // Determine file extension from MIME type
  const ext = file.mime.split('/')[1] || 'jpg'
  const filename = `image_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.${ext}`
  const filepath = join(process.cwd(), 'images', filename)

  const buffer = Buffer.from(base64Clean, 'base64')
  await writeFile(filepath, buffer)

  return `/images/${filename}`
}
