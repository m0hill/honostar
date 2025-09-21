# Active Search Example

---
Description:
---

Active Search Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[Next →](/examples/animations)

# Active Search

Demo

| First Name | Last Name |
| ---------- | --------- |
| Macey      | Bernier   |
| Dusty      | Streich   |
| Marjory    | Lynch     |
| Elda       | Swift     |
| Cecil      | Kohler    |
| Cali       | Quigley   |
| Mattie     | Ebert     |
| Alexzander | Johns     |
| Leilani    | Rolfson   |
| Kurtis     | Farrell   |

## Explanation[#](#explanation)

This example actively searches a contacts database as the user enters text.
The interesting part is the input field:

```
<input
    type="text"
    placeholder="Search..."
    data-bind-search
    data-on-input__debounce.200ms="@get('/examples/active_search/search')"
/>`
```

 The input issues a`GET`to`/active_search/search`with the input value bound to`$search`. The`__debounce.200ms`modifier ensures that the search is not issued on every keystroke, but only after the user has stopped typing.
[Next →](/examples/animations)



# Animations Example

---
Description:
---

Animations Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/active_search)[Next →](/examples/bad_apple)

# Animations

Datastar is designed to allow you to use CSS transitions and the new View Transitions API to add smooth animations and transitions to your web page using only CSS and HTML. Below are a few examples of various animation techniques.

## Color Throb[#](#color-throb)

The simplest animation technique in Datastar is to keep the id of an element stable across a content swap. If the id of an element is kept stable, Datastar will swap it in such a way that CSS transitions can be written between the old version of the element and the new one.
Consider this div
Demo

brown on orange

With SSE, we just update the style every second

```
<div
    id="color-throb"
    style="color: var(--blue-8); background-color: var(--orange-5);"
>
    blue on orange
</div>`
```



## View Transitions[#](#view-transitions)

The swapping of the button below is happening on the backend. Each click is causing a transition of state. The animated opacity animation is provided automatically by the View Transition API (not yet supported by Firefox). Doesn’t matter if the targeted elements are different types, it will still “do the right thing”.
Demo

Swap It!

## Fade Out On Swap[#](#fade-out-on-swap)

If you want to fade out an element that is going to be removed when the request ends, just send an SSE event with the opacity set to 0 and set a transition duration. This will fade out the element before it is removed.
Demo

Fade out then delete on click

## Fade In On Addition[#](#fade-in-on-addition)

Building on the previous example, we can fade in the new content the same way, starting from an opacity of 0 and transitioning to an opacity of 1.
Demo

Fade me in on click

[← Previous](/examples/active_search)[Next →](/examples/bad_apple)


# Bad Apple Example

---
Description:
---

Bad Apple Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/animations)[Next →](/examples/bulk_update)

# Bad Apple

Demo

```

```



## Explanation[#](#explanation)

Per a conversation on the[htmx meme discord channel](https://discordapp.com/channels/725789699527933952/996832027083026563/1276380165613813894)there was an offhand remark about adding the[Bad Apple Music video](https://www.youtube.com/watch?v=FtutLA63Cp8)as a benchmark. Thought it'd be fun to do so. We take the[already converted](https://github.com/trung-kieen/bad-apple-ascii)frames of video and turn them into a ZSTD compressed Gob file that’s embedded in the server binary. This makes the whole animation about 1.9MB. We then stream the frames to the client and update the contents of a pre tag with the frames. The percentage is updated with the current frame number.

```
<label
    data-signals="{_percentage: 0, _contents: 'bad apple frames go here'}"
    data-on-load="@get('/examples/bad_apple/updates')"
>
    <span data-text="`Percentage: ${$_percentage.toFixed(2)}%`"></span>
    <input
        type="range"
        min="0"
        max="100"
        step="0.01"
        disabled
        style="cursor: default"
        data-attr-value="$_percentage"
    />
</label>
<pre style="line-height: 100%" data-text="$_contents"></pre>`
```

 This is using Datastar’s ability to patch signals directly.***No need to generate HTML elements, as the contents are already bound to existing elements.***We could also stream down the raster frames using base64 encoded images and update the src of an image tag. Either way works, you would just have to use`data-attr-src`on an image tag. Open your browser dev tool’s inspector tab for the contents of the`pre`tag. You'll see the frames being updated in real-time (in this case 30fps).
[← Previous](/examples/animations)[Next →](/examples/bulk_update)



# Bulk Update Example

---
Description:
---

Bulk Update Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/bad_apple)[Next →](/examples/click_to_edit)

# Bulk Update

Demo

</cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection>

|  | Name            | Email             | Status   |
|  | --------------- | ----------------- | -------- |
|  | Joe Smith       | [email protected] | Inactive |
|  | Angie MacDowell | [email protected] | Inactive |
|  | Fuqua Tarkenton | [email protected] | Inactive |
|  | Kim Yee         | [email protected] | Inactive |

ActivateDeactivate

## HTML[#](#html)

```
<div
    id="demo"
    data-signals__ifmissing="{_fetching: false, selections: Array(4).fill(false)}"
>
    <table>
        <thead>
            <tr>
                <th>
                    <input
                        type="checkbox"
                        data-bind-_all
                        data-on-change="$selections = Array(4).fill($_all)"
                        data-effect="$selections; $_all = $selections.every(Boolean)"
                        data-attr-disabled="$_fetching"
                    />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <input
                        type="checkbox"
                        data-bind-selections
                        data-attr-disabled="$_fetching"
                    />
                </td>
                <td>Joe Smith</td>
                <td>[[email protected]](/cdn-cgi/l/email-protection)</td>
                <td>Active</td>
            </tr>
            <!-- More rows... -->
        </tbody>
    </table>
    <div role="group">
        <button
            class="success"
            data-on-click="@put('/examples/bulk_update/activate')"
            data-indicator-_fetching
            data-attr-disabled="$_fetching"
        >
            <i class="pixelarticons:user-plus"></i>
            Activate
        </button>
        <button
            class="error"
            data-on-click="@put('/examples/bulk_update/deactivate')"
            data-indicator-_fetching
            data-attr-disabled="$_fetching"
        >
            <i class="pixelarticons:user-x"></i>
            Deactivate
        </button>
    </div>
</div>`
```



## Explanation[#](#explanation)

This example shows how to implement a common pattern where rows are selected and then bulk updated. This is accomplished by putting a form around a table, with checkboxes in the table, and then including the checked values in`PUT`s to two different endpoints: activate and deactivate.
The server will either activate or deactivate the checked users and then re-render the table with updated rows.
[← Previous](/examples/bad_apple)[Next →](/examples/click_to_edit)


# Click To Edit Example

---
Description:
---

Click To Edit Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/bulk_update)[Next →](/examples/click_to_load)

