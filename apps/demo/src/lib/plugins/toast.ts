import { registerRuntimePlugin } from '@honostar/core/client'

/**
 * Toast Plugin
 *
 * Provides a @toast action for showing temporary notification messages.
 * Requires a #toast-container element in your layout.
 *
 * @example
 * ```tsx
 * // In your layout
 * <div id="toast-container" class="fixed bottom-4 right-4 z-50 space-y-2"></div>
 *
 * // Show a toast
 * <button data-on:click="@toast('Settings saved!', 'success')">
 *   Save Settings
 * </button>
 *
 * // Toast types: 'info' | 'success' | 'warning' | 'error'
 * <button data-on:click="@toast('Invalid email', 'error')">
 *   Submit
 * </button>
 * ```
 */

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastOptions {
  duration?: number // milliseconds
  dismissible?: boolean
}

const DEFAULT_DURATION = 3000

registerRuntimePlugin(
  'toast',
  (ctx, message: string, type: ToastType = 'info', options: ToastOptions = {}) => {
    const container = document.getElementById('toast-container')

    if (!container) {
      return ctx.error(
        'Toast container not found. Add <div id="toast-container"></div> to your layout.'
      )
    }

    const { duration = DEFAULT_DURATION, dismissible = true } = options

    // Create toast element
    const toast = document.createElement('div')
    toast.className = getToastClasses(type)
    toast.setAttribute('role', 'alert')
    toast.setAttribute('aria-live', 'polite')

    // Create message
    const messageEl = document.createElement('span')
    messageEl.textContent = message
    toast.appendChild(messageEl)

    // Add dismiss button if dismissible
    if (dismissible) {
      const dismissBtn = document.createElement('button')
      dismissBtn.innerHTML = '&times;'
      dismissBtn.className = 'ml-2 font-bold opacity-70 hover:opacity-100'
      dismissBtn.setAttribute('aria-label', 'Dismiss')
      dismissBtn.addEventListener('click', () => removeToast(toast))
      toast.appendChild(dismissBtn)
    }

    // Add to container with animation
    container.appendChild(toast)

    // Trigger animation
    requestAnimationFrame(() => {
      toast.style.animation = 'slideIn 0.3s ease-out'
    })

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration)
    }
  }
)

function getToastClasses(type: ToastType): string {
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

function removeToast(toast: HTMLElement): void {
  toast.style.animation = 'slideOut 0.3s ease-in'
  setTimeout(() => toast.remove(), 300)
}

// Add CSS animations if not already present
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
