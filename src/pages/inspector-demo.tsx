import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createHandler, createPage } from '@/honostar/server'
import { routes } from '@/routes'

const arraySignalTemplateId = 'array-signal-item-template'
const persistedSignalsStorageKey = 'inspector-demo:persisted-signals'
const sessionPersistedStorageKey = 'inspector-demo:persisted-session'
const datastarStorageKey = 'datastar'

const arrayItemsEffect = String.raw`
  (() => {
    const container = el
    const template = document.getElementById('${arraySignalTemplateId}')

    if (!container || !(template instanceof HTMLTemplateElement)) return

    const items = Array.isArray($items) ? $items : []
    const fragment = document.createDocumentFragment()

    items.forEach((item, index) => {
      const instance = template.content.firstElementChild?.cloneNode(true)
      if (!instance) return

      const label = instance.querySelector('[data-array-item-text]')
      if (label) label.textContent = String(item)

      const removeButton = instance.querySelector('[data-array-remove]')
      if (removeButton) {
        removeButton.addEventListener(
          'click',
          () => {
            $items = $items.filter((_, i) => i !== index)
          },
          { once: true }
        )
      }

      fragment.appendChild(instance)
    })

    container.replaceChildren(fragment)
  })()
`

const initPersistedSignalsScript = String.raw`
  (() => {
    const safeParse = value => {
      try {
        return value ? JSON.parse(value) : null
      } catch {
        return null
      }
    }

    try {
      const fromDatastar = safeParse(localStorage?.getItem('${datastarStorageKey}'))
      const fromCustom = safeParse(localStorage?.getItem('${persistedSignalsStorageKey}'))

      const data =
        (fromDatastar && typeof fromDatastar === 'object'
          ? fromDatastar.inspectorDemo ?? fromDatastar
          : null) ??
        (fromCustom && typeof fromCustom === 'object'
          ? fromCustom.inspectorDemo ?? fromCustom
          : null)

      if (!data || typeof data !== 'object') return

      const themes = new Set(['light', 'dark', 'auto'])

      if (typeof data?.theme === 'string' && themes.has(data.theme) && data.theme !== $theme) {
        $theme = data.theme
      }

      if (typeof data?.savedNote === 'string' && data.savedNote !== $savedNote) {
        $savedNote = data.savedNote
      }
    } catch (error) {
      console.warn('Failed to load persisted signals', error)
    }
  })()
`

const syncPersistedSignalsEffect = String.raw`
  (() => {
    const safeParse = value => {
      try {
        return value ? JSON.parse(value) : null
      } catch {
        return null
      }
    }

    const mergePayload = target => {
      const base =
        target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {}
      return {
        ...base,
        inspectorDemo: {
          theme: $theme,
          savedNote: typeof $savedNote === 'string' ? $savedNote : '',
        },
      }
    }

    try {
      const datastarPayload = JSON.stringify(
        mergePayload(safeParse(localStorage?.getItem('${datastarStorageKey}')))
      )
      const customPayload = JSON.stringify(
        mergePayload(safeParse(localStorage?.getItem('${persistedSignalsStorageKey}')))
      )

      localStorage?.setItem('${datastarStorageKey}', datastarPayload)
      localStorage?.setItem('${persistedSignalsStorageKey}', customPayload)
    } catch (error) {
      console.warn('Failed to persist signals', error)
    }
  })()
`