# Click To Edit

Demo

First Name: John
Last Name: Doe
Email:[[email protected]](/cdn-cgi/l/email-protection)

EditReset

## Explanation[#](#explanation)

The click to edit pattern is a way to inline edit all or part of a record without a page refresh. This pattern starts with a UI that shows the details of a contact. The div has a button that will get the editing UI for the contact from`/edit`

```
<div id="demo">
    <p>First Name: John</p>
    <p>Last Name: Doe</p>
    <p>Email: [[email protected]](/cdn-cgi/l/email-protection)</p>
    <div role="group">
        <button
            class="info"
            data-indicator-_fetching
            data-attr-disabled="$_fetching"
            data-on-click="@get('/examples/click_to_edit/edit')"
        >
            Edit
        </button>
        <button
            class="warning"
            data-indicator-_fetching
            data-attr-disabled="$_fetching"
            data-on-click="@patch('/examples/click_to_edit/reset')"
        >
            Reset
        </button>
    </div>
</div>`
```

 This returns a form that can be used to edit the contact

```
<div id="demo">
    <label>
        First Name
        <input
            type="text"
            data-bind-first-name
            data-attr-disabled="$_fetching"
        >
    </label>
    <label>
        Last Name
        <input
            type="text"
            data-bind-last-name
            data-attr-disabled="$_fetching"
        >
    </label>
    <label>
        Email
        <input
            type="email"
            data-bind-email
            data-attr-disabled="$_fetching"
        >
    </label>
    <div role="group">
        <button
            class="success"
            data-indicator-_fetching
            data-attr-disabled="$_fetching"
            data-on-click="@put('/examples/click_to_edit')"
        >
            Save
        </button>
        <button
            class="error"
            data-indicator-_fetching
            data-attr-disabled="$_fetching"
            data-on-click="@get('/examples/click_to_edit/cancel')"
        >
            Cancel
        </button>
    </div>
</div>`
```



### There Is No Form[#](#there-is-no-form)

If you compare to htmx you’ll notice there is no form, you can use one, but it’s unnecessary. This is because you’re already using signals and when you`PUT`to`/edit`, the body is the entire contents of the signals, and it’s available to handle errors and validation holistically. There is also a profanity filter on the normal rendering of the contact that is not applied to the edit form. Controlling the rendering completely on the server allows you to have a single source of truth for the data and the rendering.

### There Is No Client Side Validation[#](#there-is-no-client-side-validation)

On the backend we’ve also added a quick sanitizer on the input to avoid bad actors (to some degree). You already have to deal with the data on the server so you might as well do the validation there. In this case, its just modifying how the text is rendered when not editing. This is a simple example, but you can see how to extend it to more complex forms.
[← Previous](/examples/bulk_update)[Next →](/examples/click_to_load)


# Click To Load Example

---
Description:
---

Click To Load Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/click_to_edit)[Next →](/examples/custom_event)

# Click To Load

Demo

</cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection>

| Name          | Email             | ID               |
| ------------- | ----------------- | ---------------- |
| Agent Smith 0 | [email protected] | 1982e3a7bb241055 |
| Agent Smith 1 | [email protected] | 65cd25028f98f158 |
| Agent Smith 2 | [email protected] | 7b95a7322f5da314 |
| Agent Smith 3 | [email protected] | 7324dc1e7e9474f0 |
| Agent Smith 4 | [email protected] | 628911027fcf803f |
| Agent Smith 5 | [email protected] | 5edb980100c87e72 |
| Agent Smith 6 | [email protected] | 3564a48862bc4a0d |
| Agent Smith 7 | [email protected] | 6eed105b82285fa  |
| Agent Smith 8 | [email protected] | 664f427c6b2c4bea |
| Agent Smith 9 | [email protected] | 28353a066812b268 |
Load More

## Explanation[#](#explanation)

This example shows how to implement click-to-load the next page in a table of data. The crux of the example is the final row:

```
<button
    class="info wide"
    data-indicator-_fetching
    data-attr-aria-disabled="`${$_fetching}`"
    data-on-click="!$_fetching && @get('/examples/click_to_load/more')"
>
    Load More
</button>`
```

 After clicking this button, the server responds with a set of elements in a`text/event-stream`with the next page of results. And so on.
[← Previous](/examples/click_to_edit)[Next →](/examples/custom_event)


# Custom Event Example

---
Description:
---

Custom Event Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/click_to_load)[Next →](/examples/dbmon)

# Custom Event

Demo

## HTML[#](#html)

```
<p
    id="foo"
    data-signals-_event-details
    data-on-myevent="$_eventDetails = evt.detail"
    data-text="`Last Event Details: ${$_eventDetails}`"
></p>
<script>
    const foo = document.getElementById("foo");
    setInterval(() => {
        foo.dispatchEvent(
            new CustomEvent("myevent", {
                detail: JSON.stringify({
                    eventTime: new Date().toLocaleTimeString(),
                }),
            })
        );
    }, 1000);
</script>`
```



