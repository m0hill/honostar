import type { Label } from '@/types'
import { Button } from './ui/button'
import { Input } from './ui/input'

export default function LabelsSection({ labels }: { labels: Label[] }) {
  return (
    <div id="labels-section">
      <div class="flex flex-wrap gap-2">
        {labels.map(l => (
          <label class="inline-flex items-center gap-2 cursor-pointer" key={l.id}>
            <input
              type="checkbox"
              value={String(l.id)}
              data-bind="issue.labels"
              class="rounded border-input"
            />
            <span class="text-sm">{l.name}</span>
          </label>
        ))}
      </div>
      <div class="mt-3 flex gap-2">
        <Input placeholder="New label" data-bind="issue.newLabel" class="flex-1" />
        <Button
          type="button"
          variant="secondary"
          data-on:click="$issue.newLabel && @post('/labels'); $issue.newLabel = ''"
        >
          Add
        </Button>
      </div>
    </div>
  )
}
