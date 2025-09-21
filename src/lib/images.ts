import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function saveBase64Image(base64Data: string[]): Promise<string> {
  const base64Clean = base64Data.join('')

  const filename = `image_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.jpg`
  const filepath = join(process.cwd(), 'images', filename)

  const buffer = Buffer.from(base64Clean, 'base64')
  await writeFile(filepath, buffer)

  return `/images/${filename}`
}
