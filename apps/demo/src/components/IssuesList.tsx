import { routes } from "@/generated/routes"
import type { IssueWithAuthor } from "@/types"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"

export default function IssuesList({ issues }: { issues: IssueWithAuthor[] }) {
  return (
    <Card
      id="issues-list"
      class="gap-0 py-0"
      data-honostar-region="issues:list"
      data-honostar-region-kind="list"
    >
      <ul class="divide-y divide-border">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <li key={issue.id}>
              <a
                href={routes.issues.show.href({ id: String(issue.id) })}
                class="block p-4 hover:bg-accent/50 transition-colors"
              >
                <div class="flex items-center space-x-4">
                  <div class="text-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="font-semibold text-lg truncate">{issue.title}</p>
                      <Badge variant={issue.status === "open" ? "secondary" : "outline"}>
                        {issue.status}
                      </Badge>
                    </div>
                    <p class="text-sm text-muted-foreground">
                      #{issue.id} opened by {issue.author.username}
                    </p>
                  </div>
                </div>
              </a>
            </li>
          ))
        ) : (
          <li class="p-4 text-center text-muted-foreground">No issues found.</li>
        )}
      </ul>
    </Card>
  )
}