const initSessionSignalsScript = String.raw`
  (() => {
    const safeParse = value => {
      try {
        return value ? JSON.parse(value) : null
      } catch {
        return null
      }
    }

    try {
      const fromDatastar = safeParse(sessionStorage?.getItem('${datastarStorageKey}'))
      const fromCustom = safeParse(sessionStorage?.getItem('${sessionPersistedStorageKey}'))

      const data =
        (fromDatastar && typeof fromDatastar === 'object'
          ? fromDatastar.inspectorDemoSession ?? fromDatastar
          : null) ??
        (fromCustom && typeof fromCustom === 'object'
          ? fromCustom.inspectorDemoSession ?? fromCustom
          : null)

      if (!data || typeof data !== 'object') return

      if (
        typeof data?.sessionMode === 'string' &&
        data.sessionMode !== $sessionMode &&
        ['list', 'grid'].includes(data.sessionMode)
      ) {
        $sessionMode = data.sessionMode
      }

      if (typeof data?.sessionNote === 'string' && data.sessionNote !== $sessionNote) {
        $sessionNote = data.sessionNote
      }
    } catch (error) {
      console.warn('Failed to load session signals', error)
    }
  })()
`

const syncSessionSignalsEffect = String.raw`
  (() => {
    const safeParse = value => {
      try {
        return value ? JSON.parse(value) : null
      } catch {
        return null
      }
    }

    const mergePayload = target => {
      const base =
        target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {}
      return {
        ...base,
        inspectorDemoSession: {
          sessionMode: $sessionMode,
          sessionNote: typeof $sessionNote === 'string' ? $sessionNote : '',
        },
      }
    }

    try {
      const datastarPayload = JSON.stringify(
        mergePayload(safeParse(sessionStorage?.getItem('${datastarStorageKey}')))
      )
      const customPayload = JSON.stringify(
        mergePayload(safeParse(sessionStorage?.getItem('${sessionPersistedStorageKey}')))
      )

      sessionStorage?.setItem('${datastarStorageKey}', datastarPayload)
      sessionStorage?.setItem('${sessionPersistedStorageKey}', customPayload)
    } catch (error) {
      console.warn('Failed to persist session signals', error)
    }
  })()
`

