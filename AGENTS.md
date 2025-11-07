# Bonsai Engineering & Agent Guide

This document is the official guide for engineers and AI agents developing on this platform. Adhering to these patterns is mandatory for maintaining a clean, scalable, and predictable codebase.

---

## Core Philosophy: The Hypermedia MPA with View Transitions

This framework is a **Multi-Page Application (MPA)** enhanced with View Transitions and real-time SSE updates. It combines the simplicity and reliability of traditional server-rendered applications with smooth navigation transitions and live collaborative features.

**The Server is the single source of truth.** All state and UI logic resides on the server. Each page navigation is a full server round-trip that returns complete HTML documents. The browser's native View Transitions API provides smooth, SPA-like animations between pages without client-side routing or virtual DOM diffing.

Real-time updates are delivered via Server-Sent Events (SSE) for collaborative features like live comments and issue updates, but navigation itself uses standard browser behavior with progressive enhancement.

---

## Navigation vs. Real-Time Updates

Understanding the distinction between page navigation and real-time updates is critical:

### Page Navigation (View Transitions)
- **What:** Standard `<a href>` links that cause full page loads
- **How:** The browser fetches a new HTML document from the server
- **Enhancement:** The View Transitions API intercepts same-origin link clicks and animates the page change smoothly
- **When to use:** Moving between different pages/views (e.g., from issues list to issue detail)
- **Implementation:** Just use regular anchor tags - no special JavaScript needed

### Real-Time Updates (SSE)
For updates that happen without navigation, we use Server-Sent Events. These fall into two categories:

## The Developer's Mental Model: Reply vs. Broadcast

Every real-time update you build will fall into one of two categories. Your primary design decision is to choose the correct one.

### 1. `reply()` -> For Tab-Specific State

Use `c.var.datastar.reply()` when an action's result should **only be visible to the user in the tab where they performed the action**.

- **What it is:** Direct feedback.
- **Use Cases:**
  - Form validation errors (`"Password is too short"`)
  - Success/error notifications (`"Profile updated!"`)
  - UI state changes like opening a modal or toggling a dropdown
- **How it works:** Sends an SSE message targeted to the unique `X-Tab-ID` of the originating client. No one else sees it.

### 2. `broadcast()` -> For Shared State

Use `c.var.datastar.broadcast()` when a change made by one user **must be reflected in the UI of all other users viewing the same data**.

- **What it is:** A public announcement to a specific channel (a "topic").
- **Use Cases:**
  - A new issue is created (updates the main issues list).
  - A new label is created (updates the label list in all open issue modals).
  - **A new comment is posted on an issue (updates the comment list for everyone viewing that issue).**
- **How it works:** Sends an SSE message to a named topic (e.g., `issues:list`). Every client subscribed to that topic receives the update.

---

## Topics: The Real-Time Channels

Topics are the backbone of our shared-state real-time updates via SSE.

- **Single Source of Truth:** All topic strings **must** be defined in `src/lib/topics.ts`. Do not use raw strings in your pages or handlers. This provides type safety and prevents typos.
- **Naming Convention:** Use a granular, hierarchical structure: `resource:id:sub-resource`. For example, `issue:123:comments`.
- **Subscription:** A page subscribes to topics in its `createPage` definition. This automatically tells the client's SSE connection to listen on those channels.
- **Page Load:** When a page loads, the SSE connection is established with `data-on-load="@get('/_/events?topics=...')"` in the `<body>` tag. The server reads this and subscribes the client to the appropriate topic channels.

---

## Step-by-Step Guide: Building a New Feature

Follow this process to build any new feature. We will use the **Real-Time Comments** feature as the canonical example.

### Step 1: Analyze the State

- Ask the core question: Is the state I'm changing **shared** or **tab-specific**?
- *Example Answer:* A new comment is **shared** (everyone on the page sees it). An empty comment error is **tab-specific** (only the submitter sees it). This means we will use `broadcast()` for success and `reply()` for validation errors.

### Step 2: Define Your Topic

- If you are dealing with shared state, add a new entry to `src/lib/topics.ts`.
- *Example:* We added `issue: (id) => ({ comments: () => \`issue:${id}:comments\` })`.

### Step 3: Check the Database Schema

- Ensure your tables and relations in `src/db/schema.ts` support the feature.
- *Example:* The `comments` table already existed and was sufficient.

### Step 4: Build UI Components

- Create the necessary JSX components. Give key containers a stable `id` so `datastar` can target them for real-time updates (e.g., `<div id="comments-section">`).
- Use regular `<a href>` links for navigation - the View Transitions API will automatically enhance them with smooth animations.
- *Example:* We added `CommentsSection` and `CommentForm` to `IssueDetailPage.tsx`.

### Step 5: Update The Page (`/pages/...`)

- In the `createPage` definition:
  - Subscribe to the new topic using the function from `src/lib/topics.ts`.
  - Update the `loader` to fetch any initial data required by your new UI components.
- *Example:* We updated `src/pages/issues/[id].tsx` to subscribe to `topics.issue(id).comments()` and pass the `user` and initial `comments` to the component.

### Step 6: Create The Backend Handler