## Explanation[#](#explanation)

The`data-on-*`plugin can listen to any event, including custom events. In this example, we are listening to a custom event myevent on the foo element. When the event is triggered, the`$_eventDetails`signal is set to the event’s details.
This is primarily used when interacting with Web Components or other custom elements that emit custom events.

### Note[#](#note)

There is an extra variable`evt`available in the event handler that contains the event object. This is used to access the event details like`evt.detail`in this example.
[← Previous](/examples/click_to_load)[Next →](/examples/dbmon)


# DBmon Example

---
Description:
---

DBmon Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/custom_event)[Next →](/examples/delete_row)

# DBmon

Demo

Average render time for entire page: 0s

Mutation Rate %FPS

| cluster1      | 14 | 0s  | 1ms | 5ms  | 5ms  | 6ms  |
| ------------- | -- | --- | --- | ---- | ---- | ---- |
| cluster1slave | 6  | 0s  | 3ms | 3ms  | 4ms  | 9ms  |
| cluster2      | 15 | 0s  | 1ms | 2ms  | 3ms  | 4ms  |
| cluster2slave | 9  | 2ms | 2ms | 3ms  | 4ms  | 4ms  |
| cluster3      | 11 | 1ms | 3ms | 3ms  | 5ms  | 7ms  |
| cluster3slave | 11 | 2ms | 4ms | 5ms  | 6ms  | 6ms  |
| cluster4      | 8  | 9ms | 9ms | 11ms | 13ms | 13ms |
| cluster4slave | 15 | 0s  | 2ms | 2ms  | 3ms  | 4ms  |
| cluster5      | 8  | 4ms | 5ms | 6ms  | 7ms  | 9ms  |
| cluster5slave | 15 | 0s  | 0s  | 1ms  | 3ms  | 3ms  |
| cluster6      | 7  | 0s  | 2ms | 3ms  | 7ms  | 9ms  |
| cluster6slave | 7  | 0s  | 3ms | 5ms  | 7ms  | 10ms |

## HTML[#](#html)

```
<div
    id="demo"
    data-on-load="@get('/examples/dbmon/updates')"
    data-signals-_editing__ifmissing="false"
>
    <p>
        Average render time for entire page: { renderTime }
    </p>
    <div role="group">
        <label>
            Mutation Rate %
            <input
                type="number"
                min="0"
                max="100"
                value="20"
                data-on-focus="$_editing = true"
                data-on-blur="@put('/examples/dbmon/inputs'); $_editing = false"
                data-attr-data-bind-mutation-rate="$_editing"
                data-attr-data-bind-_mutation-rate="!$_editing"
            />
        </label>
        <label>
            FPS
            <input
                type="number"
                min="1"
                max="144"
                value="60"
                data-on-focus="$_editing = true"
                data-on-blur="@put('/examples/dbmon/inputs'); $_editing = false"
                data-attr-data-bind-fps="$_editing"
                data-attr-data-bind-_fps="!$_editing"
            />
        </label>
    </div>
    <table style="table-layout: fixed; width: 100%; word-break: break-all">
        <tbody>
            <!-- Dynamic rows generated by server -->
            <tr>
                <td>cluster1</td>
                <td style="background-color: var(--_active-color)" class="success">
                    8
                </td>
                <td aria-description="SELECT blah from something">
                    12ms
                </td>
                <!-- More query cells... -->
            </tr>
            <!-- More database rows... -->
        </tbody>
    </table>
</div>`
```



## Explanation[#](#explanation)

Per a conversation on the discord server there was a desire to port an old React Conf talk,[DBMon](https://conf2015.reactjs.org/schedule.html#hype), to Datastar.
The logic is 1:1 but all done on the backend, and since it’s Go, it’s an interesting comparison to the SPA based approach. We’ve limited purely since the site is run on a free tier server and don’t want to be a bad user. If you run the site from source you can easily 10x the rows without major issues.

### Note[#](#note)

If you open your Network tab in DevTools we are leveraging ZSTD compression so the data rate is relatively low for the contents.
[← Previous](/examples/custom_event)[Next →](/examples/delete_row)


# Delete Row Example

---
Description:
---

Delete Row Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/dbmon)[Next →](/examples/edit_row)

# Delete Row

Demo

</cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection>

| Name            | Email             | Actions |
| --------------- | ----------------- | ------- |
| Joe Smith       | [email protected] | Delete  |
| Angie MacDowell | [email protected] | Delete  |
| Fuqua Tarkenton | [email protected] | Delete  |
| Kim Yee         | [email protected] | Delete  |
Reset

## Explanation[#](#explanation)

This example shows how to implement a delete button that removes a table row upon completion. First let’s look at the table body:

```
<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Joe Smith</td>
            <td>[[email protected]](/cdn-cgi/l/email-protection)</td>
            <td>
                <button
                    class="error"
                    data-on-click="confirm('Are you sure?') && @delete('/examples/delete_row/0')"
                    data-indicator-_fetching
                    data-attr-disabled="$_fetching"
                >
                    Delete
                </button>
            </td>
        </tr>
    </tbody>
</table>`
```

 The row has a normal confirm to`confirm()`the delete action.
[← Previous](/examples/dbmon)[Next →](/examples/edit_row)


# Edit Row Example

---
Description:
---

Edit Row Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/delete_row)[Next →](/examples/event_bubbling)

# Edit Row

Demo

</cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection>

| Name            | Email             | Actions |
| --------------- | ----------------- | ------- |
| Joe Smith       | [email protected] | Edit    |
| Angie MacDowell | [email protected] | Edit    |
| Fuqua Tarkenton | [email protected] | Edit    |
| Kim Yee         | [email protected] | Edit    |

Reset

## Explanation[#](#explanation)

This example shows how to implement editable rows. First let’s look at the row prior to editing:

```
<tr>
    <td>Joe Smith</td>
    <td>[[email protected]](/cdn-cgi/l/email-protection)</td>
    <td>
        <button data-on-click="@get('/examples/edit_row/0')">
            Edit
        </button>
    </td>
</tr>`
```

 This will trigger a whole table replacement as we are going to remove the edit buttons from other rows as well as change out the inputs to allow editing.
Finally, here is what the row looks like when the data is being edited:

```
<tr>
    <td>
        <input type="text" data-bind-name>
    </td>
    <td>
        <input type="text" data-bind-email>
    </td>
    <td>
        <button data-on-click="@get('/examples/edit_row/cancel')">
            Cancel
        </button>
        <button data-on-click="@patch('/examples/edit_row/0')">
            Save
        </button>
    </td>
</tr>`
```

 Here we have a few things going on, clicking the cancel button will bring back the read-only version of the row. Finally, there is a save button that issues a`PATCH`to update the contact.
[← Previous](/examples/delete_row)[Next →](/examples/event_bubbling)


# Event Bubbling Example

---
Description:
---

Event Bubbling Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/edit_row)[Next →](/examples/file_upload)

# Event Bubbling

Demo

Key pressed:

KEYELSECMOMFETCHSETEXECTESTALARM321ENTERCLEAR

## HTML[#](#html)

```
<div id="demo">
    Key pressed: <span data-text="$key"></span>
    <div id="button-container" data-on-click="$key = evt.target.dataset.id">
        <button data-id="KEY ELSE" class="gray">KEY<br/>ELSE</button>
        <button data-id="CM">CM</button>
        <button data-id="OM">OM</button>
        <button data-id="FETCH">FETCH</button>
        <button data-id="SET">SET</button>
        <button data-id="EXEC">EXEC</button>
        <button data-id="TEST ALARM" class="gray">TEST<br/>ALARM</button>
        <button data-id="3">3</button>
        <button data-id="2">2</button>
        <button data-id="1">1</button>
        <button data-id="ENTER">ENTER</button>
        <button data-id="CLEAR">CLEAR</button>
    </div>
</div>

<style>
    #button-container {
        pointer-events: none;
    }
</style>`
```



## Explanation[#](#explanation)

This example shows how[event bubbling](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling)can be leveraged using Datastar. A`data-on-click`attribute on the parent container of the buttons. When any button is clicked, the event bubbles up to the parent, where we can access the clicked button’s`data-id`attribute via`evt.target.dataset.id`. This allows us to handle all button clicks with a single event listener.
Note the`pointer-events: none;`style on the button container. This is to prevent the container from sending click events.
[← Previous](/examples/edit_row)[Next →](/examples/file_upload)


# File Upload Example

---
Description:
---

File Upload Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/event_bubbling)[Next →](/examples/form_data)

# File Upload

Demo

Pick anything less than 1 MiB
Submit

## Explanation[#](#explanation)

In this example we show how to create a file upload form that will be submitted via fetch.

```
<label>
    <p>Pick anything less than 1MB</p>
    <input type="file" data-bind-files multiple/>
</label>
<button
    class="warning"
    data-on-click="$files.length && @post('/examples/file_upload')"
    data-attr-aria-disabled="`${!$files.length}`"
>
    Submit
</button>`
```

 We don’t need a form because everything is encoded as signals and automatically sent to the server. We`POST`the form to`/examples/file_upload`, since the`input`is using`data-bind`the file will be automatically encoded as base64. For file inputs that have bound signals, the`{signalName}Mimes`and`{signalName}Names`are set automatically as well. All three signals are arrays and files / metainfo will be appended in the order of selection.

### Note[#](#note)

If you try to upload a file that is too large you will get an error message in the console.
[← Previous](/examples/event_bubbling)[Next →](/examples/form_data)


# Form Data Example

---
Description:
---

Form Data Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/file_upload)[Next →](/examples/infinite_scroll)

# Form Data

Demo

foo:bar:baz:
Submit GET requestSubmit POST request
Submit GET request from outside the form

## Explanation[#](#explanation)

Setting the`contentType`option to`form`tells the`@get()`action to look for the closest form, perform validation on it, and send all form elements within it to the backend. A`selector`option can be provided to specify a form element. No signals are sent to the backend in this type of request.

```
<form id="myform">
    foo:<input type="checkbox" name="checkboxes" value="foo" />
    bar:<input type="checkbox" name="checkboxes" value="bar" />
    baz:<input type="checkbox" name="checkboxes" value="baz" />
    <button data-on-click="@get('/endpoint', {contentType: 'form'})">
        Submit GET request
    </button>
    <button data-on-click="@post('/endpoint', {contentType: 'form'})">
        Submit POST request
    </button>
</form>

<button data-on-click="@get('/endpoint', {contentType: 'form', selector: '#myform'})">
    Submit GET request from outside the form
</button>`
```

 Demo

foo:
Submit form

## Explanation[#](#explanation)

In this example, the`@get()`action is placed inside a submit listener on the form element using`data-on-submit`.

```
<form data-on-submit="@get('/endpoint', {contentType: 'form'})">
    foo: <input type="text" name="foo" required />
    <button>
        Submit form
    </button>
</form>`
```

[← Previous](/examples/file_upload)[Next →](/examples/infinite_scroll)


# Infinite Scroll Example

---
Description:
---

Infinite Scroll Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/form_data)[Next →](/examples/inline_validation)

# Infinite Scroll

The infinite scroll pattern provides a way to load content dynamically on user scrolling action.
Let’s focus on the final row (or the last element of your content):

