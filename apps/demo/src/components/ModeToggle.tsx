import { Button } from '@/components/ui/button'

/**
 * ModeToggle - Theme switcher component
 *
 * Provides a dropdown menu to switch between light, dark, and system theme preferences.
 * Uses the Honostar framework's global theme API for clean, type-safe theme management.
 */
export function ModeToggle() {
  return (
    <div
      class="relative inline-block"
      data-signals__ifmissing={`{
        "modeToggle": {
          "open": false
        }
      }`}
      data-on:keydown__window="evt.key === 'Escape' && ($modeToggle.open = false)"
      data-on:click__outside="$modeToggle.open = false"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Toggle theme"
        aria-haspopup="menu"
        data-attr:aria-expanded="$modeToggle.open"
        data-on:click="$modeToggle.open = !$modeToggle.open"
      >
        <svg
          class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
        <svg
          class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        <span class="sr-only">Toggle theme</span>
      </Button>

      <div
        role="menu"
        data-show="$modeToggle.open"
        style="display:none"
        class="absolute right-0 top-full mt-2 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50"
      >
        <button
          type="button"
          role="menuitem"
          class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          data-on:click="window.Honostar.actions.theme.setLight(); $modeToggle.open = false"
        >
          Light
        </button>
        <button
          type="button"
          role="menuitem"
          class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          data-on:click="window.Honostar.actions.theme.setDark(); $modeToggle.open = false"
        >
          Dark
        </button>
        <button
          type="button"
          role="menuitem"
          class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          data-on:click="window.Honostar.actions.theme.setSystem(); $modeToggle.open = false"
        >
          System
        </button>
      </div>
    </div>
  )
}
