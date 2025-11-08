import { describe, expect, test } from 'bun:test'
import { route } from './route'

describe('route', () => {
  test('creates simple routes without parameters', () => {
    const routes = route({
      home: '/',
      about: '/about',
      contact: '/contact',
    })

    expect(routes.home.pattern).toBe('/')
    expect(routes.home.href()).toBe('/')

    expect(routes.about.pattern).toBe('/about')
    expect(routes.about.href()).toBe('/about')

    expect(routes.contact.pattern).toBe('/contact')
    expect(routes.contact.href()).toBe('/contact')
  })

  test('creates routes with single parameter', () => {
    const routes = route({
      user: '/users/:id',
      post: '/posts/:slug',
    })

    expect(routes.user.pattern).toBe('/users/:id')
    expect(routes.user.href({ id: 123 })).toBe('/users/123')
    expect(routes.user.href({ id: 'abc' })).toBe('/users/abc')

    expect(routes.post.pattern).toBe('/posts/:slug')
    expect(routes.post.href({ slug: 'hello-world' })).toBe('/posts/hello-world')
  })

  test('creates routes with multiple parameters', () => {
    const routes = route({
      comment: '/posts/:postId/comments/:commentId',
    })

    expect(routes.comment.pattern).toBe('/posts/:postId/comments/:commentId')
    expect(routes.comment.href({ postId: 1, commentId: 42 })).toBe('/posts/1/comments/42')
  })

  test('encodes parameter values', () => {
    const routes = route({
      search: '/search/:query',
    })

    expect(routes.search.href({ query: 'hello world' })).toBe('/search/hello%20world')
    expect(routes.search.href({ query: 'foo/bar' })).toBe('/search/foo%2Fbar')
    expect(routes.search.href({ query: 'a&b=c' })).toBe('/search/a%26b%3Dc')
  })

  test('creates nested route structures', () => {
    const routes = route({
      blog: {
        index: '/blog',
        post: {
          detail: '/blog/:slug',
          comments: '/blog/:slug/comments',
        },
      },
    })

    expect(routes.blog.index.pattern).toBe('/blog')
    expect(routes.blog.index.href()).toBe('/blog')

    expect(routes.blog.post.detail.pattern).toBe('/blog/:slug')
    expect(routes.blog.post.detail.href({ slug: 'my-post' })).toBe('/blog/my-post')

    expect(routes.blog.post.comments.pattern).toBe('/blog/:slug/comments')
    expect(routes.blog.post.comments.href({ slug: 'my-post' })).toBe('/blog/my-post/comments')
  })

  test('throws error when parameter is missing', () => {
    const routes = route({
      user: '/users/:id',
    })

    expect(() =>
      // @ts-expect-error - Testing runtime error for missing param
      routes.user.href({})
    ).toThrow(/Missing param "id"/)

    expect(() =>
      // @ts-expect-error - Testing runtime error for undefined params
      routes.user.href()
    ).toThrow(/requires params but none were provided/)
  })

  test('throws error when calling parameterized route without params', () => {
    const routes = route({
      post: '/posts/:id',
    })

    expect(() =>
      // @ts-expect-error - Testing runtime error
      routes.post.href()
    ).toThrow(/requires params but none were provided/)
  })

  test('handles deeply nested structures', () => {
    const routes = route({
      admin: {
        dashboard: {
          users: {
            list: '/admin/users',
            detail: '/admin/users/:id',
            edit: '/admin/users/:id/edit',
          },
        },
      },
    })

    expect(routes.admin.dashboard.users.list.href()).toBe('/admin/users')
    expect(routes.admin.dashboard.users.detail.href({ id: 5 })).toBe('/admin/users/5')
    expect(routes.admin.dashboard.users.edit.href({ id: 5 })).toBe('/admin/users/5/edit')
  })

  test('handles numeric parameter values', () => {
    const routes = route({
      user: '/users/:id',
    })

    expect(routes.user.href({ id: 123 })).toBe('/users/123')
    expect(routes.user.href({ id: 0 })).toBe('/users/0')
  })

  test('preserves pattern property for route inspection', () => {
    const routes = route({
      user: '/users/:id',
      post: '/posts/:slug',
    })

    // Pattern is accessible for inspection (useful for middleware, route matching, etc.)
    expect(routes.user.pattern).toBe('/users/:id')
    expect(routes.post.pattern).toBe('/posts/:slug')
  })
})
