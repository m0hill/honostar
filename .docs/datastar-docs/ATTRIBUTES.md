Title: Attributes Reference

URL Source: https://data-star.dev/reference/attributes

Markdown Content:
[](https://data-star.dev/reference/attributes)[Next →](https://data-star.dev/reference/actions)
Data attributes are evaluated in the [order](https://data-star.dev/reference/attributes#attribute-order) they appear in the DOM, have special [casing](https://data-star.dev/reference/attributes#attribute-casing) rules, can be [aliased](https://data-star.dev/reference/attributes#aliasing-attributes) to avoid conflicts with other libraries, can contain [Datastar expressions](https://data-star.dev/reference/attributes#datastar-expressions), and have [runtime error handling](https://data-star.dev/reference/attributes#error-handling).

> The Datastar [VSCode extension](https://marketplace.visualstudio.com/items?itemName=starfederation.datastar-vscode)and [IntelliJ plugin](https://plugins.jetbrains.com/plugin/26072-datastar-support)provide autocompletion for all available `data-*`attributes.

### `data-attr`[#](https://data-star.dev/reference/attributes#data-attr)

Sets the value of any HTML attribute to an expression, and keeps it in sync.

Copied!

`1<div data-attr:title="$foo"></div>`

The `data-attr` attribute can also be used to set the values of multiple attributes on an element using a set of key-value pairs, where the keys represent attribute names and the values represent expressions.

Copied!

`1<div data-attr="{title: $foo, disabled: $bar}"></div>`

### `data-bind`[#](https://data-star.dev/reference/attributes#data-bind)

Creates a signal (if one doesn’t already exist) and sets up two-way data binding between it and an element’s value. This means that the value of the element is updated when the signal changes, and the signal value is updated when the value of the element changes.

The `data-bind` attribute can be placed on any HTML element on which data can be input or choices selected (`input`, `select`,`textarea` elements, and web components). Event listeners are added for `change` and `input` events.

Copied!

The signal name can be specified in the key (as above), or in the value (as below). This can be useful depending on the templating language you are using.

Copied!

`1<input data-bind="foo" />`

The initial value of the signal is set to the value of the element, unless a signal has already been defined. So in the example below, `$foo` is set to `bar`.

Copied!

`1<input data-bind:foo value="bar" />`

Whereas in the example below, `$foo` inherits the value `baz` of the predefined signal.

Copied!

```
1<div data-signals:foo="baz">
2    <input data-bind:foo value="bar" />
3</div>
```

#### Predefined Signal Types

When you predefine a signal, its **type** is preserved during binding. Whenever the element’s value changes, the signal value is automatically converted to match the original type.

For example, in the code below, `$foo` is set to the **number**`10` (not the string `"10"`) when the option is selected.

Copied!

```
1<div data-signals:foo="0">
2    <select data-bind:foo>
3        <option value="10">10</option>
4    </select>
5</div>
```

In the same way, you can assign multiple input values to a single signal by predefining it as an **array**. In the example below, `$foo` becomes `["bar", "baz"]` when both checkboxes are checked, and `["", ""]` when neither is checked.

Copied!

```
1<div data-signals:foo="[]">
2    <input data-bind:foo type="checkbox" value="bar" />
3    <input data-bind:foo type="checkbox" value="baz" />
4</div>
```

#### File Uploads

Input fields of type `file` will automatically encode file contents in base64. This means that a form is not required.

Copied!

`1<input type="file" data-bind:files multiple />`

The resulting signal is in the format `{ name: string, contents: string, mime: string }[]`. See the [file upload](https://data-star.dev/examples/file_upload) example.

> If you want files to be uploaded to the server, rather than be converted to signals, use a form and with `multipart/form-data`in the [`enctype`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/enctype)attribute. See the [backend actions](https://data-star.dev/reference/actions#backend-actions)reference.

#### Modifiers

Modifiers allow you to modify behavior when binding signals using a key.

*   `__case` – Converts the casing of the signal name.
    *   `.camel` – Camel case: `mySignal` (default)
    *   `.kebab` – Kebab case: `my-signal`
    *   `.snake` – Snake case: `my_signal`
    *   `.pascal` – Pascal case: `MySignal`

Copied!

`1<input data-bind:my-signal__case.kebab />`

### `data-class`[#](https://data-star.dev/reference/attributes#data-class)

Adds or removes a class to or from an element based on an expression.

Copied!

`1<div data-class:hidden="$foo"></div>`

If the expression evaluates to `true`, the `hidden` class is added to the element; otherwise, it is removed.

The `data-class` attribute can also be used to add or remove multiple classes from an element using a set of key-value pairs, where the keys represent class names and the values represent expressions.

Copied!

`1<div data-class="{hidden: $foo, 'font-bold': $bar}"></div>`

#### Modifiers

Modifiers allow you to modify behavior when defining a class name using a key.

*   `__case` – Converts the casing of the class.
    *   `.camel` – Camel case: `myClass`
    *   `.kebab` – Kebab case: `my-class` (default)
    *   `.snake` – Snake case: `my_class`
    *   `.pascal` – Pascal case: `MyClass`

Copied!

`1<div data-class:my-class__case.camel="$foo"></div>`

### `data-computed`[#](https://data-star.dev/reference/attributes#data-computed)

Creates a signal that is computed based on an expression. The computed signal is read-only, and its value is automatically updated when any signals in the expression are updated.

Copied!

`1<div data-computed:foo="$bar + $baz"></div>`

Computed signals are useful for memoizing expressions containing other signals. Their values can be used in other expressions.

Copied!

```
1<div data-computed:foo="$bar + $baz"></div>
2<div data-text="$foo"></div>
```

> Computed signal expressions must not be used for performing actions (changing other signals, actions, JavaScript functions, etc.). If you need to perform an action in response to a signal change, use the [`data-effect`](https://data-star.dev/reference/attributes#data-effect)attribute.

The `data-computed` attribute can also be used to create computed signal using a set of key-value pairs, where the keys represent signal names and the values are callables (usually arrow functions) that return a reactive value.

Copied!

`1<div data-computed="{foo: () => $bar + $baz}"></div>`

#### Modifiers

Modifiers allow you to modify behavior when defining computed signals using a key.

*   `__case` – Converts the casing of the signal name.
    *   `.camel` – Camel case: `mySignal` (default)
    *   `.kebab` – Kebab case: `my-signal`
    *   `.snake` – Snake case: `my_signal`
    *   `.pascal` – Pascal case: `MySignal`

Copied!

`1<div data-computed:my-signal__case.kebab="$bar + $baz"></div>`

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

Creates a signal and sets its value to `true` while a fetch request is in flight, otherwise `false`. The signal can be used to show a loading indicator.

Copied!

```
1<button data-on:click="@get('/endpoint')"
2        data-indicator:fetching
3></button>
```

This can be useful for showing a loading spinner, disabling a button, etc.

Copied!

```
1<button data-on:click="@get('/endpoint')"
2        data-indicator:fetching
3        data-attr:disabled="$fetching"
4></button>
5<div data-show="$fetching">Loading...</div>
```

The signal name can be specified in the key (as above), or in the value (as below). This can be useful depending on the templating language you are using.

Copied!

`1<button data-indicator="fetching"></button>`

When using `data-indicator` with a fetch request initiated in a `data-init` attribute, you should ensure that the indicator signal is created before the fetch request is initialized.

Copied!

`1<div data-indicator:fetching data-init="@get('/endpoint')"></div>`

#### Modifiers

Modifiers allow you to modify behavior when defining indicator signals using a key.

*   `__case` – Converts the casing of the signal name.
    *   `.camel` – Camel case: `mySignal` (default)
    *   `.kebab` – Kebab case: `my-signal`
    *   `.snake` – Snake case: `my_signal`
    *   `.pascal` – Pascal case: `MySignal`

### `data-init`[#](https://data-star.dev/reference/attributes#data-init)

Runs an expression when the attribute is initialized. This can happen on page load, when an element is patched into the DOM, and any time the attribute is modified (via a backend action or otherwise).

> The expression contained in the [`data-init`](https://data-star.dev/reference/attributes#data-init)attribute is executed when the element attribute is loaded into the DOM. This can happen on page load, when an element is patched into the DOM, and any time the attribute is modified (via a backend action or otherwise).

Copied!

`1<div data-init="$count = 1"></div>`

#### Modifiers

Modifiers allow you to add a delay to the event listener.

*   `__delay` – Delay the event listener.
    *   `.500ms` – Delay for 500 milliseconds (accepts any integer).
    *   `.1s` – Delay for 1 second (accepts any integer).

*   `__viewtransition` – Wraps the expression in `document.startViewTransition()` when the View Transition API is available.

Copied!

`1<div data-init__delay.500ms="$count = 1"></div>`

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

`1<button data-on:click="$foo = ''">Reset</button>`

An `evt` variable that represents the event object is available in the expression.

Copied!

`1<div data-on:myevent="$foo = evt.detail"></div>`

The `data-on` attribute works with [events](https://developer.mozilla.org/en-US/docs/Web/Events) and [custom events](https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events). The `data-on:submit` event listener prevents the default submission behavior of forms.

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
    *   `.leading` – Debounce with leading edge (must come after timing).
    *   `.notrailing` – Debounce without trailing edge (must come after timing).

*   `__throttle` – Throttle the event listener.
    *   `.500ms` – Throttle for 500 milliseconds (accepts any integer).
    *   `.1s` – Throttle for 1 second (accepts any integer).
    *   `.noleading` – Throttle without leading edge (must come after timing).
    *   `.trailing` – Throttle with trailing edge (must come after timing).

*   `__viewtransition` – Wraps the expression in `document.startViewTransition()` when the View Transition API is available.
*   `__window` – Attaches the event listener to the `window` element.
*   `__outside` – Triggers when the event is outside the element.
*   `__prevent` – Calls `preventDefault` on the event listener.
*   `__stop` – Calls `stopPropagation` on the event listener.

_* Only works with built-in events._

Copied!

```
1<button data-on:click__window__debounce.500ms.leading="$foo = ''"></button>
2<div data-on:my-event__case.camel="$foo = ''"></div>
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
    *   `.leading` – Debounce with leading edge (must come after timing).
    *   `.notrailing` – Debounce without trailing edge (must come after timing).

*   `__throttle` – Throttle the event listener.
    *   `.500ms` – Throttle for 500 milliseconds (accepts any integer).
    *   `.1s` – Throttle for 1 second (accepts any integer).
    *   `.noleading` – Throttle without leading edge (must come after timing).
    *   `.trailing` – Throttle with trailing edge (must come after timing).

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

### `data-on-signal-patch`[#](https://data-star.dev/reference/attributes#data-on-signal-patch)

Runs an expression whenever any signals are patched. This is useful for tracking changes, updating computed values, or triggering side effects when data updates.

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
    *   `.leading` – Debounce with leading edge (must come after timing).
    *   `.notrailing` – Debounce without trailing edge (must come after timing).

*   `__throttle` – Throttle the event listener.
    *   `.500ms` – Throttle for 500 milliseconds (accepts any integer).
    *   `.1s` – Throttle for 1 second (accepts any integer).
    *   `.noleading` – Throttle without leading edge (must come after timing).
    *   `.trailing` – Throttle with trailing edge (must come after timing).

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

`1<div data-ref:foo></div>`

The signal name can be specified in the key (as above), or in the value (as below). This can be useful depending on the templating language you are using.

Copied!

`1<div data-ref="foo"></div>`

The signal value can then be used to reference the element.

Copied!

`1$foo is a reference to a <span data-text="$foo.tagName"></span> element`

#### Modifiers

Modifiers allow you to modify behavior when defining references using a key.

*   `__case` – Converts the casing of the signal name.
    *   `.camel` – Camel case: `mySignal` (default)
    *   `.kebab` – Kebab case: `my-signal`
    *   `.snake` – Snake case: `my_signal`
    *   `.pascal` – Pascal case: `MySignal`

Copied!

`1<div data-ref:my-signal__case.kebab></div>`

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

`1<div data-signals:foo="1"></div>`

Signals can be nested using dot-notation.

Copied!

`1<div data-signals:foo.bar="1"></div>`

The `data-signals` attribute can also be used to patch multiple signals using a set of key-value pairs, where the keys represent signal names and the values represent expressions.

Copied!

`1<div data-signals="{foo: {bar: 1, baz: 2}}"></div>`

The value above is written in JavaScript object notation, but JSON, which is a subset and which most templating languages have built-in support for, is also allowed.

Setting a signal’s value to `null` or `undefined` removes the signal.

Copied!

`1<div data-signals="{foo: null}"></div>`

Keys used in `data-signals:*` are converted to camel case, so the signal name `mySignal` must be written as `data-signals:my-signal` or `data-signals="{mySignal: 1}"`.

Signals beginning with an underscore are _not_ included in requests to the backend by default. You can opt to include them by modifying the value of the [`filterSignals`](https://data-star.dev/reference/actions#filterSignals) option.

> Signal names cannot begin with nor contain a double underscore (`__`), due to its use as a modifier delimiter.

#### Modifiers

Modifiers allow you to modify behavior when patching signals using a key.

*   `__case` – Converts the casing of the signal name.
    *   `.camel` – Camel case: `mySignal` (default)
    *   `.kebab` – Kebab case: `my-signal`
    *   `.snake` – Snake case: `my_signal`
    *   `.pascal` – Pascal case: `MySignal`

*   `__ifmissing` Only patches signals if their keys do not already exist. This is useful for setting defaults without overwriting existing values.

Copied!

```
1<div data-signals:my-signal__case.kebab="1"
2     data-signals:foo__ifmissing="1"
3></div>
```

### `data-style`[#](https://data-star.dev/reference/attributes#data-style)

Sets the value of inline CSS styles on an element based on an expression, and keeps them in sync.

Copied!

```
1<div data-style:background-color="$usingRed ? 'red' : 'blue'"></div>
2<div data-style:display="$hiding && 'none'"></div>
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
2<div style="color: red;" data-style:color="$x && 'green'"></div>
3
4<!-- When $hiding is true, display becomes none; when false, reverts to flex from inline style -->
5<div style="display: flex;" data-style:display="$hiding && 'none'"></div>
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
2    <input data-bind:foo name="foo" />
3    <input data-bind:bar name="bar"
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
    *   `.noleading` – Throttle without leading edge (must come after timing).
    *   `.trailing` – Throttle with trailing edge (must come after timing).

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
    *   `.leading` – Debounce with leading edge (must come after timing).
    *   `.notrailing` – Debounce without trailing edge (must come after timing).

*   `__throttle` – Throttle the event listener.
    *   `.500ms` – Throttle for 500 milliseconds (accepts any integer).
    *   `.1s` – Throttle for 1 second (accepts any integer).
    *   `.noleading` – Throttle without leading edge (must come after timing).
    *   `.trailing` – Throttle with trailing edge (must come after timing).

Copied!

`1<div data-on-resize__debounce.10ms="$count++"></div>`

### `data-persist`[#](https://data-star.dev/reference/attributes#data-persist)[Pro](https://data-star.dev/reference/datastar_pro)

Persists signals in [local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). This is useful for storing values between page loads.

Copied!

`1<div data-persist></div>`

The signals to be persisted can be filtered by providing a value that is an object with `include` and/or `exclude` properties that are regular expressions.

Copied!

`1<div data-persist="{include: /foo/, exclude: /bar/}"></div>`

You can use a custom storage key by adding it after `data-persist:`. By default, signals are stored using the key `datastar`.

Copied!

`1<div data-persist:mykey></div>`

#### Modifiers

Modifiers allow you to modify the storage target.

*   `__session` – Persists signals in [session storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) instead of local storage.

Copied!

```
1<!-- Persists signals using a custom key `mykey` in session storage -->
2<div data-persist:mykey__session></div>
```

### `data-query-string`[#](https://data-star.dev/reference/attributes#data-query-string)[Pro](https://data-star.dev/reference/datastar_pro)

Syncs query string params to signal values on page load, and syncs signal values to query string params on change.

Copied!

`1<div data-query-string></div>`

The signals to be synced can be filtered by providing a value that is an object with `include` and/or `exclude` properties that are regular expressions.

Copied!

`1<div data-query-string="{include: /foo/, exclude: /bar/}"></div>`

#### Modifiers

Modifiers allow you to enable history support.

*   `__filter` – Filters out empty values when syncing signal values to query string params.
*   `__history` – Enables history support – each time a matching signal changes, a new entry is added to the browser’s history stack. Signal values are restored from the query string params on popstate events.

Copied!

`1<div data-query-string__filter__history></div>`

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

Attribute Order [#](https://data-star.dev/reference/attributes#attribute-order)
-------------------------------------------------------------------------------

Elements are evaluated by walking the DOM in a depth-first manner, and attributes are processed in the order they appear in the element. This is important in some cases, such as when using `data-indicator` with a fetch request initiated in a `data-init` attribute, in which the indicator signal must be created before the fetch request is initialized.

Copied!

`1<div data-indicator:fetching data-init="@get('/endpoint')"></div>`

Attribute Casing [#](https://data-star.dev/reference/attributes#attribute-casing)
---------------------------------------------------------------------------------

[According to the HTML specification](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*), all `data-*` attributes (not Datastar the framework, but any time a data attribute appears in the DOM) are case in-sensitive, but are converted to [`camelCase`](https://developer.mozilla.org/en-US/docs/Glossary/Camel_case) when accessed from JavaScript by Datastar.

Datastar handles casing of data attributes in two ways:

1.   The keys used in attributes that define signals (`data-signals:*`, `data-computed:*`, etc.), are converted to [`camelCase`](https://developer.mozilla.org/en-US/docs/Glossary/Camel_case). For example, `data-signals:my-signal` defines a signal named `mySignal`. You would use the signal in a [Datastar expression](https://data-star.dev/guide/datastar_expressions) as `$mySignal`.
2.   The keys used by all other attributes are, by default, converted to [`kebab-case`](https://developer.mozilla.org/en-US/docs/Glossary/Kebab_case). For example, `data-class:text-blue-700` adds or removes the class `text-blue-700`, and `data-on:rocket-launched` would react to the event named `rocket-launched`.

You can use the `__case` modifier to convert between `camelCase`, `kebab-case`, `snake_case`, and `PascalCase`, or alternatively use object syntax when available.

For example, if listening for an event called `widgetLoaded`, you would use `data-on:widget-loaded__case.camel`.

Aliasing Attributes [#](https://data-star.dev/reference/attributes#aliasing-attributes)
---------------------------------------------------------------------------------------

It is possible to alias `data-*` attributes to a custom alias (`data-foo-*`, for example) using the [bundler](https://data-star.dev/bundler). A custom alias should _only_ be used if you have a conflict with a legacy library and [`data-ignore`](https://data-star.dev/reference/attributes#data-ignore) cannot be used.

We maintain a `data-star-*` aliased version that can be included as follows.

Copied!

`1<script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@1.0.0-RC.6/bundles/datastar-aliased.js"></script>`

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

[](https://data-star.dev/reference/attributes)[Next →](https://data-star.dev/reference/actions)