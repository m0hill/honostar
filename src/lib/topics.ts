export const topics = {
  issues: {
    list: () => 'issues:list',
  },
  labels: {
    list: () => 'labels:list',
  },
  issue: (id: number | string) => ({
    comments: () => `issue:${id}:comments`,
  }),
}
