import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { labels as labelsTable } from '@/db/schema'
import { defineQueryPage } from '@/honostar/server'
import { requireAuth } from '@/lib/auth-middleware'
import { routes } from '@/routes'
import type { Label as LabelType } from '@/types'

function NewIssuePage(props: { labels: LabelType[]; error?: string }) {
  return (
    <div class="min-h-screen bg-background text-foreground flex flex-col items-center pt-10 px-4">
      <div class="max-w-2xl w-full">
        <div class="mb-6">
          <Button asChild variant="link" class="p-0 h-auto">
            <a href={routes.home.href()}>&larr; Back to Issues</a>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle class="text-2xl">Create Issue</CardTitle>
          </CardHeader>
          <CardContent class="space-y-6">
            {props.error ? (
              <div
                class="p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm"
                role="alert"
              >
                {props.error}
              </div>
            ) : null}

            <form
              action={routes.issues.create.href()}
              method="post"
              enctype="multipart/form-data"
              class="space-y-4"
              data-indicator="creating"
              data-signals={JSON.stringify({ issueForm: { error: props.error ?? '' } })}
              data-on:submit__prevent={`$issueForm.error=''; @post('${routes.issues.create.href()}', {contentType: 'form', openWhenHidden: true})`}
            >
              <div
                data-show="$issueForm.error"
                style="display:none"
                class="p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm"
                role="alert"
              >
                <span data-text="$issueForm.error"></span>
              </div>

              <div class="space-y-2">
                <Label for="issue-title">Title</Label>
                <Input id="issue-title" name="issue.title" required />
              </div>

              <div class="space-y-2">
                <Label for="issue-description">Description</Label>
                <Textarea id="issue-description" name="issue.description" rows={6} />
              </div>

              <div class="space-y-2">
                <Label>Labels</Label>
                <div class="flex flex-wrap gap-2">
                  {props.labels.map(l => (
                    <label class="inline-flex items-center gap-2 cursor-pointer" key={l.id}>
                      <input
                        type="checkbox"
                        name="issue.labels"
                        value={String(l.id)}
                        class="rounded border-input"
                      />
                      <span class="text-sm">{l.name}</span>
                    </label>
                  ))}
                </div>
                <div class="mt-3 flex gap-2">
                  <Input placeholder="New label (optional)" name="issue.newLabel" class="flex-1" />
                </div>
              </div>

              <div class="space-y-2">
                <Label for="issue-image">Image (optional)</Label>
                <Input id="issue-image" type="file" accept="image/*" name="issue.image" />
              </div>

              <div class="pt-2 flex justify-end">
                <Button type="submit" data-attr:disabled="$creating">
                  <span data-show="!$creating" style="display:none">
                    Create Issue
                  </span>
                  <span data-show="$creating" style="display:none">
                    Creating...
                  </span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default defineQueryPage({
  use: [requireAuth],
  head: { title: 'New Issue • Honostar' },
  async loader(c) {
    const allLabels = await c.var.db.select().from(labelsTable)
    const error = c.req.query('error')
    return error ? { labels: allLabels, error } : { labels: allLabels }
  },
  component: NewIssuePage,
})
