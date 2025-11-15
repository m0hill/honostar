// src/core/runtime/plugins.ts
function registerRuntimePlugin(name, handler) {
  if (typeof window === 'undefined') return
  if (window.Honostar?.plugins) {
    window.Honostar.plugins.register(name, handler)
    return
  }
  ;(window.__honostarPendingPluginRegistrations ??= []).push({
    name,
    handler,
  })
}

// src/plugins/clipboard.ts
registerRuntimePlugin('clipboard', async (ctx, text) => {
  if (!navigator.clipboard) {
    return ctx.error('Clipboard API not supported in this browser')
  }
  try {
    await navigator.clipboard.writeText(text)
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error('Failed to copy to clipboard'))
  }
})

// src/plugins/focus.ts
registerRuntimePlugin('focus', (ctx, selector) => {
  const target = document.querySelector(selector)
  if (!target) {
    return ctx.error(`Element not found: ${selector}`)
  }
  if (!(target instanceof HTMLElement)) {
    return ctx.error(`Element is not focusable: ${selector}`)
  }
  try {
    target.focus()
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error('Failed to focus element'))
  }
})

// src/plugins/scroll.ts
registerRuntimePlugin('scroll', (ctx, selector, behavior = 'smooth', block = 'start') => {
  const target = document.querySelector(selector)
  if (!target) {
    return ctx.error(`Element not found: ${selector}`)
  }
  try {
    target.scrollIntoView({
      behavior,
      block,
      inline: 'nearest',
    })
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error('Failed to scroll to element'))
  }
})

// src/plugins/toast.ts
var DEFAULT_DURATION = 3000
registerRuntimePlugin('toast', (ctx, message, type = 'info', options = {}) => {
  const container = document.getElementById('toast-container')
  if (!container) {
    return ctx.error(
      'Toast container not found. Add <div id="toast-container"></div> to your layout.'
    )
  }
  const { duration = DEFAULT_DURATION, dismissible = true } = options
  const toast = document.createElement('div')
  toast.className = getToastClasses(type)
  toast.setAttribute('role', 'alert')
  toast.setAttribute('aria-live', 'polite')
  const messageEl = document.createElement('span')
  messageEl.textContent = message
  toast.appendChild(messageEl)
  if (dismissible) {
    const dismissBtn = document.createElement('button')
    dismissBtn.innerHTML = '&times;'
    dismissBtn.className = 'ml-2 font-bold opacity-70 hover:opacity-100'
    dismissBtn.setAttribute('aria-label', 'Dismiss')
    dismissBtn.addEventListener('click', () => removeToast(toast))
    toast.appendChild(dismissBtn)
  }
  container.appendChild(toast)
  requestAnimationFrame(() => {
    toast.style.animation = 'slideIn 0.3s ease-out'
  })
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration)
  }
})
function getToastClasses(type) {
  const base =
    'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-opacity'
  const typeClasses = {
    info: 'bg-blue-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-black',
    error: 'bg-red-500 text-white',
  }
  return `${base} ${typeClasses[type]}`
}
function removeToast(toast) {
  toast.style.animation = 'slideOut 0.3s ease-in'
  setTimeout(() => toast.remove(), 300)
}
if (typeof document !== 'undefined') {
  const styleId = 'honostar-toast-animations'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `
    document.head.appendChild(style)
  }
}
