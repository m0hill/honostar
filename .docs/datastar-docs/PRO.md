Title: Datastar Pro Reference

URL Source: https://data-star.dev/reference/datastar_pro

Markdown Content:
[← Previous](https://data-star.dev/reference/actions)[Next →](https://data-star.dev/reference/sse_events)
Datastar Pro adds functionality to the free open source Datastar framework. All pro features are available under a commercial license that helps fund the open source work of [Star Federation](https://data-star.dev/star_federation).

Pricing [#](https://data-star.dev/reference/datastar_pro#pricing)
-----------------------------------------------------------------

Solo

$299

~~$399~~

*   For a **single** developer.
*   Lifetime access to all Pro features.
*   Developer support.

[Buy Now](https://buy.stripe.com/4gM3cu85y1rOeqT4uaaEE00)
Team

$999

~~$1299~~

*   For organisations with **up to 25 employees**.
*   Lifetime access to all Pro features.
*   Developer support.

[Buy Now](https://buy.stripe.com/eVq7sK4Tm5I4dmP8KqaEE02)
Enterprise

*   For organisations with **over 25 employees**.
*   Lifetime access to all Pro features.
*   Dedicated support.
*   Custom licensing and invoicing.

[Contact Sales](mailto:support@starfederation.dev)

License [#](https://data-star.dev/reference/datastar_pro#license)
-----------------------------------------------------------------

Datastar Pro is a **lifetime license** at a **one-time cost**. You can use pro features in any number of projects, and you receive access to updates and any additional pro features that are released in future. By purchasing a license, you are directly supporting the development of the Datastar framework.

### Licensing FAQs [#](https://data-star.dev/reference/datastar_pro#licensing-faqs)

Which license do I need to purchase?
The license you require depends on the entity that will use it:

*   The Solo license is intended for solo developers and freelancers, including small organisations with a **single developer** only.
*   The Team license is intended for organisations with **up to 25 employees**.
*   Any organisation with **over 25 employees** should [contact us](mailto:support@starfederation.dev) to arrange for an Enterprise license. Customers purchasing an Enterprise license can opt in to benefits such as developer training, setup and launch support, custom licensing, and custom payment options.

What restrictions are there on the use of Datastar Pro?
Datastar Pro may be used by the license holder only, with the following restrictions:

*   Redistribution, sublicensing, or making the software available to third parties in any form, outside of an **“end product”**, is strictly prohibited.
*   Making the software available in a public repo is a form of redistribution, and is strictly prohibited.
*   Adding the software to an open-source project is a violation of the license, and is strictly prohibited.
*   Source maps are **not** provided, and may **not** be used in non-development environments. This is to help protect against unintentional redistribution and piracy.

What constitutes allowed and prohibited redistribution of Datastar Pro?
Datastar Pro may be used by the license holder only, on an unlimited number of projects that the license holder **is directly involved in**.

*   Datastar Pro may be distributed in **“end products”** only. In this context, an end product means a finished application, website, or service that uses Datastar Pro internally but does not expose it to others for development or reuse (something you build using Datastar Pro, not something that lets others build with it).
*   Datastar Pro may **not** be distributed to **third parties** in a way that allows them to build using Datastar Pro, as if they themselves were license holders.

Can I use a subset of the features that come with Datastar Pro?
Absolutely! You can build a custom bundle that includes only the plugins you need using the [bundler](https://data-star.dev/bundler).

You can also use the [Datastar Inspector](https://data-star.dev/reference/datastar_pro#datastar-inspector) and [Stellar CSS](https://data-star.dev/reference/datastar_pro#stellar-css) (once available) with or without using the Pro plugins.

Can I upgrade a Solo license to a Team or Enterprise license?
Certainly! Contact us at [support@starfederation.dev](mailto:support@starfederation.dev) from the email address you used to purchase a license and we’ll send you a link to upgrade your license at a discounted price.

Pro Features [#](https://data-star.dev/reference/datastar_pro#pro-features)
---------------------------------------------------------------------------

### Attributes [#](https://data-star.dev/reference/datastar_pro#attributes)

*   [`data-animate`](https://data-star.dev/reference/attributes#data-animate) - Animates element attributes over time.
*   [`data-custom-validity`](https://data-star.dev/reference/attributes#data-custom-validity) - Adds custom validity to an element.
*   [`data-on-raf`](https://data-star.dev/reference/attributes#data-on-raf) - Runs an expression on every animation frame.
*   [`data-on-resize`](https://data-star.dev/reference/attributes#data-on-resize) - Runs an expression on element resize.
*   [`data-persist`](https://data-star.dev/reference/attributes#data-persist) - Persists signals in local storage.
*   [`data-query-string`](https://data-star.dev/reference/attributes#data-query-string) - Syncs query string params with signal values.
*   [`data-replace-url`](https://data-star.dev/reference/attributes#data-replace-url) - Replaces the URL in the browser.
*   [`data-scroll-into-view`](https://data-star.dev/reference/attributes#data-scroll-into-view) - Scrolls an element into view.
*   [`data-view-transition`](https://data-star.dev/reference/attributes#data-view-transition) - Sets `view-transition-name` styles.

### Actions [#](https://data-star.dev/reference/datastar_pro#actions)

*   [`@clipboard()`](https://data-star.dev/reference/actions#clipboard) - Copies text to the clipboard.
*   [`@fit()`](https://data-star.dev/reference/actions#fit) - Linear interpolates a value.

### Bundler [#](https://data-star.dev/reference/datastar_pro#bundler)

The [bundler](https://data-star.dev/bundler) allows you to create custom bundles, including only the plugins you need. This can be useful when you only need a subset of the Datastar framework, or when you want to intentionally restrict what plugins your development team has access to.

![Image 1: Bundler plugins](https://data-star.dev/cdn-cgi/image/format=auto,width=640/static/images/bundler-plugins-60d900cd81549f9f38226a6547264487de5be3595fae1b2cea070491b9ed9931.png)
The bundler also allows you to create a custom aliased bundle, in which the syntax of Datastar attributes becomes `data-{alias}-*`. This can help avoid conflicts with other frameworks that use data attributes.

### Datastar Inspector [#](https://data-star.dev/reference/datastar_pro#datastar-inspector)

The Datastar Inspector is a debugging tool that allows you to inspect and filter current signals, and view signal patch events and SSE events in real-time.

Written as a web component, the Datastar Inspector is useful when developing Datastar applications, and can be used as a starting point for you to build your own custom debugging tools.

![Image 2: Current signals tab](https://data-star.dev/cdn-cgi/image/format=auto,width=640/static/images/datastar-inspector-current-signals-1fb3addf978eb5f852009c61ab305358b57ff57c688c8231a028a28b4e09b545.png)

The current signals tab shows all signal values. Signals can be filtered using regular expressions or wildcard syntax, and viewed in JSON or table format.

![Image 3: Signal patches tab](https://data-star.dev/cdn-cgi/image/format=auto,width=640/static/images/datastar-inspector-signal-patches-bb0788adb09ce129795caec7cf8a284324d362bbe026083ea4067bc528f3acc2.png)

The signal patches tab shows all signal patch events originating from both the frontend and backend.

![Image 4: SSE events tab](https://data-star.dev/cdn-cgi/image/format=auto,width=640/static/images/datastar-inspector-sse-events-06253b7e10a1ea81844e2fecaafaacc980c35085779a63a0aa69c2ae8d6f77ff.png)

The SSE events tab shows all SSE events originating from the backend.

![Image 5: Persisted signals tab](https://data-star.dev/cdn-cgi/image/format=auto,width=640/static/images/datastar-inspector-persisted-signals-b822812857c139fe80a6a88827fce5bfa95af58d0df8e901ba8ec0fdc1c4f589.png)

The persisted signals tab shows all persisted signals on the page, with the ability to filter signals and view in JSON or table format, toggle between local storage and session storage, and clear persisted values.

### Rocket [#](https://data-star.dev/reference/datastar_pro#rocket)

Rocket bridges the gap between Web Components and Datastar’s reactive system, making it easy to create encapsulated, reusable components with reactive data binding.

Traditional Web Components require verbose class definitions and manual DOM management. Rocket eliminates this complexity with a declarative template-based approach:

> Rocket is still a work-in-progress and will become available as a pro feature in the near future.

### Stellar CSS [#](https://data-star.dev/reference/datastar_pro#stellar-css)

Stellar CSS is a lightweight CSS framework that provides a configurable design system in the form of CSS variables with no build step. It replaces the need for frameworks like [Tailwind CSS](https://tailwindcss.com/) that tend to bloat markup with utility classes, and [Open Props](https://open-props.style/) that are non-configurable.

> Stellar CSS is still a work-in-progress (it’s being actively used on this site) and will become available as a pro feature in the future.

[← Previous](https://data-star.dev/reference/actions)[Next →](https://data-star.dev/reference/sse_events)