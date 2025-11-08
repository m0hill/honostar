import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { route } from './route'

describe('route', () => {
  test('creates simple routes without parameters', () => {
    const routes = route({
      home: '/',
      about: '/about',
      contact: '/contact',
    })

    assert.equal(routes.home.pattern, '/')
    assert.equal(routes.home.href(), '/')

    assert.equal(routes.about.pattern, '/about')
    assert.equal(routes.about.href(), '/about')

    assert.equal(routes.contact.pattern, '/contact')
    assert.equal(routes.contact.href(), '/contact')
  })

  test('creates routes with single parameter', () => {
    const routes = route({
      user: '/users/:id',
      post: '/posts/:slug',
    })

    assert.equal(routes.user.pattern, '/users/:id')
    assert.equal(routes.user.href({ id: 123 }), '/users/123')
    assert.equal(routes.user.href({ id: 'abc' }), '/users/abc')

    assert.equal(routes.post.pattern, '/posts/:slug')
    assert.equal(routes.post.href({ slug: 'hello-world' }), '/posts/hello-world')
  })

  test('creates routes with multiple parameters', () => {
    const routes = route({
      comment: '/posts/:postId/comments/:commentId',
    })

    assert.equal(routes.comment.pattern, '/posts/:postId/comments/:commentId')
    assert.equal(routes.comment.href({ postId: 1, commentId: 42 }), '/posts/1/comments/42')
  })

  test('encodes parameter values', () => {
    const routes = route({
      search: '/search/:query',
    })

    assert.equal(routes.search.href({ query: 'hello world' }), '/search/hello%20world')
    assert.equal(routes.search.href({ query: 'foo/bar' }), '/search/foo%2Fbar')
    assert.equal(routes.search.href({ query: 'a&b=c' }), '/search/a%26b%3Dc')
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

    assert.equal(routes.blog.index.pattern, '/blog')
    assert.equal(routes.blog.index.href(), '/blog')

    assert.equal(routes.blog.post.detail.pattern, '/blog/:slug')
    assert.equal(routes.blog.post.detail.href({ slug: 'my-post' }), '/blog/my-post')

    assert.equal(routes.blog.post.comments.pattern, '/blog/:slug/comments')
    assert.equal(routes.blog.post.comments.href({ slug: 'my-post' }), '/blog/my-post/comments')
  })

  test('throws error when parameter is missing', () => {
    const routes = route({
      user: '/users/:id',
    })

    assert.throws(
      // @ts-expect-error - Testing runtime error for missing param
      () => routes.user.href({}),
      /Missing param "id"/
    )

    assert.throws(
      // @ts-expect-error - Testing runtime error for undefined params
      () => routes.user.href(),
      /requires params but none were provided/
    )
  })

  test('throws error when calling parameterized route without params', () => {
    const routes = route({
      post: '/posts/:id',
    })

    assert.throws(
      // @ts-expect-error - Testing runtime error
      () => routes.post.href(),
      /requires params but none were provided/
    )
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

    assert.equal(routes.admin.dashboard.users.list.href(), '/admin/users')
    assert.equal(routes.admin.dashboard.users.detail.href({ id: 5 }), '/admin/users/5')
    assert.equal(routes.admin.dashboard.users.edit.href({ id: 5 }), '/admin/users/5/edit')
  })

  test('handles numeric parameter values', () => {
    const routes = route({
      user: '/users/:id',
    })

    assert.equal(routes.user.href({ id: 123 }), '/users/123')
    assert.equal(routes.user.href({ id: 0 }), '/users/0')
  })

  test('preserves pattern property for route inspection', () => {
    const routes = route({
      user: '/users/:id',
      post: '/posts/:slug',
    })

    // Pattern is accessible for inspection (useful for middleware, route matching, etc.)
    assert.equal(routes.user.pattern, '/users/:id')
    assert.equal(routes.post.pattern, '/posts/:slug')
  })
})
