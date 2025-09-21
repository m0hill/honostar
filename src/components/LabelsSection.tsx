import type { Label } from '@/types'

export default function LabelsSection({ labels }: { labels: Label[] }) {
  return (
    <>
      <div class="flex flex-wrap gap-2">
        {labels.map(l => (
          <label class="inline-flex items-center gap-2" key={l.id}>
            <input type="checkbox" value={String(l.id)} data-bind="issue.labels" />
            <span>{l.name}</span>
          </label>
        ))}
      </div>
      <div class="mt-3 flex gap-2">
        <input
          placeholder="New label"
          class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
          data-bind="issue.newLabel"
        />
        <button
          type="button"
          class="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
          data-on-click="$issue.newLabel && @post('/labels'); $issue.newLabel=''"
        >
          Add
        </button>
      </div>
    </>
  )
}
