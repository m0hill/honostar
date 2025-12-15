import type { Label } from '@/types'
import LabelsSection from './LabelsSection'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label as UILabel } from './ui/label'
import { Textarea } from './ui/textarea'

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
      data-effect="!$createIssueModal.open && window.Honostar?.modals?.close?.('create-issue')"
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
        <div class="w-[min(100vw,40rem)] mx-4 sm:mx-0 bg-card text-card-foreground rounded-xl border shadow-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 id="create-issue-title" class="text-xl font-semibold">
              Create Issue
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              data-on:click="$createIssueModal.open = false"
            >
              ✕
            </Button>
          </div>

          <form
            class="space-y-4"
            data-on:submit__prevent="$createIssueModal.error = ''; @post('/issues', {openWhenHidden: true})"
            data-indicator="creating"
          >
            {/* Error message display */}
            <div
              data-show="$createIssueModal.error"
              style="display:none"
              class="p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm"
              role="alert"
            >
              <span data-text="$createIssueModal.error"></span>
            </div>

            <div class="space-y-2">
              <UILabel for="issue-title">Title</UILabel>
              <Input id="issue-title" data-bind="issue.title" required />
            </div>

            <div class="space-y-2">
              <UILabel for="issue-description">Description</UILabel>
              <Textarea id="issue-description" data-bind="issue.description" />
            </div>

            <div class="space-y-2">
              <UILabel>Labels</UILabel>
              <LabelsSection labels={labels} />
            </div>

            <div class="space-y-2">
              <UILabel for="issue-image">Image (optional)</UILabel>
              <Input id="issue-image" type="file" accept="image/*" data-bind="issue.image" />
            </div>

            <div class="pt-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                data-on:click="$createIssueModal.open = false"
              >
                Cancel
              </Button>
              <Button type="submit" data-attr:disabled="$creating" data-auto-focus>
                <span data-show="!$creating">Create Issue</span>
                <span data-show="$creating" style="display:none">
                  Creating...
                </span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
