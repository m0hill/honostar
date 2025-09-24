# Bonsai Engineering & Agent Guide

This document is the official guide for engineers and AI agents developing on this platform. Adhering to these patterns is mandatory for maintaining a clean, scalable, and predictable codebase.

---

## Core Philosophy: The Hypermedia SPA

This framework blends the simplicity of traditional server-rendered applications with the reactive user experience of a modern Single-Page App (SPA).

**The Server is the single source of truth.** All state and UI logic resides on the server. The client is a thin presentation layer that renders HTML fragments pushed from the server. User interactions trigger server requests, and the server responds with UI updates over a persistent Server-Sent Events (SSE) connection.

---

## The Developer's Mental Model: Reply vs. Broadcast

Every real-time interaction you build will fall into one of two categories. Your primary design decision is to choose the correct one.

### 1. `reply()` -> For Tab-Specific State

Use `c.var.datastar.reply()` when an action's result should **only be visible to the user in the tab where they performed the action**.

- **What it is:** Direct feedback.
- **Use Cases:**
  - Form validation errors (`"Password is too short"`)
  - Success/error notifications (`"Profile updated!"`)
  - UI state changes like opening a dropdown or navigating to another page.
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

Topics are the backbone of our shared-state updates.

- **Single Source of Truth:** All topic strings **must** be defined in `src/lib/topics.ts`. Do not use raw strings in your pages or handlers. This provides type safety and prevents typos.
- **Naming Convention:** Use a granular, hierarchical structure: `resource:id:sub-resource`. For example, `issue:123:comments`.
- **Subscription:** A page subscribes to topics in its `createPage` definition. This automatically tells the client's SSE connection to listen on those channels.

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

- Create the necessary JSX components. Give key containers a stable `id` so `datastar` can target them for updates (e.g., `<div id="comments-section">`).
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

## Datastar Quick Reference

These are the most common `data-*` attributes you will use.

- **Actions (Clicks & Buttons):**
  - `data-on-click="@post('/path/to/action')"`
- **Forms:**
  - `data-on-submit__prevent="@post('/path/to/form/handler')"`
  - The `__prevent` modifier stops the default browser page reload.
- **Data Binding (Inputs):**
  - `data-bind="form.username"`: Two-way links an input's value to a client-side signal.
- **Conditional Rendering:**
  - `data-show="$mySignal"`: Shows the element if `$mySignal` is truthy, hides it otherwise.
- **Displaying Data:**
  - `data-text="$mySignal"`: Sets the element's text content to the value of the signal.