```
<div data-on-intersect="@get('/examples/infinite_scroll/more')">
    Loading...
</div>`
```

 This last element contains a listener which, when scrolled into view, will trigger a request. The result is then appended after it.`data-on-intersect`is an attribute that triggers a request when the element is scrolled into view.
Demo

</cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection></cdn-cgi/l/email-protection>

| Name          | Email             | ID               |
| ------------- | ----------------- | ---------------- |
| Agent Smith 0 | [email protected] | 1982e3a7bb241055 |
| Agent Smith 1 | [email protected] | 65cd25028f98f158 |
| Agent Smith 2 | [email protected] | 7b95a7322f5da314 |
| Agent Smith 3 | [email protected] | 7324dc1e7e9474f0 |
| Agent Smith 4 | [email protected] | 628911027fcf803f |
| Agent Smith 5 | [email protected] | 5edb980100c87e72 |
| Agent Smith 6 | [email protected] | 3564a48862bc4a0d |
| Agent Smith 7 | [email protected] | 6eed105b82285fa  |
| Agent Smith 8 | [email protected] | 664f427c6b2c4bea |
| Agent Smith 9 | [email protected] | 28353a066812b268 |

Loading...
![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/form_data)[Next →](/examples/inline_validation)


# Inline Validation Example

---
Description:
---

Inline Validation Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/infinite_scroll)[Next →](/examples/lazy_load)

# Inline Validation

Demo

Email AddressThe only valid email address is "[[email protected]](/cdn-cgi/l/email-protection)".
First NameLast NameSign Up

## HTML[#](#html)

```
<div id="demo">
    <label>
        Email Address
        <input
            type="email"
            required
            aria-live="polite"
            aria-describedby="email-info"
            data-bind-email
            data-on-keydown__debounce.500ms="@post('/examples/inline_validation/validate')"
        />
    </label>
    <p id="email-info" class="info">The only valid email address is "[[email protected]](/cdn-cgi/l/email-protection)".</p>
    <label>
        First Name
        <input
            type="text"
            required
            aria-live="polite"
            data-bind-first-name
            data-on-keydown__debounce.500ms="@post('/examples/inline_validation/validate')"
        />
    </label>
    <label>
        Last Name
        <input
            type="text"
            required
            aria-live="polite"
            data-bind-last-name
            data-on-keydown__debounce.500ms="@post('/examples/inline_validation/validate')"
        />
    </label>
    <button
        class="success"
        data-on-click="@post('/examples/inline_validation')"
    >
        <i class="material-symbols:person-add"></i>
        Sign Up
    </button>
</div>`
```



## Explanation[#](#explanation)

This example shows how to do inline field validation, in this case of an email address. To do this we need to create a form with an input that`POST`s back to the server with the value to be validated and updates the DOM with the validation results. Since it’s easy to replace the whole form, the logic for displaying the validation results is kept simple.
[← Previous](/examples/infinite_scroll)[Next →](/examples/lazy_load)


# Lazy Load Example

---
Description:
---

Lazy Load Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/inline_validation)[Next →](/examples/lazy_tabs)

# Lazy Load

Demo

Loading...
![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

## Explanation[#](#explanation)

This example shows how to lazily load an element on a page. We start with an initial state that looks like this:

```
<div id="graph" data-on-load="@get('/examples/lazy_load/graph')">
    Loading...
</div>`
```

 Which shows a progress indicator as we are loading the graph. The graph is loaded by patching an element with the same ID.

```
<div id="graph">
    <img src="/images/examples/tokyo.png" />
</div>`
```

[← Previous](/examples/inline_validation)[Next →](/examples/lazy_tabs)


# Lazy Tabs Example

---
Description:
---

Lazy Tabs Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/lazy_load)[Next →](/examples/on_signal_patch)

# Lazy Tabs

Demo

Tab 0Tab 1Tab 2Tab 3Tab 4Tab 5Tab 6Tab 7

Sapiente necessitatibus voluptatem sint alias dolor. Nihil repellendus mollitia quibusdam architecto eos. Accusantium sit exercitationem ut enim qui. Nam neque sed dicta cumque sit. Quae sint ea molestias porro aliquam. Aut quia ut ut reprehenderit possimus. Eum qui ducimus quae voluptas distinctio. Quae accusantium delectus reiciendis tenetur possimus. Est qui voluptas dolorem rerum dolorum.

## HTML[#](#html)

```
<div id="demo">
    <div role="tablist">
        <button
            role="tab"
            aria-selected="true"
            data-on-click="@get('/examples/lazy_tabs/0')"
        >
            Tab 0
        </button>
        <button
            role="tab"
            aria-selected="false"
            data-on-click="@get('/examples/lazy_tabs/1')"
        >
            Tab 1
        </button>
        <button
            role="tab"
            aria-selected="false"
            data-on-click="@get('/examples/lazy_tabs/2')"
        >
            Tab 2
        </button>
        <!-- More tabs... -->
    </div>
    <div role="tabpanel">
        <p>Lorem ipsum dolor sit amet...</p>
        <p>Consectetur adipiscing elit...</p>
        <!-- Tab content -->
    </div>
</div>`
```



## Explanation[#](#explanation)

This example shows how easy it is to implement tabs using Datastar. Following the principles of Hypertext As The Engine Of Application State, the selected tab is a part of the application state. Therefore, to display and select tabs in your application, simply include the tab markup in the returned HTML fragment.
[← Previous](/examples/lazy_load)[Next →](/examples/on_signal_patch)


# On Signal Patch Example

---
Description:
---

On Signal Patch Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/lazy_tabs)[Next →](/examples/progress_bar)

# On Signal Patch

Demo

Update MessageIncrement CounterClear All Changes

### Current Values

Counter:
Message:

### Counter Changes Only

```

```

### All Signal Changes

```

