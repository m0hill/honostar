export function enhanceImages(root?: ParentNode): void {
  const scope = (root ?? document).querySelectorAll<HTMLImageElement>('img')
  scope.forEach(img => {
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy')
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async')
  })
}

export function installImageEnhancements(opts?: { root?: ParentNode; autoStart?: boolean }): void {
  const root = opts?.root
  const autoStart = opts?.autoStart !== false

  const run = () => enhanceImages(root)

  if (!autoStart) {
    return
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        run()
      },
      { once: true }
    )
  } else {
    run()
  }
}
