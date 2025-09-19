# Welcome to Datastar

This guide will walk you through the core concepts of Datastar. Think of Datastar as a way to build modern, interactive websites where your backend does most of the heavy lifting, keeping your frontend code clean and simple.

## What is Datastar?

Datastar is a lightweight framework that helps you build interactive user interfaces with a **hypermedia-first approach**.

What does that mean? It means your **server is the main source of truth**. Instead of writing complex JavaScript on the frontend to manage state and update the UI, your server sends small chunks of HTML or data directly to the browser. Datastar then intelligently updates the page without needing a full reload.

It gives you two main superpowers:

1.  **Frontend Reactivity**: Make your HTML dynamic using special `data-*` attributes.
2.  **Backend-Driven Updates**: Let your server update the web page in real-time.

-----

## 1\. The Core: `data-*` Attributes

Everything in Datastar revolves around `data-*` attributes in your HTML. These attributes are your commands to make elements interactive.

For example, the `data-on-click` attribute listens for a click and runs an expression.

```html
<button data-on-click="alert('Hello, World!')">
  Click Me
</button>
```

-----

## 2\. Signals: Your Frontend's Memory

Sometimes you need to keep track of state on the frontend, like what a user has typed into an input field. For this, Datastar uses **Signals**.

A Signal is a **reactive variable**. "Reactive" means that when its value changes, any part of your UI that uses it will update automatically. In Datastar, you always refer to signals using a `$` prefix (e.g., `$message`).

### Key Signal Attributes:

  * **`data-bind`**: Creates a two-way binding with an input element. It creates a signal and keeps it in sync with the input's value.

    ```html
    <input data-bind-username />
    ```

  * **`data-text`**: Displays the value of a signal as the text content of an element.

    ```html
    <input data-bind-username />

    <div data-text="'Hello, ' + $username"></div>
    ```

  * **`data-show`**: Shows or hides an element based on whether an expression is `true` or `false`.

    ```html
    <input data-bind-username />
    <button data-show="$username != ''">Save</button>
    ```

  * **`data-signals`**: A way to initialize one or more signals directly in your HTML.

    ```html
    <div data-signals="{ counter: 0, message: 'Welcome!' }">
      </div>
    ```

-----

## 3\. Actions: Talking to the Backend

How do you trigger backend logic from the frontend? With **Actions**. Actions are special functions you can call from your `data-*` attributes, and they always start with an `@`.

The most common actions are for making network requests: `@get()`, `@post()`, `@put()`, `@patch()`, and `@delete()`.

```html
<button data-on-click="@post('/todos/42/toggle')">
  Toggle Todo
</button>
```

By default, Datastar sends all current signal values with every request. This gives your backend full context of the frontend state.

-----

## 4\. Server-Sent Events (SSE): Real-Time Updates

This is where the magic happens. After your backend processes a request, how does it tell the browser what to update? It sends a **Server-Sent Event (SSE)**.

SSE creates a persistent connection from the server to the browser, allowing the server to push updates at any time. This is what enables real-time synchronization across multiple browser windows.

Datastar defines two primary SSE events:

### `datastar-patch-elements`

This event tells the browser to **update a piece of the DOM**. It contains the new HTML and instructions on how to apply it.

*An example SSE message from the server:*

```
event: datastar-patch-elements
data: mode outer
data: elements <li id="todo-42" class="completed">Buy milk</li>
```

This tells Datastar to find the element with `id="todo-42"` and replace it entirely (`mode outer`) with the new `<li>` element.

### `datastar-patch-signals`

This event tells the browser to **update one or more signals**.

*An example SSE message from the server:*

```
event: datastar-patch-signals
data: signals {"username": "Dave", "isAuthenticated": true}
```

This tells Datastar to update the `$username` and `$isAuthenticated` signals. Any elements on the page using these signals (`data-text`, `data-show`, etc.) will automatically update.

-----

## 5\. Patching Modes: How to Update the DOM

When you send a `datastar-patch-elements` event, you must specify a `mode`. The mode tells Datastar *how* to apply the new HTML.

Let's say your new HTML is `<p>New Content</p>` and your target element is `<div id="target">Old Content</div>`.

| Mode        | Description                                                          | Result                                                                      |
| :---------- | :------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| **`outer`** | **Replaces the entire target element.** (This is the default)          | `<p>New Content</p>` (The `div#target` is gone)                              |
| **`inner`** | Replaces the **content inside** the target element.                  | `<div id="target"><p>New Content</p></div>`                                 |
| **`prepend`** | Inserts the new HTML at the **beginning** of the target's content.   | `<div id="target"><p>New Content</p>Old Content</div>`                       |
| **`append`** | Inserts the new HTML at the **end** of the target's content.         | `<div id="target">Old Content<p>New Content</p></div>`                       |
| **`before`** | Inserts the new HTML **before** the target element (as a sibling).   | `<p>New Content</p><div id="target">Old Content</div>`                       |
| **`after`** | Inserts the new HTML **after** the target element (as a sibling).    | `<div id="target">Old Content</div><p>New Content</p>`                       |
| **`remove`** | **Deletes the target element.** The new HTML is ignored.             | (The `div#target` is gone)                                                  |

By combining these concepts, you can build complex, real-time applications with minimal frontend JavaScript, letting your powerful backend do the work.