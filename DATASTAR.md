Title: Getting Started Guide

URL Source: https://data-star.dev/guide/getting_started

Markdown Content:
[Next →](https://data-star.dev/guide/reactive_signals)
Datastar simplifies frontend development – allowing you to build backend-driven, interactive UIs using a hypermedia first approach.

> Hypermedia refers to linked content like images, audio, and video – an extension of hypertext (the “H” in HTML and HTTP).

Datastar offers backend-driven reactivity like [htmx](https://htmx.org/) and frontend-driven reactivity like [Alpine.js](https://alpinejs.dev/) in a lightweight framework that doesn’t need any npm packages or other dependencies. It provides two major functions:

1.   Modify the DOM and state by sending events from your backend.
2.   Build reactivity into your frontend using HTML attributes.

Installation [#](https://data-star.dev/guide/getting_started#installation)
--------------------------------------------------------------------------

The quickest way to use Datastar is to include it using a `script` tag that fetches it from a CDN.

Copied!

`1<script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@main/bundles/datastar.js"></script>`

If you prefer to host the file yourself, download the [script](https://cdn.jsdelivr.net/gh/starfederation/datastar@main/bundles/datastar.js) or create your own bundle using the [bundler](https://data-star.dev/bundler), then include it from the appropriate path.

Copied!

`1<script type="module" src="/path/to/datastar.js"></script>`

`data-*`[#](https://data-star.dev/guide/getting_started#data-*)
---------------------------------------------------------------

At the core of Datastar are [data-*](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes) attributes (hence the name). They allow you to add reactivity to your frontend and interact with your backend in a declarative way.

> The Datastar [VSCode extension](https://marketplace.visualstudio.com/items?itemName=starfederation.datastar-vscode)and [IntelliJ plugin](https://plugins.jetbrains.com/plugin/26072-datastar-support)provide autocompletion for all `data-*`attributes.

The [`data-on`](https://data-star.dev/reference/attributes#data-on) attribute can be used to attach an event listener to an element and execute an expression whenever the event is triggered. The value of the attribute is a [Datastar expression](https://data-star.dev/guide/datastar_expressions) in which JavaScript can be used.

Copied!

```
1<button data-on-click="alert('I’m sorry, Dave. I’m afraid I can’t do that.')">
2    Open the pod bay doors, HAL.
3</button>
```

Demo
We’ll explore more data attributes in the [next section of the guide](https://data-star.dev/guide/reactive_signals).

Patching Elements [#](https://data-star.dev/guide/getting_started#patching-elements)
------------------------------------------------------------------------------------

With Datastar, the backend _drives_ the frontend by **patching** (adding, updating and removing) HTML elements in the DOM.

Datastar receives elements from the backend and manipulates the DOM using a morphing strategy (by default). Morphing ensures that only modified parts of the DOM are updated, preserving state and improving performance.

Datastar provides [actions](https://data-star.dev/reference/actions#backend-actions) for sending requests to the backend. The [`@get()`](https://data-star.dev/reference/actions#get) action sends a `GET` request to the provided URL using a browser native [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

Copied!

```
1<button data-on-click="@get('/endpoint')">
2    Open the pod bay doors, HAL.
3</button>
4<div id="hal"></div>
```

> Actions in Datastar are helper functions that have the syntax `@actionName()`. Read more about actions in the [reference](https://data-star.dev/reference/actions).

If the response has a `content-type` of `text/html`, the top-level HTML elements will be morphed into the existing DOM based on the element IDs.

Copied!

```
1<div id="hal">
2    I’m sorry, Dave. I’m afraid I can’t do that.
3</div>
```

We call this a “Patch Elements” event because multiple elements can be patched into the DOM at once.

Demo
`Waiting for an order...`

In the example above, the DOM must contain an element with a `hal` ID in order for morphing to work. Other [patching strategies](https://data-star.dev/reference/sse_events#datastar-patch-elements) are available, but morph is the best and simplest choice in most scenarios.

If the response has a `content-type` of `text/event-stream`, it can contain zero or more [SSE events](https://data-star.dev/reference/sse_events). The example above can be replicated using a `datastar-patch-elements` SSE event.

Copied!

```
1event: datastar-patch-elements
2data: elements <div id="hal">
3data: elements     I’m sorry, Dave. I’m afraid I can’t do that.
4data: elements </div>
```

Because we can send as many events as we want in a stream, and because it can be a long-lived connection, we can extend the example above to first send HAL’s response and then, after a few seconds, reset the text.

Copied!

```
1event: datastar-patch-elements
2data: elements <div id="hal">
3data: elements     I’m sorry, Dave. I’m afraid I can’t do that.
4data: elements </div>
5
6event: datastar-patch-elements
7data: elements <div id="hal">
8data: elements     Waiting for an order...
9data: elements </div>
```

Demo
`Waiting for an order...`

Here’s the code to generate the SSE events above using the SDKs.

Copied!

```
1;; Import the SDK's api and your adapter
 2(require
 3  '[starfederation.datastar.clojure.api :as d*]
 4  '[starfederation.datastar.clojure.adapter.http-kit :refer [->sse-response on-open]])
 5
 6;; in a ring handler
 7(defn handler [request]
 8  ;; Create a SSE response
 9  (->sse-response request
10    {on-open
11      (fn [sse]
12        ;; Merge html fragments into the DOM
13        (d*/patch-elements! sse
14          "<div id=\"hal\">I’m sorry, Dave. I’m afraid I can’t do that.</div>")
15
16        (Thread/sleep 1000)
17
18        (d*/patch-elements! sse
19          "<div id=\"hal\">Waiting for an order...</div>")
20      )
21    }
22  )
23)
```

Copied!

```
1using StarFederation.Datastar.DependencyInjection;
 2
 3// Adds Datastar as a service
 4builder.Services.AddDatastar();
 5
 6app.MapGet("/", async (IDatastarService datastarService) =>
 7{
 8    // Patches elements into the DOM.
 9    await datastarService.PatchElementsAsync(@"<div id=""hal"">I’m sorry, Dave. I’m afraid I can’t do that.</div>");
10
11    await Task.Delay(TimeSpan.FromSeconds(1));
12
13    await datastarService.PatchElementsAsync(@"<div id=""hal"">Waiting for an order...</div>");
14});
```

Copied!

```
1import (
 2    "github.com/starfederation/datastar/sdk/go/datastar"
 3    time
 4)
 5
 6// Creates a new `ServerSentEventGenerator` instance.
 7sse := datastar.NewSSE(w,r)
 8
 9// Patches elements into the DOM.
10sse.PatchElements(
11    `<div id="hal">I’m sorry, Dave. I’m afraid I can’t do that.</div>`
12)
13
14time.Sleep(1 * time.Second)
15
16sse.PatchElements(
17    `<div id="hal">Waiting for an order...</div>`
18)
```

Copied!

```
1import starfederation.datastar.utils.ServerSentEventGenerator;
 2
 3// Creates a new `ServerSentEventGenerator` instance.
 4AbstractResponseAdapter responseAdapter = new HttpServletResponseAdapter(response);
 5ServerSentEventGenerator generator = new ServerSentEventGenerator(responseAdapter);
 6
 7// Patches elements into the DOM.
 8generator.send(PatchElements.builder()
 9    .data("<div id=\"hal\">I’m sorry, Dave. I’m afraid I can’t do that.</div>")
10    .build()
11);
12
13Thread.sleep(1000);
14
15generator.send(PatchElements.builder()
16    .data("<div id=\"hal\">Waiting for an order...</div>")
17    .build()
18);
```

Copied!

```
1use starfederation\datastar\ServerSentEventGenerator;
 2
 3// Creates a new `ServerSentEventGenerator` instance.
 4$sse = new ServerSentEventGenerator();
 5
 6// Patches elements into the DOM.
 7$sse->patchElements(
 8    '<div id="hal">I’m sorry, Dave. I’m afraid I can’t do that.</div>'
 9);
10
11sleep(1)
12
13$sse->patchElements(
14    '<div id="hal">Waiting for an order...</div>'
15);
```

Copied!

```
1from datastar_py import ServerSentEventGenerator as SSE
2from datastar_py.sanic import datastar_response
3
4@app.get('/open-doors')
5@datastar_response
6async def open_doors(request):
7    yield SSE.patch_elements('<div id="hal">I’m sorry, Dave. I’m afraid I can’t do that.</div>')
8    await asyncio.sleep(1)
9    yield SSE.patch_elements('<div id="hal">Waiting for an order...</div>')
```

Copied!

```
1require 'datastar'
 2
 3# Create a Datastar::Dispatcher instance
 4
 5datastar = Datastar.new(request:, response:)
 6
 7# In a Rack handler, you can instantiate from the Rack env
 8# datastar = Datastar.from_rack_env(env)
 9
10# Start a streaming response
11datastar.stream do |sse|
12  # Merges fragment into the DOM
13  sse.patch_elements %(<div id="hal">I’m sorry, Dave. I’m afraid I can’t do that.</div>)
14
15  sleep 1
16
17  sse.patch_elements %(<div id="hal">Waiting for an order...</div>)
18end
```

Copied!

```
1use async_stream::stream;
 2use datastar::prelude::*;
 3use std::thread;
 4use std::time::Duration;
 5
 6Sse(stream! {
 7    // Patches elements into the DOM.
 8    yield PatchElements::new("<div id='hal'>I’m sorry, Dave. I’m afraid I can’t do that.</div>").into();
 9
10    thread::sleep(Duration::from_secs(1));
11
12    yield PatchElements::new("<div id='hal'>Waiting for an order...</div>").into();
13})
```

Copied!

```
1// Creates a new `ServerSentEventGenerator` instance (this also sends required headers)
2ServerSentEventGenerator.stream(req, res, (stream) => {
3    // Patches elements into the DOM.
4    stream.patchElements(`<div id="hal">I’m sorry, Dave. I’m afraid I can’t do that.</div>`);
5
6    setTimeout(() => {
7        stream.patchElements(`<div id="hal">Waiting for an order...</div>`);
8    }, 1000);
9});
```

> In addition to your browser’s dev tools, the [Datastar Inspector](https://data-star.dev/reference/datastar_pro#datastar-inspector)can be used to monitor and inspect SSE events received by Datastar.

We’ll cover event streams and [SSE events](https://data-star.dev/reference/sse_events) in more detail [later in the guide](https://data-star.dev/guide/backend_requests), but as you can see, they are just plain text events with a special syntax, made simpler by the [SDKs](https://data-star.dev/reference/sdks).

[Next →](https://data-star.dev/guide/reactive_signals)

Title: Reactive Signals Guide

URL Source: https://data-star.dev/guide/reactive_signals

Markdown Content:
[← Previous](https://data-star.dev/guide/getting_started)[Next →](https://data-star.dev/guide/datastar_expressions)
In a hypermedia approach, the backend drives state to the frontend and acts as the primary source of truth. It’s up to the backend to determine what actions the user can take next by patching appropriate elements in the DOM.

Sometimes, however, you may need access to frontend state that’s driven by user interactions. Click, input and keydown events are some of the more common user events that you’ll want your frontend to be able to react to.

Datastar uses _signals_ to manage frontend state. You can think of signals as reactive variables that automatically track and propagate changes in and to [Datastar expressions](https://data-star.dev/guide/datastar_expressions). Signals are denoted using the `$` prefix.

Data Attributes [#](https://data-star.dev/guide/reactive_signals#data-attributes)
---------------------------------------------------------------------------------

Datastar allows you to add reactivity to your frontend and interact with your backend in a declarative way using [data-*](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes) attributes.

> The Datastar [VSCode extension](https://marketplace.visualstudio.com/items?itemName=starfederation.datastar-vscode)and [IntelliJ plugin](https://plugins.jetbrains.com/plugin/26072-datastar-support)provide autocompletion for all `data-*`attributes.

### `data-bind`[#](https://data-star.dev/guide/reactive_signals#data-bind)

The [`data-bind`](https://data-star.dev/reference/attributes#data-bind) attribute sets up two-way data binding on any HTML element that receives user input or selections. These include `input`, `textarea`, `select`, `checkbox` and `radio` elements, as well as web components whose value can be made reactive.

Copied!

This creates a new signal that can be called using `$foo`, and binds it to the element’s value. If either is changed, the other automatically updates.

You can accomplish the same thing passing the signal name as a _value_, an alternate syntax that might be more useful for some templating languages:

Copied!

`1<input data-bind="foo" />`

### `data-text`[#](https://data-star.dev/guide/reactive_signals#data-text)

The [`data-text`](https://data-star.dev/reference/attributes#data-text) attribute sets the text content of an element to the value of a signal. The `$` prefix is required to denote a signal.

Copied!

```
1<input data-bind-foo />
2<div data-text="$foo"></div>
```

The value of the `data-text` attribute is a [Datastar expression](https://data-star.dev/guide/datastar_expressions) that is evaluated, meaning that we can use JavaScript in it.

Copied!

```
1<input data-bind-foo />
2<div data-text="$foo.toUpperCase()"></div>
```

### `data-computed`[#](https://data-star.dev/guide/reactive_signals#data-computed)

The [`data-computed`](https://data-star.dev/reference/attributes#data-computed) attribute creates a new signal that is derived from a reactive expression. The computed signal is read-only, and its value is automatically updated when any signals in the expression are updated.

Copied!

```
1<input data-bind-foo />
2<div data-computed-repeated="$foo.repeat(2)" data-text="$repeated"></div>
```

This results in the `$repeated` signal’s value always being equal to the value of the `$foo` signal repeated twice. Computed signals are useful for memoizing expressions containing other signals.

### `data-show`[#](https://data-star.dev/guide/reactive_signals#data-show)

The [`data-show`](https://data-star.dev/reference/attributes#data-show) attribute can be used to show or hide an element based on whether an expression evaluates to `true` or `false`.

Copied!

```
1<input data-bind-foo />
2<button data-show="$foo != ''">Save</button>
```

This results in the button being visible only when the input value is _not_ an empty string. This could also be shortened to `data-show="!$foo"`.

### `data-class`[#](https://data-star.dev/guide/reactive_signals#data-class)

The [`data-class`](https://data-star.dev/reference/attributes#data-class) attribute allows us to add or remove an element’s class based on an expression.

Copied!

```
1<input data-bind-foo />
2<button data-class-success="$foo != ''">
3    Save
4</button>
```

If the expression evaluates to `true`, the `success` class is added to the element; otherwise, it is removed.

The `data-class` attribute can also be used to add or remove multiple classes from an element using a set of key-value pairs, where the keys represent class names and the values represent expressions.

Copied!

```
1<button data-class="{success: $foo != '', 'font-bold': $foo == 'bar'}">
2    Save
3</button>
```

### `data-attr`[#](https://data-star.dev/guide/reactive_signals#data-attr)

The [`data-attr`](https://data-star.dev/reference/attributes#data-attr) attribute can be used to bind the value of any HTML attribute to an expression.

Copied!

```
1<input data-bind-foo />
2<button data-attr-disabled="$foo == ''">
3    Save
4</button>
```

This results in a `disabled` attribute being given the value `true` whenever the input is an empty string.

The `data-attr` attribute can also be used to set the values of multiple attributes on an element using a set of key-value pairs, where the keys represent attribute names and the values represent expressions.

Copied!

`1<button data-attr="{disabled: $foo == '', title: $foo}">Save</button>`

### `data-signals`[#](https://data-star.dev/guide/reactive_signals#data-signals)

Signals are globally accessible from anywhere in the DOM. So far, we’ve created signals on the fly using `data-bind` and `data-computed`. If a signal is used without having been created, it will be created automatically and its value set to an empty string.

Another way to create signals is using the [`data-signals`](https://data-star.dev/reference/attributes#data-signals) attribute, which patches (adds, updates or removes) one or more signals into the existing signals.

Copied!

`1<div data-signals-foo="1"></div>`

Signals can be nested using dot-notation.

Copied!

`1<div data-signals-form.foo="2"></div>`

The `data-signals` attribute can also be used to patch multiple signals using a set of key-value pairs, where the keys represent signal names and the values represent expressions.

Copied!

`1<div data-signals="{foo: 1, form: {foo: 2}}"></div>`

### `data-on`[#](https://data-star.dev/guide/reactive_signals#data-on)

The [`data-on`](https://data-star.dev/reference/attributes#data-on) attribute can be used to attach an event listener to an element and run an expression whenever the event is triggered.

Copied!

```
1<input data-bind-foo />
2<button data-on-click="$foo = ''">
3    Reset
4</button>
```

This results in the `$foo` signal’s value being set to an empty string whenever the button element is clicked. This can be used with any valid event name such as `data-on-keydown`, `data-on-mouseover`, etc. Custom events may also be used.

These are just _some_ of the attributes available in Datastar. For a complete list, see the [attribute reference](https://data-star.dev/reference/attributes).

Frontend Reactivity [#](https://data-star.dev/guide/reactive_signals#frontend-reactivity)
-----------------------------------------------------------------------------------------

Datastar’s data attributes enable declarative signals and expressions, providing a simple yet powerful way to add reactivity to the frontend.

Datastar expressions are strings that are evaluated by Datastar [attributes](https://data-star.dev/reference/attributes) and [actions](https://data-star.dev/reference/actions). While they are similar to JavaScript, there are some important differences that are explained in the [next section of the guide](https://data-star.dev/guide/datastar_expressions).

Copied!

```
1<div data-signals-hal="'...'">
2    <button data-on-click="$hal = 'Affirmative, Dave. I read you.'">
3        HAL, do you read me?
4    </button>
5    <div data-text="$hal"></div>
6</div>
```

Demo
See if you can figure out what the code below does based on what you’ve learned so far, _before_ trying the demo below it.

Copied!

```
1<div
 2    data-signals="{response: '', answer: 'bread'}"
 3    data-computed-correct="$response.toLowerCase() == $answer"
 4>
 5    <div id="question">What do you put in a toaster?</div>
 6    <button data-on-click="$response = prompt('Answer:') ?? ''">BUZZ</button>
 7    <div data-show="$response != ''">
 8        You answered “<span data-text="$response"></span>”.
 9        <span data-show="$correct">That is correct ✅</span>
10        <span data-show="!$correct">
11        The correct answer is “
12        <span data-text="$answer"></span>
13        ” 🤷
14        </span>
15    </div>
16</div>
```

Demo

What do you put in a toaster?

You answered “”. That is correct ✅The correct answer is “bread” 🤷

> The [Datastar Inspector](https://data-star.dev/reference/datastar_pro#datastar-inspector)can be used to inspect and filter current signals and view signal patch events in real-time.

Patching Signals [#](https://data-star.dev/guide/reactive_signals#patching-signals)
-----------------------------------------------------------------------------------

Remember that in a hypermedia approach, the backend drives state to the frontend. Just like with elements, frontend signals can be **patched** (added, updated and removed) from the backend using [backend actions](https://data-star.dev/reference/actions#backend-actions).

Copied!

```
1<div data-signals-hal="'...'">
2    <button data-on-click="@get('/endpoint')">
3        HAL, do you read me?
4    </button>
5    <div data-text="$hal"></div>
6</div>
```

If a response has a `content-type` of `application/json`, the signal values are patched into the frontend signals.

We call this a “Patch Signals” event because multiple signals can be patched (using [JSON Merge Patch RFC 7396](https://datatracker.ietf.org/doc/rfc7396/)) into the existing signals.

Copied!

`1{"hal": "Affirmative, Dave. I read you."}`

Demo
If the response has a `content-type` of `text/event-stream`, it can contain zero or more [SSE events](https://data-star.dev/reference/sse_events). The example above can be replicated using a `datastar-patch-signals` SSE event.

Copied!

```
1event: datastar-patch-signals
2data: signals {hal: 'Affirmative, Dave. I read you.'}
```

Here’s the code to generate the SSE event above using the Go SDK.

Copied!

```
1sse := datastar.NewSSE(writer, request)
2sse.PatchSignals([]byte(`{hal: 'Affirmative, Dave. I read you.'}`))
```

Because we can send as many events as we want in a stream, and because it can be a long-lived connection, we can extend the example above to first set the `hal` signal to an “affirmative” response and then, after a second, reset the signal.

Copied!

```
1event: datastar-patch-signals
2data: signals {hal: 'Affirmative, Dave. I read you.'}
3
4// Wait 1 second
5
6event: datastar-patch-signals
7data: signals {hal: '...'}
```

Demo
Here’s the code to generate the SSE events above using the Go SDK.

Copied!

```
1sse := datastar.NewSSE(writer, request)
2sse.PatchSignals([]byte(`{hal: 'Affirmative, Dave. I read you.'}`))
3time.Sleep(1 * time.Second)
4sse.PatchSignals([]byte(`{hal: '...'}`))
```

> In addition to your browser’s dev tools, the [Datastar Inspector](https://data-star.dev/reference/datastar_pro#datastar-inspector)can be used to monitor and inspect SSE events received by Datastar.

We’ll cover event streams and [SSE events](https://data-star.dev/reference/sse_events) in more detail [later in the guide](https://data-star.dev/guide/backend_requests), but as you can see, they are just plain text events with a special syntax, made simpler by the [SDKs](https://data-star.dev/reference/sdks).

[← Previous](https://data-star.dev/guide/getting_started)[Next →](https://data-star.dev/guide/datastar_expressions)

Title: Datastar Expressions Guide

URL Source: https://data-star.dev/guide/datastar_expressions

Markdown Content:
[← Previous](https://data-star.dev/guide/reactive_signals)[Next →](https://data-star.dev/guide/backend_requests)
Datastar expressions are strings that are evaluated by `data-*` attributes. While they are similar to JavaScript, there are some important differences that make them more powerful for declarative hypermedia applications.

Datastar Expressions [#](https://data-star.dev/guide/datastar_expressions#datastar-expressions)
-----------------------------------------------------------------------------------------------

The following example outputs `1` because we’ve defined `foo` as a signal with the initial value `1`, and are using `$foo` in a `data-*` attribute.

Copied!

```
1<div data-signals-foo="1">
2    <div data-text="$foo"></div>
3</div>
```

A variable `el` is available in every Datastar expression, representing the element that the attribute is attached to.

Copied!

`1<div id="foo" data-text="el.id"></div>`

When Datastar evaluates the expression `$foo`, it first converts it to the signal value, and then evaluates that expression in a sandboxed context. This means that JavaScript can be used in Datastar expressions.

Copied!

`1<div data-text="$foo.length"></div>`

JavaScript operators are also available in Datastar expressions. This includes (but is not limited to) the ternary operator `?:`, the logical OR operator `||`, and the logical AND operator `&&`. These operators are helpful in keeping Datastar expressions terse.

Copied!

```
1// Output one of two values, depending on the truthiness of a signal
 2<div data-text="$landingGearRetracted ? 'Ready' : 'Waiting'"></div>
 3
 4// Show a countdown if the signal is truthy or the time remaining is less than 10 seconds
 5<div data-show="$landingGearRetracted || $timeRemaining < 10">
 6    Countdown
 7</div>
 8
 9// Only send a request if the signal is truthy
10<button data-on-click="$landingGearRetracted && @post('/launch')">
11    Launch
12</button>
```

Multiple statements can be used in a single expression by separating them with a semicolon.

Copied!

```
1<div data-signals-foo="1">
2    <button data-on-click="$landingGearRetracted = true; @post('/launch')">
3        Force launch
4    </button>
5</div>
```

Expressions may span multiple lines, but a semicolon must be used to separate statements. Unlike JavaScript, line breaks alone are not sufficient to separate statements.

Copied!

```
1<div data-signals-foo="1">
2    <button data-on-click="
3        $landingGearRetracted = true;
4        @post('/launch')
5    ">
6        Force launch
7    </button>
8</div>
```

Using JavaScript [#](https://data-star.dev/guide/datastar_expressions#using-javascript)
---------------------------------------------------------------------------------------

Most of your JavaScript logic should go in `data-*` attributes, since reactive signals and actions only work in [Datastar expressions](https://data-star.dev/guide/datastar_expressions).

> Caution: if you find yourself trying to do too much in Datastar expressions, **you are probably overcomplicating it™**.

Any additional JavaScript functionality you require that cannot belong in `data-*` attributes should be extracted out into [external scripts](https://data-star.dev/guide/datastar_expressions#external-scripts) or, better yet, [web components](https://data-star.dev/guide/datastar_expressions#web-components).

> Always encapsulate state and send **props down, events up**.

### External Scripts [#](https://data-star.dev/guide/datastar_expressions#external-scripts)

When using external scripts, pass data into functions via arguments and return a result _or_ listen for custom events dispatched from them **props down, events up**.

In this way, the function is encapsulated – all it knows is that it receives input via an argument, acts on it, and optionally returns a result or dispatches a custom event – and `data-*` attributes can be used to drive reactivity.

Copied!

```
1<div data-signals-result>
2    <input data-bind-foo
3        data-on-input="$result = myfunction($foo)"
4    >
5    <span data-text="$result"></span>
6</div>
```

Copied!

```
1function myfunction(data) {
2    return `You entered: ${data}`;
3}
```

If your function call is asynchronous then it will need to dispatch a custom event containing the result. While asynchronous code _can_ be placed within Datastar expressions, Datastar will _not_ await it.

Copied!

```
1<div data-signals-result>
2    <input data-bind-foo
3           data-on-input="myfunction(el, $foo)"
4           data-on-mycustomevent__window="$result = evt.detail.value"
5    >
6    <span data-text="$result"></span>
7</div>
```

Copied!

```
1async function myfunction(element, data) {
2    const value = await new Promise((resolve) => {
3        setTimeout(() => resolve(`You entered: ${data}`), 1000;
4    });
5    element.dispatchEvent(
6        new CustomEvent('mycustomevent', {detail: {value}})
7    );
8}
```

### Web Components [#](https://data-star.dev/guide/datastar_expressions#web-components)

[Web components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) allow you create reusable, encapsulated, custom elements. They are native to the web and require no external libraries or frameworks. Web components unlock [custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) – HTML tags with custom behavior and styling.

When using web components, pass data into them via attributes and listen for custom events dispatched from them (_props down, events up_).

In this way, the web component is encapsulated – all it knows is that it receives input via an attribute, acts on it, and optionally dispatches a custom event containing the result – and `data-*` attributes can be used to drive reactivity.

Copied!

```
1<div data-signals-result="''">
2    <input data-bind-foo />
3    <my-component
4        data-attr-src="$foo"
5        data-on-mycustomevent="$result = evt.detail.value"
6    ></my-component>
7    <span data-text="$result"></span>
8</div>
```

Copied!

```
1class MyComponent extends HTMLElement {
 2    static get observedAttributes() {
 3        return ['src'];
 4    }
 5
 6    attributeChangedCallback(name, oldValue, newValue) {
 7        const value = `You entered: ${newValue}`;
 8        this.dispatchEvent(
 9            new CustomEvent('mycustomevent', {detail: {value}})
10        );
11    }
12}
13
14customElements.define('my-component', MyComponent);
```

Since the `value` attribute is allowed on web components, it is also possible to use `data-bind` to bind a signal to the web component’s value. Note that a `change` event must be dispatched so that the event listener used by `data-bind` is triggered by the value change.

See a web component in action in the [example](https://data-star.dev/examples/web_component).

Executing Scripts [#](https://data-star.dev/guide/datastar_expressions#executing-scripts)
-----------------------------------------------------------------------------------------

Just like elements and signals, the backend can also send JavaScript to be executed on the frontend using [backend actions](https://data-star.dev/reference/actions#backend-actions).

Copied!

```
1<button data-on-click="@get('/endpoint')">
2    What are you talking about, HAL?
3</button>
```

If a response has a `content-type` of `text/javascript`, the value will be executed as JavaScript in the browser.

Copied!

`1alert('This mission is too important for me to allow you to jeopardize it.')`

Demo
If the response has a `content-type` of `text/event-stream`, it can contain zero or more [SSE events](https://data-star.dev/reference/sse_events). The example above can be replicated by including a `script` tag inside of a `datastar-patch-elements` SSE event.

Copied!

```
1event: datastar-patch-elements
2data: elements <div id="hal">
3data: elements     <script>alert('This mission is too important for me to allow you to jeopardize it.')</script>
4data: elements </div>
```

If you _only_ want to execute a script, you can `append` the script tag to the `body`.

Copied!

```
1event: datastar-patch-elements
2data: mode append
3data: selector body
4data: elements <script>alert('This mission is too important for me to allow you to jeopardize it.')</script>
```

Most SDKs have an `ExecuteScript` helper function for executing a script. Here’s the code to generate the SSE event above using the Go SDK.

Copied!

```
1sse := datastar.NewSSE(writer, request)
2sse.ExecuteScript(`alert('This mission is too important for me to allow you to jeopardize it.')`)
```

Demo
We’ll cover event streams and [SSE events](https://data-star.dev/reference/sse_events) in more detail [later in the guide](https://data-star.dev/guide/backend_requests), but as you can see, they are just plain text events with a special syntax, made simpler by the [SDKs](https://data-star.dev/reference/sdks).

[← Previous](https://data-star.dev/guide/reactive_signals)[Next →](https://data-star.dev/guide/backend_requests)

Title: Backend Requests Guide

URL Source: https://data-star.dev/guide/backend_requests

Markdown Content:
[← Previous](https://data-star.dev/guide/datastar_expressions)
Between [attributes](https://data-star.dev/reference/attributes) and [actions](https://data-star.dev/reference/actions), Datastar provides you with everything you need to build hypermedia-driven applications. Using this approach, the backend drives state to the frontend and acts as the single source of truth, determining what actions the user can take next.

Sending Signals [#](https://data-star.dev/guide/backend_requests#sending-signals)
---------------------------------------------------------------------------------

By default, all signals (except for local signals whose keys begin with an underscore) are sent in an object with every backend request. When using a `GET` request, the signals are sent as a `datastar` query parameter, otherwise they are sent as a JSON body.

By sending **all** signals in every request, the backend has full access to the frontend state. This is by design. It is **not** recommended to send partial signals, but if you must, you can use the [`filterSignals`](https://data-star.dev/reference/actions#filterSignals) option to filter the signals sent to the backend.

### Nesting Signals [#](https://data-star.dev/guide/backend_requests#nesting-signals)

Signals can be nested, making it easier to target signals in a more granular way on the backend.

Using dot-notation:

Copied!

`1<div data-signals-foo.bar="1"></div>`

Using object syntax:

Copied!

`1<div data-signals="{foo: {bar: 1}}"></div>`

Using two-way binding:

Copied!

`1<input data-bind-foo.bar />`

A practical use-case of nested signals is when you have repetition of state on a page. The following example tracks the open/closed state of a menu on both desktop and mobile devices, and the [toggleAll()](https://data-star.dev/reference/actions#toggleAll) action to toggle the state of all menus at once.

Copied!

```
1<div data-signals="{menu: {isOpen: {desktop: false, mobile: false}}}">
2    <button data-on-click="@toggleAll({include: /^menu\.isOpen\./})">
3        Open/close menu
4    </button>
5</div>
```

Reading Signals [#](https://data-star.dev/guide/backend_requests#reading-signals)
---------------------------------------------------------------------------------

To read signals from the backend, JSON decode the `datastar` query param for `GET` requests, and the request body for all other methods.

All [SDKs](https://data-star.dev/reference/sdks) provide a helper function to read signals. Here’s how you would use the Go SDK to read the nested signal `foo.bar` in a request.

Copied!

```
1import ("github.com/starfederation/datastar-go/datastar")
 2
 3type Signals struct {
 4    Foo struct {
 5        Bar string `json:"bar"`
 6    } `json:"foo"`
 7}
 8
 9signals := &Signals{}
10if err := datastar.ReadSignals(request, signals); err != nil {
11    http.Error(w, err.Error(), http.StatusBadRequest)
12    return
13}
```

SSE Events [#](https://data-star.dev/guide/backend_requests#sse-events)
-----------------------------------------------------------------------

Datastar can stream zero or more [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) (SSE) from the web server to the browser. There’s no special backend plumbing required to use SSE, just some special syntax. Fortunately, SSE is straightforward and [provides us with some advantages](https://data-star.dev/essays/event_streams_all_the_way_down), in addition to allowing us to send multiple events in a single response (in contrast to sending `text/html` or `application/json` responses).

First, set up your backend in the language of your choice. Familiarize yourself with [sending SSE events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#sending_events_from_the_server), or use one of the backend [SDKs](https://data-star.dev/reference/sdks) to get up and running even faster. We’re going to use the SDKs in the examples below, which set the appropriate headers and format the events for us.

The following code would exist in a controller action endpoint in your backend.

Copied!

```
1;; Import the SDK's api and your adapter
 2(require
 3  '[starfederation.datastar.clojure.api :as d*]
 4  '[starfederation.datastar.clojure.adapter.http-kit :refer [->sse-response on-open]])
 5
 6
 7;; in a ring handler
 8(defn handler [request]
 9  ;; Create a SSE response
10  (->sse-response request
11   {on-open
12    (fn [sse]
13      ;; Merge html fragments into the DOM
14      (d*/patch-elements! sse
15        "<div id=\"question\">What do you put in a toaster?</div>")
16
17      ;; Merge signals into the signals
18      (d*/patch-signals! sse "{response: '', answer: 'bread'}"))}))
```

Copied!

```
1using StarFederation.Datastar.DependencyInjection;
 2
 3// Adds Datastar as a service
 4builder.Services.AddDatastar();
 5
 6app.MapGet("/", async (IDatastarService datastarService) =>
 7{
 8    // Patches elements into the DOM.
 9    await datastarService.PatchElementsAsync(@"<div id=""question"">What do you put in a toaster?</div>");
10
11    // Merges signals into the signals.
12    await sse.PatchSignalsAsync("{response: '', answer: 'bread'}");
13});
```

Copied!

```
1import ("github.com/starfederation/datastar/sdk/go/datastar")
 2
 3// Creates a new `ServerSentEventGenerator` instance.
 4sse := datastar.NewSSE(w,r)
 5
 6// Patches elements into the DOM.
 7sse.PatchElements(
 8    `<div id="question">What do you put in a toaster?</div>`
 9)
10
11// Merges signals into the signals.
12sse.PatchSignals([]byte(`{response: '', answer: 'bread'}`))
```

Copied!

```
1import starfederation.datastar.utils.ServerSentEventGenerator;
 2
 3// Creates a new `ServerSentEventGenerator` instance.
 4AbstractResponseAdapter responseAdapter = new HttpServletResponseAdapter(response);
 5ServerSentEventGenerator generator = new ServerSentEventGenerator(responseAdapter);
 6
 7// Patches elements into the DOM.
 8generator.send(PatchElements.builder()
 9    .data("<div id=\"question\">What do you put in a toaster?</div>")
10    .build()
11);
12
13generator.send(PatchSignals.builder()
14    .data("{\"response\": \"\", \"answer\": \"\"}")
15    .build()
16);
```

Copied!

```
1use starfederation\datastar\ServerSentEventGenerator;
 2
 3// Creates a new `ServerSentEventGenerator` instance.
 4$sse = new ServerSentEventGenerator();
 5
 6// Patches elements into the DOM.
 7$sse->patchElements(
 8    '<div id="question">What do you put in a toaster?</div>'
 9);
10
11// Merges signals into the signals.
12$sse->PatchSignals(['response' => '', 'answer' => 'bread']);
```

Copied!

```
1from datastar_py import ServerSentEventGenerator as SSE
2from datastar_py.litestar import DatastarResponse
3
4async def endpoint():
5    return DatastarResponse([
6        SSE.patch_elements('<div id="question">What do you put in a toaster?</div>'),
7        SSE.patch_signals({"response": "", "answer": "bread"})
8    ])
```

Copied!

```
1require 'datastar'
 2
 3# Create a Datastar::Dispatcher instance
 4
 5datastar = Datastar.new(request:, response:)
 6
 7# In a Rack handler, you can instantiate from the Rack env
 8# datastar = Datastar.from_rack_env(env)
 9
10# Start a streaming response
11datastar.stream do |sse|
12  # Patches elements into the DOM
13  sse.patch_elements %(<div id="question">What do you put in a toaster?</div>)
14
15  # Patches signals
16  sse.patch_signals(response: '', answer: 'bread')
17end
```

Copied!

```
1use datastar::prelude::*;
 2use async_stream::stream;
 3
 4Sse(stream! {
 5    // Patches elements into the DOM.
 6    yield PatchElements::new("<div id='question'>What do you put in a toaster?</div>").into();
 7
 8    // Merges signals into the signals.
 9    yield PatchSignals::new("{response: '', answer: 'bread'}").into();
10})
```

Copied!

```
1// Creates a new `ServerSentEventGenerator` instance (this also sends required headers)
2ServerSentEventGenerator.stream(req, res, (stream) => {
3      // Patches elements into the DOM.
4     stream.patchElements(`<div id="question">What do you put in a toaster?</div>`);
5
6     // Merges signals into the signals.
7     stream.patchSignals({'response':  '', 'answer': 'bread'});
8});
```

The `PatchElements()` function updates the provided HTML element into the DOM, replacing the element with `id="question"`. An element with the ID `question` must _already_ exist in the DOM.

The `PatchSignals()` function updates the `response` and `answer` signals into the frontend signals.

With our backend in place, we can now use the `data-on-click` attribute to trigger the [`@get()`](https://data-star.dev/reference/actions#get) action, which sends a `GET` request to the `/actions/quiz` endpoint on the server when a button is clicked.

Copied!

```
1<div
 2    data-signals="{response: '', answer: ''}"
 3    data-computed-correct="$response.toLowerCase() == $answer"
 4>
 5    <div id="question"></div>
 6    <button data-on-click="@get('/actions/quiz')">Fetch a question</button>
 7    <button
 8        data-show="$answer != ''"
 9        data-on-click="$response = prompt('Answer:') ?? ''"
10    >
11        BUZZ
12    </button>
13    <div data-show="$response != ''">
14        You answered “<span data-text="$response"></span>”.
15        <span data-show="$correct">That is correct ✅</span>
16        <span data-show="!$correct">
17        The correct answer is “<span data-text="$answer"></span>” 🤷
18        </span>
19    </div>
20</div>
```

Now when the `Fetch a question` button is clicked, the server will respond with an event to modify the `question` element in the DOM and an event to modify the `response` and `answer` signals. We’re driving state from the backend!

Demo

...

You answered “”. That is correct ✅The correct answer is “” 🤷

### `data-indicator`[#](https://data-star.dev/guide/backend_requests#data-indicator)

The [`data-indicator`](https://data-star.dev/reference/attributes#data-indicator) attribute sets the value of a signal to `true` while the request is in flight, otherwise `false`. We can use this signal to show a loading indicator, which may be desirable for slower responses.

Copied!

```
1<div id="question"></div>
2<button
3    data-on-click="@get('/actions/quiz')"
4    data-indicator-fetching
5>
6    Fetch a question
7</button>
8<div data-class-loading="$fetching" class="indicator"></div>
```

Demo

...

![Image 1: Indicator](https://data-star.dev/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

Backend Actions [#](https://data-star.dev/guide/backend_requests#backend-actions)
---------------------------------------------------------------------------------

We’re not limited to sending just `GET` requests. Datastar provides [backend actions](https://data-star.dev/reference/actions#backend-actions) for each of the methods available: `@get()`, `@post()`, `@put()`, `@patch()` and `@delete()`.

Here’s how we can send an answer to the server for processing, using a `POST` request.

Copied!

```
1<button data-on-click="@post('/actions/quiz')">
2    Submit answer
3</button>
```

One of the benefits of using SSE is that we can send multiple events (patch elements and patch signals) in a single response.

Copied!

```
1(d*/patch-elements! sse "<div id=\"question\">...</div>")
2(d*/patch-elements! sse "<div id=\"instructions\">...</div>")
3(d*/patch-signals! sse "{answer: '...', prize: '...'}")
```

Copied!

```
1datastarService.PatchElementsAsync(@"<div id=""question"">...</div>");
2datastarService.PatchElementsAsync(@"<div id=""instructions"">...</div>");
3sse.PatchSignalsAsync("{answer: '...', prize: '...'}");
```

Copied!

```
1sse.PatchElements(`<div id="question">...</div>`)
2sse.PatchElements(`<div id="instructions">...</div>`)
3sse.PatchSignals([]byte(`{answer: '...', prize: '...'}`))
```

Copied!

```
1generator.send(PatchElements.builder()
 2    .data("<div id=\"question\">...</div>")
 3    .build()
 4);
 5generator.send(PatchElements.builder()
 6    .data("<div id=\"instructions\">...</div>")
 7    .build()
 8);
 9generator.send(PatchSignals.builder()
10    .data("{\"answer\": \"...\", \"prize\": \"...\"}")
11    .build()
12);
```

Copied!

```
1$sse->patchElements('<div id="question">...</div>');
2$sse->patchElements('<div id="instructions">...</div>');
3$sse->PatchSignals(['answer' => '...', 'prize' => '...']);
```

Copied!

```
1return DatastarResponse([
2    SSE.patch_elements('<div id="question">...</div>'),
3    SSE.patch_elements('<div id="instructions">...</div>'),
4    SSE.patch_signals({"answer": "...", "prize": "..."})
5])
```

Copied!

```
1datastar.stream do |sse|
2  sse.patch_elements('<div id="question">...</div>')
3  sse.patch_elements('<div id="instructions">...</div>')
4  sse.patch_signals(answer: '...', prize: '...')
5end
```

Copied!

```
1yield PatchElements::new("<div id='question'>...</div>").into()
2yield PatchElements::new("<div id='instructions'>...</div>").into()
3yield PatchSignals::new("{answer: '...', prize: '...'}").into()
```

Copied!

```
1stream.patchElements('<div id="question">...</div>');
2stream.patchElements('<div id="instructions">...</div>');
3stream.patchSignals({'answer': '...', 'prize': '...'});
```

> In addition to your browser’s dev tools, the [Datastar Inspector](https://data-star.dev/reference/datastar_pro#datastar-inspector)can be used to monitor and inspect SSE events received by Datastar.

Read more about SSE events in the [reference](https://data-star.dev/reference/sse_events).

Congratulations [#](https://data-star.dev/guide/backend_requests#congratulations)
---------------------------------------------------------------------------------

You’ve actually read the entire guide! You should now know how to use Datastar to build reactive applications that communicate with the backend using backend requests and SSE events.

Feel free to dive into the [reference](https://data-star.dev/reference) and explore the [examples](https://data-star.dev/examples) next, to learn more about what you can do with Datastar.

[← Previous](https://data-star.dev/guide/datastar_expressions)

Title: Attributes Reference

URL Source: https://data-star.dev/reference/attributes

Markdown Content:
[Next →](https://data-star.dev/reference/actions)
Data attributes have special [casing](https://data-star.dev/reference/attributes#attribute-casing) rules, can be [aliased](https://data-star.dev/reference/attributes#aliasing-attributes) to avoid conflicts with other libraries, can contain [Datastar expressions](https://data-star.dev/reference/attributes#datastar-expressions), and have [runtime error handling](https://data-star.dev/reference/attributes#error-handling).

> The Datastar [VSCode extension](https://marketplace.visualstudio.com/items?itemName=starfederation.datastar-vscode)and [IntelliJ plugin](https://plugins.jetbrains.com/plugin/26072-datastar-support)provide autocompletion for all `data-*`attributes.

### `data-attr`[#](https://data-star.dev/reference/attributes#data-attr)

Sets the value of any HTML attribute to an expression, and keeps it in sync.

Copied!

`1<div data-attr-title="$foo"></div>`

The `data-attr` attribute can also be used to set the values of multiple attributes on an element using a set of key-value pairs, where the keys represent attribute names and the values represent expressions.

Copied!

`1<div data-attr="{title: $foo, disabled: $bar}"></div>`

### `data-bind`[#](https://data-star.dev/reference/attributes#data-bind)

Creates a signal (if one doesn’t already exist) and sets up two-way data binding between it and an element’s value. This means that the value of the element is updated when the signal changes, and the signal is updated when the value of the element changes.

The `data-bind` attribute can be placed on any HTML element on which data can be input or choices selected from (`input`, `select`,`textarea` elements, and web components). Event listeners are added for `change`, `input` and `keydown` events.

Copied!

The signal name can be specified in the key (as above), or in the value (as below). This can be useful depending on the templating language you are using.

Copied!

`1<input data-bind="foo" />`

The initial value of the signal is set to the value of the element, unless a signal has already been defined. So in the example below, `$foo` is set to `bar`.

Copied!

`1<input data-bind-foo value="bar" />`

Whereas in the example below, `$foo` inherits the value `baz` of the predefined signal.

Copied!

```
1<div data-signals-foo="baz">
2    <input data-bind-foo value="bar" />
3</div>
```

Multiple input values can be assigned to a single signal by predefining the signal as an array. So in the example below, `$foo` is set to `['bar', 'baz']` when both checkboxes are checked.

Copied!

```
1<div data-signals-foo="[]">
2    <input data-bind-foo type="checkbox" value="bar" />
3    <input data-bind-foo type="checkbox" value="baz" />
4</div>
```

#### Modifiers

Modifiers allow you to modify behavior when binding signals.

*   `__case` – Converts the casing of the signal name.
    *   `.camel` – Camel case: `mySignal` (default)
    *   `.kebab` – Kebab case: `my-signal`
    *   `.snake` – Snake case: `my_signal`
    *   `.pascal` – Pascal case: `MySignal`

Copied!

`1<input data-bind-my-signal__case.kebab />`

### `data-class`[#](https://data-star.dev/reference/attributes#data-class)

Adds or removes a class to or from an element based on an expression.

Copied!

`1<div data-class-hidden="$foo"></div>`

If the expression evaluates to `true`, the `hidden` class is added to the element; otherwise, it is removed.

The `data-class` attribute can also be used to add or remove multiple classes from an element using a set of key-value pairs, where the keys represent class names and the values represent expressions.

Copied!

`1<div data-class="{hidden: $foo, 'font-bold': $bar}"></div>`

#### Modifiers

Modifiers allow you to modify behavior when defining a class name.

*   `__case` – Converts the casing of the class.
    *   `.camel` – Camel case: `myClass`
    *   `.kebab` – Kebab case: `my-class` (default)
    *   `.snake` – Snake case: `my_class`
    *   `.pascal` – Pascal case: `MyClass`

Copied!

`1<div data-class-my-class__case.camel="$foo"></div>`

### `data-computed`[#](https://data-star.dev/reference/attributes#data-computed)

Creates a signal that is computed based on an expression. The computed signal is read-only, and its value is automatically updated when any signals in the expression are updated.

Copied!

`1<div data-computed-foo="$bar + $baz"></div>`

Computed signals are useful for memoizing expressions containing other signals. Their values can be used in other expressions.

Copied!

```
1<div data-computed-foo="$bar + $baz"></div>
2<div data-text="$foo"></div>
```

> Computed signals must not be used for performing actions (changing other signals, actions, JavaScript functions, etc.). If you need to perform an action in response to a signal change, use the [`data-effect`](https://data-star.dev/reference/attributes#data-effect)attribute.

#### Modifiers

Modifiers allow you to modify behavior when defining computed signals.

*   `__case` – Converts the casing of the signal name.
    *   `.camel` – Camel case: `mySignal` (default)
    *   `.kebab` – Kebab case: `my-signal`
    *   `.snake` – Snake case: `my_signal`
    *   `.pascal` – Pascal case: `MySignal`

Copied!

`1<div data-computed-my-signal__case.kebab="$bar + $baz"></div>`

### `data-effect`[#](https://data-star.dev/reference/attributes#data-effect)

Executes an expression on page load and whenever any signals in the expression change. This is useful for performing side effects, such as updating other signals, making requests to the backend, or manipulating the DOM.

Copied!

`1<div data-effect="$foo = $bar + $baz"></div>`

### `data-ignore`[#](https://data-star.dev/reference/attributes#data-ignore)

Datastar walks the entire DOM and applies plugins to each element it encounters. It’s possible to tell Datastar to ignore an element and its descendants by placing a `data-ignore` attribute on it. This can be useful for preventing naming conflicts with third-party libraries, or when you are unable to [escape user input](https://data-star.dev/reference/security#escape-user-input).

Copied!

```
1<div data-ignore data-show-thirdpartylib="">
2    <div>
3        Datastar will not process this element.
4    </div>
5</div>
```

#### Modifiers

*   `__self` – Only ignore the element itself, not its descendants.

### `data-ignore-morph`[#](https://data-star.dev/reference/attributes#data-ignore-morph)

Similar to the `data-ignore` attribute, the `data-ignore-morph` attribute tells the `PatchElements` watcher to skip processing an element and its children when morphing elements.

Copied!

```
1<div data-ignore-morph>
2    This element will not be morphed.
3</div>
```

> To remove the `data-ignore-morph`attribute from an element, simply patch the element with the `data-ignore-morph`attribute removed.

### `data-indicator`[#](https://data-star.dev/reference/attributes#data-indicator)

Creates a signal and sets its value to `true` while an SSE request is in flight, otherwise `false`. The signal can be used to show a loading indicator.

Copied!

```
1<button data-on-click="@get('/endpoint')"
2        data-indicator-fetching
3></button>
```

This can be useful for showing a loading spinner, disabling a button, etc.

Copied!

```
1<button data-on-click="@get('/endpoint')"
2        data-indicator-fetching
3        data-attr-disabled="$fetching"
4></button>
5<div data-show="$fetching">Loading...</div>
```

The signal name can be specified in the key (as above), or in the value (as below). This can be useful depending on the templating language you are using.

Copied!

`1<button data-indicator="fetching"></button>`

#### Modifiers

Modifiers allow you to modify behavior when defining indicator signals.

*   `__case` – Converts the casing of the signal name.
    *   `.camel` – Camel case: `mySignal` (default)
    *   `.kebab` – Kebab case: `my-signal`
    *   `.snake` – Snake case: `my_signal`
    *   `.pascal` – Pascal case: `MySignal`

### `data-json-signals`[#](https://data-star.dev/reference/attributes#data-json-signals)

Sets the text content of an element to a reactive JSON stringified version of signals. Useful when troubleshooting an issue.

Copied!

```
1<!-- Display all signals -->
2<pre data-json-signals></pre>
```

You can optionally provide a filter object to include or exclude specific signals using regular expressions.

Copied!

```
1<!-- Only show signals that include "user" in their path -->
2<pre data-json-signals="{include: /user/}"></pre>
3
4<!-- Show all signals except those ending with "temp" -->
5<pre data-json-signals="{exclude: /temp$/}"></pre>
6
7<!-- Combine include and exclude filters -->
8<pre data-json-signals="{include: /^app/, exclude: /password/}"></pre>
```

#### Modifiers

Modifiers allow you to modify the output format.

*   `__terse` – Outputs a more compact JSON format without extra whitespace. Useful for displaying filtered data inline.

Copied!

```
1<!-- Display filtered signals in a compact format -->
2<pre data-json-signals__terse="{include: /counter/}"></pre>
```

### `data-on`[#](https://data-star.dev/reference/attributes#data-on)

Attaches an event listener to an element, executing an expression whenever the event is triggered.

Copied!

`1<button data-on-click="$foo = ''">Reset</button>`

An `evt` variable that represents the event object is available in the expression.

Copied!

`1<div data-on-myevent="$foo = evt.detail"></div>`

The `data-on` attribute works with [events](https://developer.mozilla.org/en-US/docs/Web/Events) and [custom events](https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events). The `data-on-submit` event listener prevents the default submission behavior of forms.

> Events listeners are only triggered when the event is [trusted](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted). This behavior can be bypassed using the `__trusted`modifier.

#### Modifiers

Modifiers allow you to modify behavior when events are triggered. Some modifiers have tags to further modify the behavior.

*   `__once` * – Only trigger the event listener once.
*   `__passive` * – Do not call `preventDefault` on the event listener.
*   `__capture` * – Use a capture event listener.
*   `__case` – Converts the casing of the event.
    *   `.camel` – Camel case: `myEvent`
    *   `.kebab` – Kebab case: `my-event` (default)
    *   `.snake` – Snake case: `my_event`
    *   `.pascal` – Pascal case: `MyEvent`

*   `__delay` – Delay the event listener.
    *   `.500ms` – Delay for 500 milliseconds (accepts any integer).
    *   `.1s` – Delay for 1 second (accepts any integer).

*   `__debounce` – Debounce the event listener.
    *   `.500ms` – Debounce for 500 milliseconds (accepts any integer).
    *   `.1s` – Debounce for 1 second (accepts any integer).
    *   `.leading` – Debounce with leading edge.
    *   `.notrail` – Debounce without trailing edge.

*   `__throttle` – Throttle the event listener.
    *   `.500ms` – Throttle for 500 milliseconds (accepts any integer).
    *   `.1s` – Throttle for 1 second (accepts any integer).
    *   `.noleading` – Throttle without leading edge.
    *   `.trail` – Throttle with trailing edge.

*   `__viewtransition` – Wraps the expression in `document.startViewTransition()` when the View Transition API is available.
*   `__window` – Attaches the event listener to the `window` element.
*   `__outside` – Triggers when the event is outside the element.
*   `__prevent` – Calls `preventDefault` on the event listener.
*   `__stop` – Calls `stopPropagation` on the event listener.
*   `__trusted` – Runs the expression even if the [`isTrusted`](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted) property on the event is `false`.

_* Only works with built-in events._

Copied!

```
1<button data-on-click__window__debounce.500ms.leading="$foo = ''"></button>
2<div data-on-my-event__case.camel__trusted="$foo = ''"></div>
```

### `data-on-intersect`[#](https://data-star.dev/reference/attributes#data-on-intersect)

Runs an expression when the element intersects with the viewport.

Copied!

`1<div data-on-intersect="$intersected = true"></div>`

#### Modifiers

Modifiers allow you to modify the element intersection behavior and the timing of the event listener.

*   `__once` – Only triggers the event once.
*   `__half` – Triggers when half of the element is visible.
*   `__full` – Triggers when the full element is visible.
*   `__delay` – Delay the event listener.
    *   `.500ms` – Delay for 500 milliseconds (accepts any integer).
    *   `.1s` – Delay for 1 second (accepts any integer).

*   `__debounce` – Debounce the event listener.
    *   `.500ms` – Debounce for 500 milliseconds (accepts any integer).
    *   `.1s` – Debounce for 1 second (accepts any integer).
    *   `.leading` – Debounce with leading edge.
    *   `.notrail` – Debounce without trailing edge.

*   `__throttle` – Throttle the event listener.
    *   `.500ms` – Throttle for 500 milliseconds (accepts any integer).
    *   `.1s` – Throttle for 1 second (accepts any integer).
    *   `.noleading` – Throttle without leading edge.
    *   `.trail` – Throttle with trailing edge.

*   `__viewtransition` – Wraps the expression in `document.startViewTransition()` when the View Transition API is available.

Copied!

`1<div data-on-intersect__once__full="$fullyIntersected = true"></div>`

### `data-on-interval`[#](https://data-star.dev/reference/attributes#data-on-interval)

Runs an expression at a regular interval. The interval duration defaults to one second and can be modified using the `__duration` modifier.

Copied!

`1<div data-on-interval="$count++"></div>`

#### Modifiers

Modifiers allow you to modify the interval duration.

*   `__duration` – Sets the interval duration.
    *   `.500ms` – Interval duration of 500 milliseconds (accepts any integer).
    *   `.1s` – Interval duration of 1 second (default).
    *   `.leading` – Execute the first interval immediately.

*   `__viewtransition` – Wraps the expression in `document.startViewTransition()` when the View Transition API is available.

Copied!

`1<div data-on-interval__duration.500ms="$count++"></div>`

### `data-on-load`[#](https://data-star.dev/reference/attributes#data-on-load)

Runs an expression when the element is loaded into the DOM.

Copied!

`1<div data-on-load="$count = 1"></div>`

#### Modifiers

Modifiers allow you to add a delay to the event listener.

*   `__delay` – Delay the event listener.
    *   `.500ms` – Delay for 500 milliseconds (accepts any integer).
    *   `.1s` – Delay for 1 second (accepts any integer).

*   `__viewtransition` – Wraps the expression in `document.startViewTransition()` when the View Transition API is available.

Copied!

`1<div data-on-load__delay.500ms="$count = 1"></div>`

### `data-on-signal-patch`[#](https://data-star.dev/reference/attributes#data-on-signal-patch)

Runs an expression whenever one or more signals are patched. This is useful for tracking changes, updating computed values, or triggering side effects when data updates.

Copied!

`1<div data-on-signal-patch="console.log('A signal changed!')"></div>`

The `patch` variable is available in the expression and contains the signal patch details.

Copied!

`1<div data-on-signal-patch="console.log('Signal patch:', patch)"></div>`

You can filter which signals to watch using the [`data-on-signal-patch-filter`](https://data-star.dev/reference/attributes#data-on-signal-patch-filter) attribute.

#### Modifiers

Modifiers allow you to modify the timing of the event listener.

*   `__delay` – Delay the event listener.
    *   `.500ms` – Delay for 500 milliseconds (accepts any integer).
    *   `.1s` – Delay for 1 second (accepts any integer).

*   `__debounce` – Debounce the event listener.
    *   `.500ms` – Debounce for 500 milliseconds (accepts any integer).
    *   `.1s` – Debounce for 1 second (accepts any integer).
    *   `.leading` – Debounce with leading edge.
    *   `.notrail` – Debounce without trailing edge.

*   `__throttle` – Throttle the event listener.
    *   `.500ms` – Throttle for 500 milliseconds (accepts any integer).
    *   `.1s` – Throttle for 1 second (accepts any integer).
    *   `.noleading` – Throttle without leading edge.
    *   `.trail` – Throttle with trailing edge.

Copied!

`1<div data-on-signal-patch__debounce.500ms="doSomething()"></div>`

### `data-on-signal-patch-filter`[#](https://data-star.dev/reference/attributes#data-on-signal-patch-filter)

Filters which signals to watch when using the [`data-on-signal-patch`](https://data-star.dev/reference/attributes#data-on-signal-patch) attribute.

The `data-on-signal-patch-filter` attribute accepts an object with `include` and/or `exclude` properties that are regular expressions.

Copied!

```
1<!-- Only react to counter signal changes -->
2<div data-on-signal-patch-filter="{include: /^counter$/}"></div>
3
4<!-- React to all changes except those ending with "changes" -->
5<div data-on-signal-patch-filter="{exclude: /changes$/}"></div>
6
7<!-- Combine include and exclude filters -->
8<div data-on-signal-patch-filter="{include: /user/, exclude: /password/}"></div>
```

### `data-preserve-attr`[#](https://data-star.dev/reference/attributes#data-preserve-attr)

Preserves the value of an attribute when morphing DOM elements.

Copied!

```
1<details open data-preserve-attr="open">
2    <summary>Title</summary>
3    Content
4</details>
```

You can preserve multiple attributes by separating them with a space.

Copied!

```
1<details open class="foo" data-preserve-attr="open class">
2    <summary>Title</summary>
3    Content
4</details>
```

### `data-ref`[#](https://data-star.dev/reference/attributes#data-ref)

Creates a new signal that is a reference to the element on which the data attribute is placed.

Copied!

`1<div data-ref-foo></div>`

The signal name can be specified in the key (as above), or in the value (as below). This can be useful depending on the templating language you are using.

Copied!

`1<div data-ref="foo"></div>`

The signal value can then be used to reference the element.

Copied!

`1$foo is a reference to a <span data-text="$foo.tagName"></span> element`

#### Modifiers

Modifiers allow you to modify behavior when defining references.

*   `__case` – Converts the casing of the key.
    *   `.camel` – Camel case: `myKey`
    *   `.kebab` – Kebab case: `my-key` (default)
    *   `.snake` – Snake case: `my_key`
    *   `.pascal` – Pascal case: `MyKey`

Copied!

`1<div data-ref-my-signal__case.kebab></div>`

### `data-show`[#](https://data-star.dev/reference/attributes#data-show)

Shows or hides an element based on whether an expression evaluates to `true` or `false`. For anything with custom requirements, use [`data-class`](https://data-star.dev/reference/attributes#data-class) instead.

Copied!

`1<div data-show="$foo"></div>`

To prevent flickering of the element before Datastar has processed the DOM, you can add a `display: none` style to the element to hide it initially.

Copied!

`1<div data-show="$foo" style="display: none"></div>`

### `data-signals`[#](https://data-star.dev/reference/attributes#data-signals)

Patches (adds, updates or removes) one or more signals into the existing signals. Values defined later in the DOM tree override those defined earlier.

Copied!

`1<div data-signals-foo="1"></div>`

Signals can be nested using dot-notation.

Copied!

`1<div data-signals-foo.bar="1"></div>`

The `data-signals` attribute can also be used to patch multiple signals using a set of key-value pairs, where the keys represent signal names and the values represent expressions.

Copied!

`1<div data-signals="{foo: {bar: 1, baz: 2}}"></div>`

The value above is written in JavaScript object notation, but JSON, which is a subset and which most templating languages have built-in support for, is also allowed.

Setting a signal’s value to `null` will remove the signal.

Copied!

`1<div data-signals="{foo: null}"></div>`

Keys used in `data-signals-*` are converted to camel case, so the signal name `mySignal` must be written as `data-signals-my-signal` or `data-signals="{mySignal: 1}"`.

Signals beginning with an underscore are _not_ included in requests to the backend by default. You can opt to include them by modifying the value of the [`filterSignals`](https://data-star.dev/reference/actions#filterSignals) option.

> Signal names cannot begin with nor contain a double underscore (`__`), due to its use as a modifier delimiter.

#### Modifiers

Modifiers allow you to modify behavior when patching signals.

*   `__case` – Converts the casing of the signal name.
    *   `.camel` – Camel case: `mySignal` (default)
    *   `.kebab` – Kebab case: `my-signal`
    *   `.snake` – Snake case: `my_signal`
    *   `.pascal` – Pascal case: `MySignal`

*   `__ifmissing` Only patches signals if their keys do not already exist. This is useful for setting defaults without overwriting existing values.

Copied!

```
1<div data-signals-my-signal__case.kebab="1"
2     data-signals-foo__ifmissing="1"
3></div>
```

### `data-style`[#](https://data-star.dev/reference/attributes#data-style)

Sets the value of inline CSS styles on an element based on an expression, and keeps them in sync.

Copied!

```
1<div data-style-background-color="$usingRed ? 'red' : 'blue'"></div>
2<div data-style-display="$hiding && 'none'"></div>
```

The `data-style` attribute can also be used to set multiple style properties on an element using a set of key-value pairs, where the keys represent CSS property names and the values represent expressions.

Copied!

```
1<div data-style="{
2    display: $hiding ? 'none' : 'flex',
3    flexDirection: 'column',
4    color: $usingRed ? 'red' : 'green'
5}"></div>
```

Style properties can be specified in either camelCase (e.g., `backgroundColor`) or kebab-case (e.g., `background-color`). They will be automatically converted to the appropriate format.

Empty string, `null`, `undefined`, or `false` values will restore the original inline style value if one existed, or remove the style property if there was no initial value. This allows you to use the logical AND operator (`&&`) for conditional styles: `$condition && 'value'` will apply the style when the condition is true and restore the original value when false.

Copied!

```
1<!-- When $x is false, color remains red from inline style -->
2<div style="color: red;" data-style-color="$x && 'green'"></div>
3
4<!-- When $hiding is true, display becomes none; when false, reverts to flex from inline style -->
5<div style="display: flex;" data-style-display="$hiding && 'none'"></div>
```

The plugin tracks initial inline style values and restores them when data-style expressions become falsy or during cleanup. This ensures existing inline styles are preserved and only the dynamic changes are managed by Datastar.

### `data-text`[#](https://data-star.dev/reference/attributes#data-text)

Binds the text content of an element to an expression.

Copied!

`1<div data-text="$foo"></div>`

Pro Attributes [#](https://data-star.dev/reference/attributes#pro-attributes)
-----------------------------------------------------------------------------

The Pro attributes add functionality to the free open source Datastar framework. These attributes are available under a [commercial license](https://data-star.dev/reference/datastar_pro#license) that helps fund our open source work.

### `data-animate`[#](https://data-star.dev/reference/attributes#data-animate)[Pro](https://data-star.dev/reference/datastar_pro)

Allows you to animate element attributes over time. Animated attributes are updated reactively whenever signals used in the expression change.

### `data-custom-validity`[#](https://data-star.dev/reference/attributes#data-custom-validity)[Pro](https://data-star.dev/reference/datastar_pro)

Allows you to add custom validity to an element using an expression. The expression must evaluate to a string that will be set as the custom validity message. If the string is empty, the input is considered valid. If the string is non-empty, the input is considered invalid and the string is used as the reported message.

Copied!

```
1<form>
2    <input data-bind-foo name="foo" />
3    <input data-bind-bar name="bar"
4           data-custom-validity="$foo === $bar ? '' : 'Values must be the same.'"
5    />
6    <button>Submit form</button>
7</form>
```

### `data-on-raf`[#](https://data-star.dev/reference/attributes#data-on-raf)[Pro](https://data-star.dev/reference/datastar_pro)

Runs an expression on every [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) event.

Copied!

`1<div data-on-raf="$count++"></div>`

#### Modifiers

Modifiers allow you to modify the timing of the event listener.

*   `__throttle` – Throttle the event listener.
    *   `.500ms` – Throttle for 500 milliseconds (accepts any integer).
    *   `.1s` – Throttle for 1 second (accepts any integer).
    *   `.noleading` – Throttle without leading edge.
    *   `.trail` – Throttle with trailing edge.

Copied!

`1<div data-on-raf__throttle.10ms="$count++"></div>`

### `data-on-resize`[#](https://data-star.dev/reference/attributes#data-on-resize)[Pro](https://data-star.dev/reference/datastar_pro)

Runs an expression whenever an element’s dimensions change.

Copied!

`1<div data-on-resize="$count++"></div>`

#### Modifiers

Modifiers allow you to modify the timing of the event listener.

*   `__debounce` – Debounce the event listener.
    *   `.500ms` – Debounce for 500 milliseconds (accepts any integer).
    *   `.1s` – Debounce for 1 second (accepts any integer).
    *   `.leading` – Debounce with leading edge.
    *   `.notrail` – Debounce without trailing edge.

*   `__throttle` – Throttle the event listener.
    *   `.500ms` – Throttle for 500 milliseconds (accepts any integer).
    *   `.1s` – Throttle for 1 second (accepts any integer).
    *   `.noleading` – Throttle without leading edge.
    *   `.trail` – Throttle with trailing edge.

Copied!

`1<div data-on-resize__debounce.10ms="$count++"></div>`

### `data-persist`[#](https://data-star.dev/reference/attributes#data-persist)[Pro](https://data-star.dev/reference/datastar_pro)

Persists signals in [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). This is useful for storing values between page loads.

Copied!

`1<div data-persist></div>`

The signals to be persisted can be filtered by providing a value that is an object with `include` and/or `exclude` properties that are regular expressions.

Copied!

`1<div data-persist="{include: /foo/, exclude: /bar/}"></div>`

#### Modifiers

Modifiers allow you to modify the storage target.

*   `__session` – Persists signals in [session storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).

Copied!

`1<div data-persist__session></div>`

### `data-query-string`[#](https://data-star.dev/reference/attributes#data-query-string)[Pro](https://data-star.dev/reference/datastar_pro)

Syncs query string params to signal values on page load, and syncs signal values to query string params on change.

Copied!

`1<div data-query-string></div>`

The signals to be synced can be filtered by providing a value that is an object with `include` and/or `exclude` properties that are regular expressions.

Copied!

`1<div data-query-string="{include: /foo/, exclude: /bar/}"></div>`

#### Modifiers

Modifiers allow you to enable history support.

*   `__history` – Enables history support – each time a matching signal changes, a new entry is added to the browser’s history stack. Signal values are restored from the query string params on popstate events.

Copied!

`1<div data-query-string__history></div>`

### `data-replace-url`[#](https://data-star.dev/reference/attributes#data-replace-url)[Pro](https://data-star.dev/reference/datastar_pro)

Replaces the URL in the browser without reloading the page. The value can be a relative or absolute URL, and is an evaluated expression.

Copied!

`1<div data-replace-url="`/page${page}`"></div>`

### `data-scroll-into-view`[#](https://data-star.dev/reference/attributes#data-scroll-into-view)[Pro](https://data-star.dev/reference/datastar_pro)

Scrolls the element into view. Useful when updating the DOM from the backend, and you want to scroll to the new content.

Copied!

`1<div data-scroll-into-view></div>`

#### Modifiers

Modifiers allow you to modify scrolling behavior.

*   `__smooth` – Scrolling is animated smoothly.
*   `__instant` – Scrolling is instant.
*   `__auto` – Scrolling is determined by the computed `scroll-behavior` CSS property.
*   `__hstart` – Scrolls to the left of the element.
*   `__hcenter` – Scrolls to the horizontal center of the element.
*   `__hend` – Scrolls to the right of the element.
*   `__hnearest` – Scrolls to the nearest horizontal edge of the element.
*   `__vstart` – Scrolls to the top of the element.
*   `__vcenter` – Scrolls to the vertical center of the element.
*   `__vend` – Scrolls to the bottom of the element.
*   `__vnearest` – Scrolls to the nearest vertical edge of the element.
*   `__focus` – Focuses the element after scrolling.

Copied!

`1<div data-scroll-into-view__smooth></div>`

### `data-view-transition`[#](https://data-star.dev/reference/attributes#data-view-transition)[Pro](https://data-star.dev/reference/datastar_pro)

Sets the `view-transition-name` style attribute explicitly.

Copied!

`1<div data-view-transition="$foo"></div>`

Page level transitions are automatically handled by an injected meta tag. Inter-page elements are automatically transitioned if the [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) is available in the browser and `useViewTransitions` is `true`.

Attribute Casing [#](https://data-star.dev/reference/attributes#attribute-casing)
---------------------------------------------------------------------------------

[According to the HTML specification](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*), all `data-*` attributes (not Datastar the framework, but any time a data attribute appears in the DOM) are case in-sensitive, but are converted to [`camelCase`](https://developer.mozilla.org/en-US/docs/Glossary/Camel_case) when accessed from JavaScript by Datastar.

Datastar handles casing of data attributes in two ways:

1.   The keys used in attributes that define signals (`data-signals-*`, `data-computed-*`, etc.), are converted to [`camelCase`](https://developer.mozilla.org/en-US/docs/Glossary/Camel_case). For example, `data-signals-my-signal` defines a signal named `mySignal`. You would use the signal in a [Datastar expression](https://data-star.dev/guide/datastar_expressions) as `$mySignal`.
2.   The keys used by all other attributes are, by default, converted to [`kebab-case`](https://developer.mozilla.org/en-US/docs/Glossary/Kebab_case). For example, `data-class-text-blue-700` adds or removes the class `text-blue-700`, and `data-on-rocket-launched` would react to the event named `rocket-launched`.

You can use the `__case` modifier to convert between `camelCase`, `kebab-case`, `snake_case`, and `PascalCase`, or alternatively use object syntax when available.

For example, if listening for an event called `widgetLoaded`, you would use `data-on-widget-loaded__case.camel`.

Aliasing Attributes [#](https://data-star.dev/reference/attributes#aliasing-attributes)
---------------------------------------------------------------------------------------

It is possible to alias `data-*` attributes to a custom alias (`data-foo-*`, for example) using the [bundler](https://data-star.dev/bundler). A custom alias should _only_ be used if you have a conflict with a legacy library and [`data-ignore`](https://data-star.dev/reference/attributes#data-ignore) cannot be used.

We maintain a `data-star-*` aliased version that can be included as follows.

Copied!

`1<script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@main/bundles/datastar-aliased.js"></script>`

Datastar Expressions [#](https://data-star.dev/reference/attributes#datastar-expressions)
-----------------------------------------------------------------------------------------

Datastar expressions used in `data-*` attributes can parse signals (prefixed with `$`).

A variable `el` is available in every Datastar expression, representing the element that the attribute exists on.

Copied!

`1<div id="bar" data-text="$foo + el.id"></div>`

Read more about [Datastar expressions](https://data-star.dev/guide/datastar_expressions) in the guide.

Error Handling [#](https://data-star.dev/reference/attributes#error-handling)
-----------------------------------------------------------------------------

Datastar has built-in error handling and reporting for runtime errors. When a data attribute is used incorrectly, for example `data-text-foo`, the following error message is logged to the browser console.

Copied!

```
1Uncaught datastar runtime error: textKeyNotAllowed
 2More info: https://data-star.dev/errors/runtime/text_key_not_allowed?metadata=%7B%22plugin%22%3A%7B%22name%22%3A%22text%22%2C%22type%22%3A%22attribute%22%7D%2C%22element%22%3A%7B%22id%22%3A%22%22%2C%22tag%22%3A%22DIV%22%7D%2C%22expression%22%3A%7B%22rawKey%22%3A%22textFoo%22%2C%22key%22%3A%22foo%22%2C%22value%22%3A%22%22%2C%22fnContent%22%3A%22%22%7D%7D
 3Context: {
 4    "plugin": {
 5        "name": "text",
 6        "type": "attribute"
 7    },
 8    "element": {
 9        "id": "",
10        "tag": "DIV"
11    },
12    "expression": {
13        "rawKey": "textFoo",
14        "key": "foo",
15        "value": "",
16        "fnContent": ""
17    }
18}
```

The “More info” link takes you directly to a context-aware error page that explains error and provides correct sample usage. See [the error page for the example above](https://data-star.dev/errors/runtime/text_key_not_allowed?metadata=%7B%22plugin%22%3A%7B%22name%22%3A%22text%22%2C%22type%22%3A%22attribute%22%7D%2C%22element%22%3A%7B%22id%22%3A%22%22%2C%22tag%22%3A%22DIV%22%7D%2C%22expression%22%3A%7B%22rawKey%22%3A%22textFoo%22%2C%22key%22%3A%22foo%22%2C%22value%22%3A%22%22%2C%22fnContent%22%3A%22%22%7D%7D), and all available error messages in the sidebar menu.

[Next →](https://data-star.dev/reference/actions)


Title: Actions Reference

URL Source: https://data-star.dev/reference/actions

Markdown Content:
[← Previous](https://data-star.dev/reference/attributes)[Next →](https://data-star.dev/reference/datastar_pro)
Datastar provides actions that can be used in Datastar expressions.

> The `@`prefix designates actions that are safe to use in expressions. This is a security feature that prevents arbitrary JavaScript from being executed in the browser. Datastar uses [`Function()` constructors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function)to create and execute these actions in a secure and controlled sandboxed environment.

### `@peek()`[#](https://data-star.dev/reference/actions#peek)

> `@peek(callable: () => any)`

Allows accessing signals without subscribing to their changes in expressions.

`1<div data-text="$foo + @peek(() => $bar)"></div>`

In the example above, the expression in the `data-text` attribute will be re-evaluated whenever `$foo` changes, but it will _not_ be re-evaluated when `$bar` changes, since it is evaluated inside the `@peek()` action.

### `@setAll()`[#](https://data-star.dev/reference/actions#setall)

> `@setAll(value: any, filter?: {include: RegExp, exclude?: RegExp})`

Sets the value of all matching signals (or all signals if no filter is used) to the expression provided in the first argument. The second argument is an optional filter object with an `include` property that accepts a regular expression to match signal paths. You can optionally provide an `exclude` property to exclude specific patterns.

> The [Datastar Inspector](https://data-star.dev/reference/datastar_pro#datastar-inspector)can be used to inspect and filter current signals and view signal patch events in real-time.

```
1<!-- Sets the `foo` signal only -->
 2<div data-signals-foo="false">
 3    <button data-on-click="@setAll(true, {include: /^foo$/})"></button>
 4</div>
 5
 6<!-- Sets all signals starting with `user.` -->
 7<div data-signals="{user: {name: '', nickname: ''}}">
 8    <button data-on-click="@setAll('johnny', {include: /^user\./})"></button>
 9</div>
10
11<!-- Sets all signals except those ending with `_temp` -->
12<div data-signals="{data: '', data_temp: '', info: '', info_temp: ''}">
13    <button data-on-click="@setAll('reset', {include: /.*/, exclude: /_temp$/})"></button>
14</div>
```

### `@toggleAll()`[#](https://data-star.dev/reference/actions#toggleall)

> `@toggleAll(filter?: {include: RegExp, exclude?: RegExp})`

Toggles the boolean value of all matching signals (or all signals if no filter is used). The argument is an optional filter object with an `include` property that accepts a regular expression to match signal paths. You can optionally provide an `exclude` property to exclude specific patterns.

> The [Datastar Inspector](https://data-star.dev/reference/datastar_pro#datastar-inspector)can be used to inspect and filter current signals and view signal patch events in real-time.

```
1<!-- Toggles the `foo` signal only -->
 2<div data-signals-foo="false">
 3    <button data-on-click="@toggleAll({include: /^foo$/})"></button>
 4</div>
 5
 6<!-- Toggles all signals starting with `is` -->
 7<div data-signals="{isOpen: false, isActive: true, isEnabled: false}">
 8    <button data-on-click="@toggleAll({include: /^is/})"></button>
 9</div>
10
11<!-- Toggles signals starting with `settings.` -->
12<div data-signals="{settings: {darkMode: false, autoSave: true}}">
13    <button data-on-click="@toggleAll({include: /^settings\./})"></button>
14</div>
```

Backend Actions [#](https://data-star.dev/reference/actions#backend-actions)
----------------------------------------------------------------------------

### `@get()`[#](https://data-star.dev/reference/actions#get)

> `@get(uri: string, options={  })`

Sends a `GET` request to the backend using the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). The URI can be any valid endpoint and the response must contain zero or more [Datastar SSE events](https://data-star.dev/reference/sse_events).

`1<button data-on-click="@get('/endpoint')"></button>`

By default, requests are sent with a `Datastar-Request: true` header, and a `{datastar: *}` object containing all existing signals, except those beginning with an underscore. This behavior can be changed using the [`filterSignals`](https://data-star.dev/reference/actions#filterSignals) option, which allows you to include or exclude specific signals using regular expressions.

> When using a `get`request, the signals are sent as a query parameter, otherwise they are sent as a JSON body.

When a page is hidden (in a background tab, for example), the default behavior is for the SSE connection to be closed, and reopened when the page becomes visible again. To keep the connection open when the page is hidden, set the [`openWhenHidden`](https://data-star.dev/reference/actions#openWhenHidden) option to `true`.

`1<button data-on-click="@get('/endpoint', {openWhenHidden: true})"></button>`

It’s possible to send form encoded requests by setting the `contentType` option to `form`. This sends requests using `application/x-www-form-urlencoded` encoding.

`1<button data-on-click="@get('/endpoint', {contentType: 'form'})"></button>`

It’s also possible to send requests using `multipart/form-data` encoding by specifying it in the `form` element’s [`enctype`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/enctype) attribute. This should be used when uploading files. See the [form data example](https://data-star.dev/examples/form_data).

```
1<form enctype="multipart/form-data">
2    <input type="file" name="file" />
3    <button data-on-click="@get('/endpoint', {contentType: 'form'})"></button>
4</form>
```

### `@post()`[#](https://data-star.dev/reference/actions#post)

> `@post(uri: string, options={  })`

Works the same as [`@get()`](https://data-star.dev/reference/actions#get) but sends a `POST` request to the backend.

`1<button data-on-click="@post('/endpoint')"></button>`

### `@put()`[#](https://data-star.dev/reference/actions#put)

> `@put(uri: string, options={  })`

Works the same as [`@get()`](https://data-star.dev/reference/actions#get) but sends a `PUT` request to the backend.

`1<button data-on-click="@put('/endpoint')"></button>`

### `@patch()`[#](https://data-star.dev/reference/actions#patch)

> `@patch(uri: string, options={  })`

Works the same as [`@get()`](https://data-star.dev/reference/actions#get) but sends a `PATCH` request to the backend.

`1<button data-on-click="@patch('/endpoint')"></button>`

### `@delete()`[#](https://data-star.dev/reference/actions#delete)

> `@delete(uri: string, options={  })`

Works the same as [`@get()`](https://data-star.dev/reference/actions#get) but sends a `DELETE` request to the backend.

`1<button data-on-click="@delete('/endpoint')"></button>`

### Options [#](https://data-star.dev/reference/actions#options)

All of the actions above take a second argument of options.

*   `contentType` – The type of content to send. A value of `json` sends all signals in a JSON request. A value of `form` tells the action to look for the closest form to the element on which it is placed (unless a `selector` option is provided), perform validation on the form elements, and send them to the backend using a form request (no signals are sent). Defaults to `json`.
*   `filterSignals` – A filter object with an `include` property that accepts a regular expression to match signal paths (defaults to all signals: `/.*/`), and an optional `exclude` property to exclude specific signal paths (defaults to all signals that do not have a `_` prefix: `/(^_|\._).*/`).
> The [Datastar Inspector](https://data-star.dev/reference/datastar_pro#datastar-inspector)can be used to inspect and filter current signals and view signal patch events in real-time.

*   `selector` – Optionally specifies a form to send when the `contentType` option is set to `form`. If the value is `null`, the closest form is used. Defaults to `null`.
*    – An object containing headers to send with the request.
*   `openWhenHidden` – Whether to keep the connection open when the page is hidden. Useful for dashboards but can cause a drain on battery life and other resources when enabled. Defaults to `false`.
*   `retryInterval` – The retry interval in milliseconds. Defaults to `1000` (one second).
*   `retryScaler` – A numeric multiplier applied to scale retry wait times. Defaults to `2`.
*   `retryMaxWaitMs` – The maximum allowable wait time in milliseconds between retries. Defaults to `30000` (30 seconds).
*   `retryMaxCount` – The maximum number of retry attempts. Defaults to `10`.
*   `requestCancellation` – Controls request cancellation behavior. Can be `'auto'` (default, cancels existing requests on the same element), `'disabled'` (allows concurrent requests), or an `AbortController` instance for custom control. Defaults to `'auto'`.

```
1<button data-on-click="@get('/endpoint', {
2    filterSignals: {include: /^foo\./},
3    headers: {
4        'X-Csrf-Token': 'JImikTbsoCYQ9oGOcvugov0Awc5LbqFsZW6ObRCxuq',
5    },
6    openWhenHidden: true,
7    requestCancellation: 'disabled',
8})"></button>
```

### Request Cancellation [#](https://data-star.dev/reference/actions#request-cancellation)

By default, when a new fetch request is initiated on an element, any existing request on that same element is automatically cancelled. This prevents multiple concurrent requests from conflicting with each other and ensures clean state management.

For example, if a user rapidly clicks a button that triggers a backend action, only the most recent request will be processed:

```
1<!-- Clicking this button multiple times will cancel previous requests (default behavior) -->
2<button data-on-click="@get('/slow-endpoint')">Load Data</button>
```

This automatic cancellation happens at the element level, meaning requests on different elements can run concurrently without interfering with each other.

You can control this behavior using the [`requestCancellation`](https://data-star.dev/reference/actions#requestCancellation) option:

```
1<!-- Allow concurrent requests (no automatic cancellation) -->
2<button data-on-click="@get('/endpoint', {requestCancellation: 'disabled'})">Allow Multiple</button>
3
4<!-- Custom abort controller for fine-grained control -->
5<div data-signals-controller="new AbortController()">
6    <button data-on-click="@get('/endpoint', {requestCancellation: $controller})">Start Request</button>
7    <button data-on-click="$controller.abort()">Cancel Request</button>
8</div>
```

### Response Handling [#](https://data-star.dev/reference/actions#response-handling)

Backend actions automatically handle different response content types:

*   `text/event-stream` – Standard SSE responses with [Datastar SSE events](https://data-star.dev/reference/sse_events).
*   `text/html` – HTML elements to patch into the DOM.
*   `application/json` – JSON encoded signals to patch.
*   `text/javascript` – JavaScript code to execute in the browser.

#### `text/html`

When returning HTML (`text/html`), the server can optionally include the following response headers:

*   `datastar-selector` – A CSS selector for the target elements to patch
*   `datastar-mode` – How to patch the elements (`outer`, `inner`, `remove`, `replace`, `prepend`, `append`, `before`, `after`). Defaults to `outer`.
*   `datastar-use-view-transition` – Whether to use the [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) when patching elements.

```
1response.headers.set('Content-Type', 'text/html')
2response.headers.set('datastar-selector', '#my-element')
3response.headers.set('datastar-mode', 'inner')
4response.body = '<div>New content</div>'
```

#### `application/json`

When returning JSON (`application/json`), the server can optionally include the following response header:

*   `datastar-only-if-missing` – If set to `true`, only patch signals that don’t already exist.

```
1response.headers.set('Content-Type', 'application/json')
2response.headers.set('datastar-only-if-missing', 'true')
3response.body = JSON.stringify({ foo: 'bar' })
```

#### `text/javascript`

When returning JavaScript (`text/javascript`), the server can optionally include the following response header:

*   `datastar-script-attributes` – Sets the script element’s attributes using a JSON encoded string.

```
1response.headers.set('Content-Type', 'text/javascript')
2response.headers.set('datastar-script-attributes', JSON.stringify({ type: 'module' }))
3response.body = 'console.log("Hello from server!");'
```

### Events [#](https://data-star.dev/reference/actions#events)

All of the actions above trigger `datastar-fetch` events during the fetch request lifecycle. The event type determines the stage of the request.

*   `started` – Triggered when the fetch request is started.
*   `finished` – Triggered when the fetch request is finished.
*   `error` – Triggered when the fetch request encounters an error.
*   `retrying` – Triggered when the fetch request is retrying.
*   `retries-failed` – Triggered when all fetch retries have failed.
*   [`upload-progress`](https://data-star.dev/reference/actions#upload-progress) – Triggered during file uploads (see below).

```
1<div data-on-datastar-fetch="
2    evt.detail.type === 'error' && console.log('fetch error encountered')
3"></div>
```

### Upload Progress [#](https://data-star.dev/reference/actions#upload-progress)[Pro](https://data-star.dev/reference/datastar_pro)

All [backend actions](https://data-star.dev/reference/actions#backend-actions) (`@get()`, `@post()`, `@put()`, `@patch()`, `@delete()`) automatically support file upload progress monitoring when:

*   Using [Datastar Pro](https://data-star.dev/reference/datastar_pro) (not available in the free version).
*   The target URL uses the HTTPS protocol.
*   The request body is FormData (multipart/form-data).

> The HTTPS requirement exists due to browser security restrictions. Browsers only allow the `duplex`option (required for ReadableStream uploads) on secure connections. For HTTP URLs or non-FormData requests, standard fetch is used without progress tracking.

When these conditions are met, the actions dispatch `upload-progress` fetch events with:

*   `progress` – Upload percentage (0-100) as a string
*   `loaded` – Bytes uploaded so far as a string
*   `total` – Total bytes to upload as a string

```
1<form enctype="multipart/form-data"
 2    data-signals="{progress: 0, uploading: false}"
 3    data-on-submit__prevent="@post('https://example.com/upload', {contentType: 'form'})"
 4    data-on-datastar-fetch="
 5        if (evt.detail.type !== 'upload-progress') return;
 6
 7        const {progress, loaded, total} = evt.detail.argsRaw;
 8        $uploading = true;
 9        $progress = Number(progress);
10
11        if ($progress >= 100) {
12            $uploading = false;
13        }
14    "
15>
16    <input type="file" name="files" multiple />
17    <button type="submit">Upload</button>
18    <progress data-show="$uploading" data-attr-value="$progress" max="100"></progress>
19</form>
```

Pro Actions [#](https://data-star.dev/reference/actions#pro-actions)
--------------------------------------------------------------------

### `@clipboard()`[#](https://data-star.dev/reference/actions#clipboard)[Pro](https://data-star.dev/reference/datastar_pro)

> `@clipboard(text: string, isBase64?: boolean)`

Copies the provided text to the clipboard. If the second parameter is `true`, the text is treated as [Base64](https://developer.mozilla.org/en-US/docs/Glossary/Base64) encoded, and is decoded before copying.

> Base64 encoding is useful when copying content that contains special characters, quotes, or code fragments that might not be valid within HTML attributes. This prevents parsing errors and ensures the content is safely embedded in `data-*`attributes.

```
1<!-- Copy plain text -->
2<button data-on-click="@clipboard('Hello, world!')"></button>
3
4<!-- Copy base64 encoded text (will decode before copying) -->
5<button data-on-click="@clipboard('SGVsbG8sIHdvcmxkIQ==', true)"></button>
```

### `@fit()`[#](https://data-star.dev/reference/actions#fit)[Pro](https://data-star.dev/reference/datastar_pro)

> `@fit(v: number, oldMin: number, oldMax: number, newMin: number, newMax: number, shouldClamp=false, shouldRound=false)`

Linearly interpolates a value from one range to another. This is useful for converting between different scales, such as mapping a slider value to a percentage or converting temperature units.

The optional `shouldClamp` parameter ensures the result stays within the new range, and `shouldRound` rounds the result to the nearest integer.

```
1<!-- Convert a 0-100 slider to 0-255 RGB value -->
 2<div>
 3    <input type="range" min="0" max="100" value="50" data-bind-slider-value>
 4    <div data-computed-rgb-value="@fit($sliderValue, 0, 100, 0, 255)">
 5        RGB Value: <span data-text="$rgbValue"></span>
 6    </div>
 7</div>
 8
 9<!-- Convert Celsius to Fahrenheit -->
10<div>
11    <input type="number" data-bind-celsius value="20" />
12    <div data-computed-fahrenheit="@fit($celsius, 0, 100, 32, 212)">
13        <span data-text="$celsius"></span>°C = <span data-text="$fahrenheit.toFixed(1)"></span>°F
14    </div>
15</div>
16
17<!-- Map mouse position to element opacity (clamped) -->
18<div
19    data-signals-mouse-x="0"
20    data-computed-opacity="@fit($mouseX, 0, window.innerWidth, 0, 1, true)"
21    data-on-mousemove__window="$mouseX = evt.clientX"
22    data-attr-style="'opacity: ' + $opacity"
23>
24    Move your mouse horizontally to change opacity
25</div>
```

[← Previous](https://data-star.dev/reference/attributes)[Next →](https://data-star.dev/reference/datastar_pro)