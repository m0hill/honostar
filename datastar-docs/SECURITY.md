Title: Security Reference

URL Source: https://data-star.dev/reference/security

Markdown Content:
[← Previous](https://data-star.dev/reference/sdks)[](https://data-star.dev/reference/security)
[Datastar expressions](https://data-star.dev/guide/datastar_expressions) are strings that are evaluated in a sandboxed context. This means you can use JavaScript in Datastar expressions.

Escape User Input [#](https://data-star.dev/reference/security#escape-user-input)
---------------------------------------------------------------------------------

The golden rule of security is to never trust user input. This is especially true when using Datastar expressions, which can execute arbitrary JavaScript. When using Datastar expressions, you should always escape user input. This helps prevent, among other issues, Cross-Site Scripting (XSS) attacks.

Avoid Sensitive Data [#](https://data-star.dev/reference/security#avoid-sensitive-data)
---------------------------------------------------------------------------------------

Keep in mind that signal values are visible in the source code in plain text, and can be modified by the user before being sent in requests. For this reason, you should avoid leaking sensitive data in signals and always implement backend validation.

Ignore Unsafe Input [#](https://data-star.dev/reference/security#ignore-unsafe-input)
-------------------------------------------------------------------------------------

If, for some reason, you cannot escape unsafe user input, you should ignore it using the [`data-ignore`](https://data-star.dev/reference/attributes#data-ignore) attribute. This tells Datastar to ignore an element and its descendants when processing DOM nodes.

Content Security Policy [#](https://data-star.dev/reference/security#content-security-policy)
---------------------------------------------------------------------------------------------

When using a [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) (CSP), `unsafe-eval` must be allowed for scripts, since Datastar evaluates expressions using a [`Function()` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function).

Copied!

```
1<meta http-equiv="Content-Security-Policy"
2    content="script-src 'self' 'unsafe-eval';"
3>
```

[← Previous](https://data-star.dev/reference/sdks)[](https://data-star.dev/reference/security)