- Create a new file-based route to handle the user action (e.g., a form `POST`).
- In the handler:
  - Use middleware like `requireAuth` if necessary.
  - Validate the incoming data (e.g., with Zod).
  - If validation fails, use `c.var.datastar.reply()` to send a tab-specific error.
  - If successful, update the database.
  - Fetch the complete, updated state.
  - Re-render the relevant shared component with the new state.
  - Use `c.var.datastar.broadcast()` to send the updated HTML to the correct topic.
- *Example:* We created `src/pages/issues/[id]/comments.ts` which validates, saves, and broadcasts the new comment list to the `issue:id:comments` topic.

---

## View Transitions: Smooth Navigation Without Client-Side Routing

This application uses the native [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) to provide smooth, animated page transitions in an MPA architecture.

### How It Works

1. **Progressive Enhancement Script** (in `src/core/renderer.tsx`):
   - A small script intercepts same-origin link clicks
   - Calls `document.startViewTransition()` before navigation
   - The browser captures the current page state, navigates, then animates the transition

2. **Zero Configuration Required:**
   - Just use regular `<a href="/path">` links
   - The browser handles everything automatically
   - If the browser doesn't support View Transitions, it gracefully degrades to instant navigation

3. **Opt-Out When Needed:**
   - Add `data-no-vt` attribute to links that should navigate instantly
   - Add `target="_blank"` or `download` to bypass the transition (already handled automatically)

4. **What Gets Transitioned:**
   - By default, the entire page cross-fades smoothly
   - You can customize with CSS `view-transition-name` properties for more granular control

### Example

```tsx
// This link will have a smooth View Transition:
<a href="/issues/123">View Issue</a>

// This link navigates instantly (no transition):
<a href="/external-page" data-no-vt>Skip Transition</a>
```

---

## Datastar Quick Reference

These are the most common `data-*` attributes you will use for **real-time interactions** (not navigation).

### When to Use Datastar vs. Regular Links

- **Use `<a href>` for navigation** between pages (issues list → issue detail)
- **Use Datastar actions** for mutations and real-time updates (posting a comment, creating an issue)

### Common Datastar Attributes

**Attribute Format:** `data-pluginName:key__modifier1__modifier2`
- Plugin names use colons (`:`) to separate from keys
- Modifiers use double underscores (`__`)
- Example: `data-on:submit__prevent` means "on" plugin, "submit" key, "prevent" modifier

- **Actions (Clicks & Buttons) - For mutations, not navigation:**
  - `data-on:click="@post('/path/to/action')"` - Triggers a POST request that returns SSE updates
  - Example: `<button data-on:click="@post('/issues/123/comments')">Submit Comment</button>`
  
- **Forms - For data submission:**
  - `data-on:submit__prevent="@post('/path/to/form/handler')"` - Submits form data via AJAX
  - The `__prevent` modifier stops the default browser page reload
  - Example: Creating a new issue, posting a comment
  
- **Data Binding (Inputs):**
  - `data-bind:form.username` or `data-bind="form.username"` - Two-way links an input's value to a client-side signal
  - For checkboxes bound to arrays: Each checkbox gets an indexed path (e.g., `labels.0`, `labels.1`)
  - Server-side: Convert the object to array using `Object.values()` if needed
  
- **Conditional Rendering:**
  - `data-show="$mySignal"` - Shows the element if `$mySignal` is truthy, hides it otherwise
  - Example: Modal visibility toggle
  
- **Displaying Data:**
  - `data-text="$mySignal"` - Sets the element's text content to the value of the signal

- **Signals:**
  - `data-signals:ifmissing="{...}"` - Initialize signals only if they don't already exist
  - `data-signals="{...}"` - Initialize or update signals

- **Initialization:**
  - `data-init="@get('/endpoint')"` - Runs code when the element is initialized (e.g., on page load)
  - Common use: Establishing SSE connections on page load

### Navigation vs. Actions: A Practical Example

```tsx
// ✅ Navigation: Use regular <a> tags
<a href="/issues/123">View Issue Details</a>

// ✅ Action/Mutation: Use Datastar
<button data-on:click="@post('/issues/123/close')">Close Issue</button>

// ✅ Form Submission: Use Datastar
<form data-on:submit__prevent="@post('/issues/create')">
  <input name="title" />
  <button type="submit">Create</button>
</form>
```

---

## Architecture Summary

This is a **Multi-Page Application (MPA)**, not a Single-Page Application (SPA). Here's what that means in practice:

### What This App IS:
- ✅ **Server-rendered HTML pages** - Each route returns a complete HTML document
- ✅ **Standard browser navigation** - Each page load is a real HTTP request for a new document
- ✅ **Progressive enhancement** - View Transitions API enhances navigation with smooth animations
- ✅ **Real-time SSE updates** - For collaborative features (live comments, issue updates)
- ✅ **Datastar for mutations** - Form submissions and actions happen via AJAX with SSE responses

### What This App is NOT:
- ❌ **NOT client-side routing** - No virtual DOM, no JavaScript router, no history.pushState for navigation
- ❌ **NOT a SPA** - Each navigation loads a new document from the server
- ❌ **NOT persistent client state** - State resets on navigation (except for topics in session storage)

### The Mental Model:
Think of this as a **traditional web app** (like PHP, Rails, or Django) but with two modern enhancements:
1. **View Transitions** make full page loads feel smooth (like a SPA)
2. **SSE with Datastar** enables real-time collaborative features without polling

This architecture provides the **simplicity and SEO benefits of MPAs** with the **UX polish of SPAs** where it matters.
