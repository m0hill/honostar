import type { Label } from '@/types'
import LabelsSection from './LabelsSection'

export default function IssueModal({ labels }: { labels: Label[] }) {
  return (
    <div
      id="create-issue-modal"
      data-modal
      data-modal-id="create-issue"
      data-signals={`{
        "createIssueModal": { "open": true, "error": "" }
      }`}
      data-signals__ifmissing={`{
        "issue": {
          "title": "",
          "description": "",
          "labels": [],
          "newLabel": "",
          "image": null
        }
      }`}
      data-on:keydown__window="evt.key === 'Escape' && ($createIssueModal.open = false)"
      data-effect="!$createIssueModal.open && window.Bonsai?.modals?.close?.('create-issue')"
    >
      <div
        data-show="$createIssueModal.open"
        style="display:none"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      ></div>

      <div
        data-show="$createIssueModal.open"
        style="display:none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-issue-title"
        tabindex={-1}
        class="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
        data-ref="modalEl"
        data-init="$createIssueModal.open && $modalEl.focus()"
        data-on:click__outside="$createIssueModal.open = false"
      >
        <div class="w-[min(100vw,40rem)] mx-4 sm:mx-0 bg-gray-800 text-white rounded-lg shadow-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 id="create-issue-title" class="text-xl font-semibold">
              Create Issue
            </h2>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-200"
              aria-label="Close"
              data-on:click="$createIssueModal.open = false"
            >
              ✕
            </button>
          </div>

          <form
            class="space-y-4"
            data-on:submit__prevent="$createIssueModal.error = ''; @post('/issues')"
            data-indicator="creating"
          >
            {/* Error message display */}
            <div
              data-show="$createIssueModal.error"
              style="display:none"
              class="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 text-sm"
              role="alert"
            >
              <span data-text="$createIssueModal.error"></span>
            </div>

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
              <LabelsSection labels={labels} />
            </div>

            <label class="block">
              <span class="text-sm text-gray-300">Image (optional)</span>
              <input
                id="image-input"
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
                data-on:click="$createIssueModal.open = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold"
                data-auto-focus
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