```



## Explanation[#](#explanation)

```
<div data-signals="{counter: 0, message: 'Hello World', allChanges: [], counterChanges: []}">
    <div class="actions">
        <button data-on-click="$message = `Updated: ${performance.now().toFixed(2)}`">
            Update Message
        </button>
        <button data-on-click="$counter++">
            Increment Counter
        </button>
        <button
            class="error"
            data-on-click="$allChanges.length = 0; $counterChanges.length = 0"
        >
            Clear All Changes
        </button>
    </div>
    <div>
        <h3>Current Values</h3>
        <p>Counter: <span data-text="$counter"></span></p>
        <p>Message: <span data-text="$message"></span></p>
    </div>
    <div
        data-on-signal-patch="$counterChanges.push(patch)"
        data-on-signal-patch-filter="{include: /^counter$/}"
    >
        <h3>Counter Changes Only</h3>
        <pre data-json-signals__terse="{include: /^counterChanges/}"></pre>
    </div>
    <div
        data-on-signal-patch="$allChanges.push(patch)"
        data-on-signal-patch-filter="{exclude: /allChanges|counterChanges/}"
    >
        <h3>All Signal Changes</h3>
        <pre data-json-signals__terse="{include: /^allChanges/}"></pre>
    </div>
</div>`
```

 The[`data-on-signal-patch`](/reference/attributes#data-on-signal-patch)plugin allows you to execute an expression whenever signals are patched. This is useful for tracking changes, updating dependent values, or triggering side effects.
You can filter which signals to watch using the`data-on-signal-patch-filter`attribute with include/exclude patterns, as seen above.
[← Previous](/examples/lazy_tabs)[Next →](/examples/progress_bar)


# Progress Bar Example

---
Description:
---

Progress Bar Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/on_signal_patch)[Next →](/examples/progressive_load)

# Progress Bar

Demo

0%

## HTML[#](#html)

```
<div
    id="progress-bar"
    data-on-load="@get('/examples/progress_bar/updates', {openWhenHidden: true})"
>
    <!-- When progress is less than 100% -->
    <svg
        width="200"
        height="200"
        viewbox="-25 -25 250 250"
        style="transform: rotate(-90deg)"
    >
        <circle
            r="90"
            cx="100"
            cy="100"
            fill="transparent"
            stroke="#e0e0e0"
            stroke-width="16px"
            stroke-dasharray="565.48px"
            stroke-dashoffset="565px"
        ></circle>
        <circle
            r="90"
            cx="100"
            cy="100"
            fill="transparent"
            stroke="#6bdba7"
            stroke-width="16px"
            stroke-linecap="round"
            stroke-dashoffset="282px"
            stroke-dasharray="565.48px"
        ></circle>
        <text
            x="44px"
            y="115px"
            fill="#6bdba7"
            font-size="52px"
            font-weight="bold"
            style="transform:rotate(90deg) translate(0px, -196px)"
        >50%</text>
    </svg>

    <!-- When progress is 100% -->
    <button
        data-indicator-_fetching
        data-attr-aria-disabled="`${$_fetching}`"
        data-on-click="
            !$_fetching && @get('/examples/progress_bar/updates', {openWhenHidden: true})
        "
    >
        <i class="material-symbols:check-circle"></i>
        Completed! Try again?
    </button>
</div>`
```



## Explanation[#](#explanation)

This example shows an updating progress graphic. Since Datastar supports SSE, this is very easy to implement. The server sends down a new progress bar svg every 500 milliseconds causing the client to update. After the progress is complete, the server sends down a button allowing the user to restart the progress bar.

### Note[#](#note)

The`openWhenHidden`option is used to keep the connection open even when the progress bar is not visible. This is useful for when the user navigates away from the page and then returns. This will use more resources, so use it judiciously.
[← Previous](/examples/on_signal_patch)[Next →](/examples/progressive_load)



# Progressive Load Example

---
Description:
---

Progressive Load Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/progress_bar)[Next →](/examples/sortable)

# Progressive Load

Demonstrates how to progressively load different sections of a page using SSE events.
Demo

Load

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

Each part is loaded randomly and progressively.

## HTML[#](#html)

```
<div>
    <div class="actions">
        <button
            id="load-button"
            data-signals-load-disabled="false"
            data-on-click="$loadDisabled=true; @get('/examples/progressive_load/updates')"
            data-attr-disabled="$loadDisabled"
            data-indicator-progressive-Load
        >
            Load
        </button>
        <!-- Indicator element -->
    </div>
    <p>
        Each part is loaded randomly and progressively.
    </p>
</div>
<div id="Load">
    <header id="header">Welcome to my blog</header>
    <section id="article">
        <h4>This is my article</h4>
        <section id="articleBody">
            <p>
                Lorem ipsum dolor sit amet...
            </p>
        </section>
    </section>
    <section id="comments">
        <h5>Comments</h5>
        <p>
            This is the comments section. It will also be progressively loaded as you scroll down.
        </p>
        <ul id="comments-list">
            <li id="1">
                <img src="https://avatar.iran.liara.run/username?username=example" alt="Avatar" class="avatar"/>
                This is a comment...
            </li>
            <!-- More comments loaded progressively -->
        </ul>
    </section>
    <div id="footer">Hope you like it</div>
</div>`
```



## Explanation[#](#explanation)

This is a response to[Dan Abramov's article on progressive JSON](https://overreacted.io/progressive-json/). I think it's overcomplicated and shows a lack of understanding of how powerful native hypermedia is.

### Note[#](#note)

This example shows how to progressively load a page using Datastar. The page is divided into sections. We already have examples of[infinite scroll](/examples/infinite_scroll)and[progress bar](/examples/progress_bar), but this example shows how to progressively load a page in a more structured way.
It's truly baffling to me the amount of complexity that React developers tend to introduce. Hypermedia is a powerful tool that allows you to progressively load content in a way that is simple and efficient. This example shows how to use Datastar's server-sent events (SSE) to progressively load a page in a way that is easy to understand and maintain.
Nothing is faster than direct HTML morphing without a virtual DOM. – let the browser do the heavy lifting. This example shows how to use Datastar to progressively load a page in a way that is simple and efficient while only using a one-time cost CDN shim.
[← Previous](/examples/progress_bar)[Next →](/examples/sortable)


# Sortable Example

---
Description:
---

Sortable Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/progressive_load)[Next →](/examples/svg_morphing)