function InspectorDemoPage() {
  return (
    <div class="min-h-screen bg-background text-foreground p-8">
      <div class="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 class="text-4xl font-bold mb-2">Honostar Devtools Demo</h1>
          <p class="text-muted-foreground">
            Click the devtools button in the bottom-right corner to open the devtools and test
            different signal behaviors.
          </p>
        </div>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use This Demo</CardTitle>
            <CardDescription>
              Test various signal patterns and watch them in the inspector
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <ol class="list-decimal list-inside space-y-2 text-sm">
              <li>Click the devtools button in the bottom-right corner to open the devtools</li>
              <li>
                <strong>Signals Tab</strong>: See current values of all signals in real-time
              </li>
              <li>
                <strong>Patches Tab</strong>: Watch the history of signal changes with timestamps
              </li>
              <li>
                <strong>SSE Events Tab</strong>: Monitor network requests (POST, SSE streams)
              </li>
              <li>
                <strong>Persisted Tab</strong>: View signals stored in localStorage/sessionStorage
              </li>
            </ol>
          </CardContent>
        </Card>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Simple Counter */}
          <Card data-signals="{counter: 0}">
            <CardHeader>
              <CardTitle>1. Simple Counter</CardTitle>
              <CardDescription>
                Watch the <code>counter</code> signal update
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="text-center">
                <div class="text-5xl font-bold mb-4" data-text="$counter"></div>
                <div class="flex gap-2 justify-center">
                  <Button data-on:click="$counter--" variant="outline">
                    Decrement
                  </Button>
                  <Button data-on:click="$counter++" variant="default">
                    Increment
                  </Button>
                  <Button data-on:click="$counter = 0" variant="secondary">
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Text Binding */}
          <Card
            data-signals="{message: 'Hello World'}"
            data-computed="{charCount: () => $message.length}"
          >
            <CardHeader>
              <CardTitle>2. Text Binding</CardTitle>
              <CardDescription>
                Watch <code>message</code> signal and computed <code>charCount</code>
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <Label>Type something:</Label>
                <Input data-bind="message" placeholder="Type here..." />
                <div class="text-sm text-muted-foreground">
                  Characters: <span data-text="$charCount"></span>
                </div>
              </div>
              <div class="p-3 bg-muted rounded-md">
                <div class="text-sm font-mono" data-text="$message"></div>
              </div>
            </CardContent>
          </Card>

          {/* Computed Signals */}
          <Card
            data-signals="{firstName: 'John', lastName: 'Doe'}"
            data-computed="{fullName: () => $firstName + ' ' + $lastName}"
          >
            <CardHeader>
              <CardTitle>3. Computed Signals</CardTitle>
              <CardDescription>
                Watch <code>fullName</code> compute from <code>firstName</code> and{' '}
                <code>lastName</code>
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <Label>First Name:</Label>
                <Input data-bind="firstName" />
              </div>
              <div class="space-y-2">
                <Label>Last Name:</Label>
                <Input data-bind="lastName" />
              </div>
              <div class="p-3 bg-primary/10 rounded-md">
                <div class="text-sm">
                  Full Name: <strong data-text="$fullName"></strong>
                </div>
                <div class="text-xs text-muted-foreground mt-2">
                  Note: <code>fullName</code> is a computed signal (read-only, auto-updates)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conditional Display */}
          <Card data-signals="{showSecret: false, secretMessage: 'You found the secret! 🎉'}">
            <CardHeader>
              <CardTitle>4. Conditional Display</CardTitle>
              <CardDescription>
                Toggle <code>showSecret</code> signal
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <Button data-on:click="$showSecret = !$showSecret" variant="outline" class="w-full">
                <span data-text="$showSecret ? 'Hide Secret' : 'Show Secret'"></span>
              </Button>
              <div
                data-show="$showSecret"
                style="display:none"
                class="p-4 bg-green-500/10 border border-green-500 rounded-md text-center"
              >
                <div data-text="$secretMessage"></div>
              </div>
            </CardContent>
          </Card>

          {/* Form Submission (triggers SSE) */}
          <Card>
            <CardHeader>
              <CardTitle>5. Form with SSE</CardTitle>
              <CardDescription>Submit to trigger SSE events (watch SSE Events tab)</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                data-signals="{email: '', submitStatus: ''}"
                data-on:submit__prevent={`$submitStatus = 'Submitting...'; @post('${routes.inspectorDemo.href()}', {contentType: 'json'})`}
                class="space-y-4"
              >
                <div class="space-y-2">
                  <Label>Email:</Label>
                  <Input data-bind="email" type="email" placeholder="test@example.com" required />
                </div>
                <Button type="submit" class="w-full">
                  Submit
                </Button>
                <div
                  data-show="$submitStatus"
                  style="display:none"
                  class="text-sm text-muted-foreground"
                >
                  <div data-text="$submitStatus"></div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Array/Object Signals */}
          <Card data-signals="{items: ['Apple', 'Banana', 'Cherry'], newItem: ''}">
            <CardHeader>
              <CardTitle>6. Array Signals</CardTitle>
              <CardDescription>
                Watch the <code>items</code> array signal update
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <Label>Add Item:</Label>
                <div class="flex gap-2">
                  <Input data-bind="newItem" placeholder="Enter item..." />
                  <Button
                    data-on:click="$newItem && ($items = [...$items, $newItem]) && ($newItem = '')"
                    variant="default"
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div class="space-y-2">
                <div class="text-sm font-semibold">Items:</div>
                <div
                  id="array-signal-items"
                  class="flex flex-wrap gap-2"
                  data-show="$items.length > 0"
                  style="display:none"
                  data-effect={arrayItemsEffect}
                ></div>
                <div
                  data-show="$items.length === 0"
                  style="display:none"
                  class="text-sm text-muted-foreground"
                >
                  No items yet—add something above.
                </div>
              </div>
            </CardContent>
          </Card>
          <template id={arraySignalTemplateId}>
            <Badge variant="secondary" class="items-center gap-1 pr-1">
              <span data-array-item-text></span>
              <button
                type="button"
                data-array-remove
                class="ml-2 rounded-full px-1 text-xs leading-none hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ×
              </button>
            </Badge>
          </template>

          {/* Persisted Signals */}
          <Card
            data-signals="{theme: 'light', savedNote: ''}"
            data-init={initPersistedSignalsScript}
            data-effect={syncPersistedSignalsEffect}
          >
            <CardHeader>
              <CardTitle>7. Persisted Signals (localStorage)</CardTitle>
              <CardDescription>These persist in localStorage (check Persisted tab)</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <Label>Theme:</Label>
                <div class="flex gap-2">
                  <Button
                    data-on:click="$theme = 'light'"
                    variant="outline"
                    data-class:ring-2="$theme === 'light'"
                  >
                    Light
                  </Button>
                  <Button
                    data-on:click="$theme = 'dark'"
                    variant="outline"
                    data-class:ring-2="$theme === 'dark'"
                  >
                    Dark
                  </Button>
                  <Button
                    data-on:click="$theme = 'auto'"
                    variant="outline"
                    data-class:ring-2="$theme === 'auto'"
                  >
                    Auto
                  </Button>
                </div>
                <div class="text-xs text-muted-foreground">
                  Current: <span data-text="$theme"></span>
                </div>
              </div>
              <div class="space-y-2">
                <Label>Saved Note (persists on refresh):</Label>
                <Textarea data-bind="savedNote" placeholder="This will be saved..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Session Persisted Signals */}
          <Card
            data-signals="{sessionMode: 'list', sessionNote: ''}"
            data-init={initSessionSignalsScript}
            data-effect={syncSessionSignalsEffect}
          >
            <CardHeader>
              <CardTitle>8. Session-Persisted Signals</CardTitle>
              <CardDescription>Persists in sessionStorage (clears when tab closes)</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <Label>Layout Preference:</Label>
                <div class="flex gap-2 flex-wrap">
                  <Button
                    data-on:click="$sessionMode = 'list'"
                    variant="outline"
                    data-class:ring-2="$sessionMode === 'list'"
                  >
                    List
                  </Button>
                  <Button
                    data-on:click="$sessionMode = 'grid'"
                    variant="outline"
                    data-class:ring-2="$sessionMode === 'grid'"
                  >
                    Grid
                  </Button>
                </div>
                <div class="text-xs text-muted-foreground">
                  Current mode: <span data-text="$sessionMode"></span>
                </div>
              </div>
              <div class="space-y-2">
                <Label>Session Scratchpad:</Label>
                <Textarea
                  data-bind="sessionNote"
                  placeholder="Clears when the tab closes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Multiple Signals */}
          <Card data-signals="{user: {name: 'Alice', age: 25, active: true}}">
            <CardHeader>
              <CardTitle>9. Nested Object Signals</CardTitle>
              <CardDescription>
                Watch nested <code>user</code> object updates
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label>Name:</Label>
                  <Input data-bind="user.name" />
                </div>
                <div class="space-y-2">
                  <Label>Age:</Label>
                  <Input data-bind="user.age" type="number" />
                </div>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" data-bind="user.active" id="active-check" />
                <Label for="active-check">Active</Label>
              </div>
              <div class="p-3 bg-muted rounded-md">
                <pre class="text-xs" data-text="JSON.stringify($user, null, 2)"></pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Home */}
        <div class="text-center">
          <Button asChild variant="outline">
            <a href={routes.home.href()}>← Back to Home</a>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default createPage({
  component: InspectorDemoPage,
})

const submitSchema = z.object({
  email: z.email(),
})

// Handler for form submission
export const POST = createHandler({
  schema: submitSchema,
  async handler(c, data) {
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 500))

    return c.var.fx.reply([
      [
        'patch-signals',
        {
          submitStatus: `Success! Submitted ${data.email}`,
          email: '',
        },
      ],
    ])
  },
})
