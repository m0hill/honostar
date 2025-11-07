import { route } from '@/core/route'

export const routes = route({
  home: '/',
  auth: {
    login: '/login',
    logout: '/logout',
    profile: '/profile',
    action: '/auth/:action',
  },
  issues: {
    list: '/issues',
    // you can use the same path for GET list and POST create in your app
    create: '/issues',
    show: '/issues/:id',
    comments: '/issues/:id/comments',
  },
  labels: '/labels',
  sse: '/_/events',
})

export type Routes = typeof routes