# Sortable

Demo

## Explanation[#](#explanation)

Datastar allows you to listen for custom events using`data-on-*`and react to them by modifying signals.

```
<div data-signals-order-info="'Initial order'" data-text="$orderInfo"></div>
<div id="sortContainer" data-on-reordered="$orderInfo = event.detail.orderInfo">
    <button>Item 1</button>
    <button>Item 2</button>
    <button>Item 3</button>
    <button>Item 4</button>
    <button>Item 5</button>
</div>

<script type="module">
    import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs/+esm'
    new Sortable(sortContainer, {
        animation: 150,
        ghostClass: 'opacity-25',
        onEnd: (evt) => {
            sortContainer.dispatchEvent(
                new CustomEvent('reordered', {detail: {
                    orderInfo: `Moved from position ${evt.oldIndex + 1} to ${evt.newIndex + 1}`
                }})
            )
        }
    })
</script>`
```

 We create an`orderInfo`signal and modify it whenever a`reordered`event is triggered.
We instruct the[SortableJS](https://sortablejs.github.io/Sortable/)library to dispatch a custom event`reordered`whenever the sortable list is changed. This event contains the order information that we can use to update the`orderInfo`signal.
[← Previous](/examples/progressive_load)[Next →](/examples/svg_morphing)


# SVG Morphing Example

---
Description:
---

SVG Morphing Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/sortable)[Next →](/examples/templ_counter)

# SVG Morphing

SVG morphing in Datastar requires special handling because, as an XML dialect, SVG is[namespaced](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/Namespaces_crash_course). This means that`[<svg>](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/svg)`elements (as well as`[<math>](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/math)`elements) create their own namespace, separate from the HTML namespace.
To morph an SVG element, you must ensure that the target element is wrapped in an outer`<svg>`tag. This ensures that the inner SVG element is created under the correct namespace.

```
<svg>
    <svg id="target">
        <circle cx="50" cy="100" r="50" fill="red" />
    </svg>
    <circle cx="150" cy="100" r="50" fill="red" />
</svg>`
```



## Basic Circle Color Change[#](#basic-circle-color-change)

This example demonstrates morphing an SVG circle’s color. Click the button to change the circle from red to blue.
Demo

Change Color

```
svgMorphingRouter.Get("/circle_color", func(w http.ResponseWriter, r *http.Request) {
    sse := datastar.NewSSE(w, r)
    color := svgColors[rand.N(len(svgColors))]
    sse.PatchElements(fmt.Sprintf(`<svg id="circle-demo"><circle cx="50" cy="50" r="40" fill="%s" /></svg>`, color))
})`
```



## Circle Radius Change[#](#circle-radius-change)

This example shows how to morph the size of an SVG element. The circle will change to a random radius when you click the button.
Demo

Change Radius

```
svgMorphingRouter.Get("/circle_size", func(w http.ResponseWriter, r *http.Request) {
    sse := datastar.NewSSE(w, r)
    radius := 15 + rand.N(45) // Random radius between 15-60
    sse.PatchElements(fmt.Sprintf(`<svg id="size-demo"><circle cx="50" cy="50" r="%d" fill="green" /></svg>`, radius))
})`
```



## Random Shape Transformation[#](#random-shape-transformation)

SVG morphing can handle changing between different shape types. This example morphs to a random shape each time you click.
Demo

Random Shape

```
svgMorphingRouter.Get("/shape_transform", func(w http.ResponseWriter, r *http.Request) {
    sse := datastar.NewSSE(w, r)
    shape := svgShapes[rand.N(len(svgShapes))]
    sse.PatchElements(fmt.Sprintf(`<svg id="shape-demo">%s</svg>`, shape))
})`
```



## Multiple Random Elements[#](#multiple-random-elements)

You can morph multiple SVG elements at once. This example updates three circles with random colors and sizes each time you click.
Demo

Randomize All Circles

```
svgMorphingRouter.Get("/multiple_elements", func(w http.ResponseWriter, r *http.Request) {
    sse := datastar.NewSSE(w, r)
    color1 := svgColors[rand.N(len(svgColors))]
    color2 := svgColors[rand.N(len(svgColors))]
    color3 := svgColors[rand.N(len(svgColors))]
    r1 := 10 + rand.N(20) // radius 10-30
    r2 := 10 + rand.N(20)
    r3 := 10 + rand.N(20)
    sse.PatchElements(fmt.Sprintf(`<svg id="multi-demo">
        <circle cx="30" cy="30" r="%d" fill="%s" />
        <circle cx="70" cy="30" r="%d" fill="%s" />
        <circle cx="50" cy="70" r="%d" fill="%s" />
    </svg>`, r1, color1, r2, color2, r3, color3))
})`
```



## Animated Sequence[#](#animated-sequence)

This example demonstrates a sequence of SVG morphs that happen automatically when triggered, creating a smooth animation effect.
Demo

Start Animation Sequence

```
svgMorphingRouter.Get("/animated_morph", func(w http.ResponseWriter, r *http.Request) {
    sse := datastar.NewSSE(w, r)

    // First morph
    sse.PatchElements(`<svg id="animated-demo"><circle cx="50" cy="50" r="30" fill="red" /></svg>`)
    time.Sleep(500 * time.Millisecond)

    // Second morph
    sse.PatchElements(`<svg id="animated-demo"><circle cx="50" cy="50" r="45" fill="orange" /></svg>`)
    time.Sleep(500 * time.Millisecond)

    // Third morph
    sse.PatchElements(`<svg id="animated-demo"><circle cx="50" cy="50" r="60" fill="yellow" /></svg>`)
    time.Sleep(500 * time.Millisecond)

    // Reset
    sse.PatchElements(`<svg id="animated-demo"><circle cx="50" cy="50" r="20" fill="green" /></svg>`)
})`
```



## Key Points[#](#key-points)

*
SVG elements must be wrapped in an outer`<svg>`container
*
The inner`<svg>`element should have the target ID
*
All SVG element types (circle, rect, path, etc.) can be morphed
*
Multiple SVG elements can be updated in a single morph operation
*
CSS transitions work with SVG morphing for smooth animations
[← Previous](/examples/sortable)[Next →](/examples/templ_counter)


# Templ Counter Example

---
Description:
---

Templ Counter Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/svg_morphing)[Next →](/examples/title_update)

# Templ Counter

Demo

Increment Global: 1645Increment User: 0

## HTML[#](#html)

```
<div
    style="display: flex; gap: var(--size-6)"
    data-on-load="@get('/examples/templ_counter/updates')"
