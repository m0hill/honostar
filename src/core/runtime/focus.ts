export function focusApp(appId = 'app'): void {
  const app = document.getElementById(appId)
  if (!app) return
  if (!app.hasAttribute('tabindex')) app.setAttribute('tabindex', '-1')
  try {
    app.focus({ preventScroll: true })
  } catch {}
}

export function onPageRevealFocusApp(appId = 'app', opts?: { once?: boolean }): void {
  const once = opts?.once !== false
  addEventListener(
    'pagereveal',
    () => {
      focusApp(appId)
    },
    { once }
  )
}
