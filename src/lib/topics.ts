export const topics = {
  issues: {
    list: () => 'issues:list',
  },
  labels: {
    list: () => 'labels:list',
  },
  issue: (id: number | string) => ({
    detail: () => `issue:${id}:detail`,
    comments: () => `issue:${id}:comments`,
  }),
}
