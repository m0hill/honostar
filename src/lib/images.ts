import { mkdir, writeFile } from 'node:fs/promises'
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

function isWebFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File
}

function isDatastarFile(value: unknown): value is DatastarFile {
  if (typeof value !== 'object' || value === null) return false
  if (Array.isArray(value)) return false
  const candidate = value as Partial<DatastarFile>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.contents === 'string' &&
    typeof candidate.mime === 'string'
  )
}

async function saveFileBytes(args: {
  bytes: Uint8Array
  mime: string
  name?: string
}): Promise<string> {
  const extFromMime = args.mime.split('/')[1]
  const extFromName = args.name?.split('.').pop()
  const ext = extFromMime || extFromName || 'jpg'

  const filename = `image_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.${ext}`
  const imagesDir = join(process.cwd(), 'images')
  await mkdir(imagesDir, { recursive: true })
  const filepath = join(imagesDir, filename)
  await writeFile(filepath, args.bytes)
  return `/images/${filename}`
}

/**
 * Saves a base64-encoded image file to disk.
 * Accepts the Datastar file upload format: { name, contents, mime }
 * For single file uploads, Datastar sends the object directly (not in an array).
 */
export async function saveBase64Image(
  fileData: DatastarFile | DatastarFile[] | File | File[] | null
): Promise<string | null> {
  if (!fileData) return null

  // Handle single file (Datastar sends object directly for single file input without 'multiple')
  const file = Array.isArray(fileData) ? fileData[0] : fileData
  if (!file) return null

  // HTML-first fallback: native multipart/form-data uploads arrive as File objects.
  if (isWebFile(file)) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    return await saveFileBytes({ bytes, mime: file.type || 'image/jpeg', name: file.name })
  }

  if (!isDatastarFile(file)) return null

  // Extract base64 data (remove data URL prefix if present)
  const base64Clean = file.contents.replace(/^data:image\/\w+;base64,/, '')

  // Determine file extension from MIME type
  const mime = file.mime
  const filename = file.name

  const buffer = Buffer.from(base64Clean, 'base64')
  return await saveFileBytes({
    bytes: new Uint8Array(buffer),
    mime,
    name: filename,
  })
}
