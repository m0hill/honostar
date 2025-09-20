export function filePathToRoutePath(filePath: string): string {
  let p = filePath
    .replace(/\\/g, '/')
    .replace(/^.*\/routes\//, '')
    .replace(/\.(tsx|ts|mdx|md)$/, '')

  p = p.replace(/\((.+?)\)/g, '')

  p = p.replace(/\[\.{3}.*\]/g, '*')
  p = p.replace(/\[(.+?)\]/g, ':$1')

  p = p.replace(/\/index$/, '')
  if (p === 'index') p = ''

  p = '/' + p
  p = p.replace(/\/\/+/g, '/')
  return p
}