>
    <!-- Global Counter -->
    <button
        id="global"
        class="info"
        data-on-click="@patch('/examples/templ_counter/global')"
    >
        Global Clicks: 0
    </button>

    <!-- User Counter -->
    <button
        id="user"
        class="success"
        data-on-click="@patch('/examples/templ_counter/user')"
    >
        User Clicks: 0
    </button>
</div>`
```



## Explanation[#](#explanation)

This example demonstrates two counters - a global counter shared across all users and a user-specific counter. The counters are updated via server-sent events (SSE) and increment when clicked.
[← Previous](/examples/svg_morphing)[Next →](/examples/title_update)


# Title Update Example

---
Description:
---

Title Update Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/templ_counter)[Next →](/examples/todomvc)

# Title Update

Demo

Look at the title change in the browser tab!

## Explanation[#](#explanation)

A user in the Discord channel was asking about needing a plugin similar to htmx’s head support to update title or head elements. With Datastar this is unnecessary as you can just update the title directly with a patch elements event.

```
event: datastar-patch-elements
data: selector title
data: elements <title>08:30:36</title>`
```

[← Previous](/examples/templ_counter)[Next →](/examples/todomvc)


# TodoMVC Example

---
Description:
---

TodoMVC Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/title_update)[Next →](/examples/web_component)

# TodoMVC

Demo

*
Learn any backend language
*
Learn Datastar
*
???
*
Profit

**3**items pendingAllPendingCompletedDeleteReset

## Explanation[#](#explanation)

This is a full implementation of TodoMVC using Datastar. It demonstrates complex state management, including adding, editing, deleting, and filtering todos, all handled through server-sent events.

## HTML[#](#html)

```
<section
    id="todomvc"
    data-on-load="@get('/examples/todomvc/updates')"
>
    <header id="todo-header">
        <input
            type="checkbox"
            data-on-click__prevent="@post('/examples/todomvc/-1/toggle')"
            data-on-load="el.checked = false"
        />
        <input
            id="new-todo"
            type="text"
            placeholder="What needs to be done?"
            data-signals-input
            data-bind-input
            data-on-keydown="
                evt.key === 'Enter' && $input.trim() && @patch('/examples/todomvc/-1') && ($input = '');
            "
        />
    </header>
    <ul id="todo-list">
        <!-- Todo items are dynamically rendered here -->
    </ul>
    <div id="todo-actions">
        <span>
            <strong>0</strong> items pending
        </span>
        <button class="small info" data-on-click="@put('/examples/todomvc/mode/0')">
            All
        </button>
        <button class="small" data-on-click="@put('/examples/todomvc/mode/1')">
            Pending
        </button>
        <button class="small" data-on-click="@put('/examples/todomvc/mode/2')">
            Completed
        </button>
        <button class="error small" aria-disabled="true">
            Delete
        </button>
        <button class="warning small" data-on-click="@put('/examples/todomvc/reset')">
            Reset
        </button>
    </div>
</section>`
```

[← Previous](/examples/title_update)[Next →](/examples/web_component)


# Web Component Example

---
Description:
---

Web Component Example[
![Datastar Logo](/cdn-cgi/image/format=auto,width=24/static/images/rocket-48x48-4c739bfaffe86a6ffcc3a6d77e3c5547730f03d74c11aa460209596d1811f7a3.png)
Datastar](/)K[Guide](/guide)[Reference](/reference)[Examples](/examples)[How-Tos](/how_tos)

[About Us](/star_federation)[Bundler](/bundler)[Essays](/essays)[Examples](/examples)[How-Tos](/how_tos)[Reference](/reference)[Videos](/videos)[Pro](/reference/datastar_pro)

<https://github.com/starfederation/datastar/><https://discord.gg/bnRNgZjgPh><https://www.youtube.com/@data-star>

![Indicator](/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](/examples/todomvc)

# Web Component

Demo

Reversed

## Explanation[#](#explanation)

This is an example of two-way binding with a web component that reverses a string. Normally, the web component would output the reversed value, but in this example, all it does is perform the logic and dispatch an event containing the result, which is then displayed.

```
<label>
    Reversed
    <input type="text" value="Your Name" data-bind-_name/>
</label>
<span data-signals-_reversed data-text="$_reversed"></span>
<reverse-component
    data-on-reverse="$_reversed = evt.detail.value"
    data-attr-name="$_name"
></reverse-component>`
```

 The`name`attribute value is bound to the`$_name`signal's value, and an event listener modifies the`$_reversed`signal's value sent in the`reverse`event. The web component observes changes to the`name`attribute and responds by reversing the string and dispatching a`reverse`event containing the resulting value.

```
class ReverseComponent extends HTMLElement {
    static get observedAttributes() {
        return ["name"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        const len = newValue.length;
        let value = Array(len);
        let i = len - 1;
        for (const char of newValue) {
            value[i--] = char.codePointAt(0);
        }
        value = String.fromCodePoint(...value);
        this.dispatchEvent(new CustomEvent("reverse", { detail: { value } }));
    }
}

customElements.define("reverse-component", ReverseComponent);`
```

[← Previous](/examples/todomvc)
