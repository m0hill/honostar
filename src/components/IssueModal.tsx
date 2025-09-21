import type { Label } from '@/types'
import LabelsSection from './LabelsSection'

export default function IssueModal({ labels }: { labels: Label[] }) {
  return (
    <div
      id="modal"
      data-signals-show-modal="false"
      data-show="$showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      data-signals__ifmissing={`{
        "issue": {
          "title": "",
          "description": "",
          "labels": [],
          "newLabel": "",
          "image": null
        }
      }`}
    >
      <div class="w-full max-w-lg bg-gray-800 text-white rounded-lg shadow-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Create Issue</h2>
          <button class="text-gray-400 hover:text-gray-200" data-on-click="$showModal = false">
            ✕
          </button>
        </div>

        <form
          class="space-y-4"
          data-on-submit__prevent="@post('/issues')"
          data-indicator="creating"
        >
          <label class="block">
            <span class="text-sm text-gray-300">Title</span>
            <input
              class="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
              data-bind="issue.title"
              required
            />
          </label>

          <label class="block">
            <span class="text-sm text-gray-300">Description</span>
            <textarea
              class="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
              rows={5}
              data-bind="issue.description"
            ></textarea>
          </label>

          <div>
            <span class="block text-sm text-gray-300 mb-1">Labels</span>
            <div id="labels-section">
              <LabelsSection labels={labels} />
            </div>
          </div>

          <label class="block">
            <span class="text-sm text-gray-300">Image (optional)</span>
            <input
              type="file"
              accept="image/*"
              class="mt-1 block w-full text-gray-300"
              data-bind="issue.image"
            />
          </label>

          <div class="pt-2 flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 bg-gray-700 rounded-md"
              data-on-click="$showModal = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
