# Datastar Examples

This document contains all the Datastar examples scraped from data-star.dev


## Active Search

**Source:** https://data-star.dev/examples/active_search

Demo

| First Name | Last Name |
| --- | --- |
| Marta | Block |
| Corine | Buckridge |
| Lonny | Runolfsson |
| Ally | Harber |
| Rashawn | Nikolaus |
| Kim | Torp |
| Brennon | Orn |
| Dorcas | O'Kon |
| Mohammed | Reichert |
| Geovany | Mayert |

Explanation [#](https://data-star.dev/examples/active_search#explanation)
-------------------------------------------------------------------------

This example actively searches a contacts database as the user enters text.

The interesting part is the input field:

```
1<input
2    type="text"
3    placeholder="Search..."
4    data-bind:search
5    data-on:input__debounce.200ms="@get('/examples/active_search/search')"
6/>
```

The input issues a `GET` to `/active_search/search` with the input value bound to `$search`. The `__debounce.200ms` modifier ensures that the search is not issued on every keystroke, but only after the user has stopped typing.

[](https://data-star.dev/examples/active_search)[Next →](https://data-star.dev/examples/animations)

---


## Animations

**Source:** https://data-star.dev/examples/animations

Demo

brown on orange

With SSE, we just update the style every second

```
1<div
2    id="color-throb"
3    style="color: var(--blue-8); background-color: var(--orange-5);"
4>
5    blue on orange
6</div>
```

View Transitions [#](https://data-star.dev/examples/animations#view-transitions)
--------------------------------------------------------------------------------

The swapping of the button below is happening on the backend. Each click is causing a transition of state. The animated opacity animation is provided automatically by the View Transition API (not yet supported by Firefox). Doesn’t matter if the targeted elements are different types, it will still “do the right thing”.

Demo
Fade Out On Swap [#](https://data-star.dev/examples/animations#fade-out-on-swap)
--------------------------------------------------------------------------------

If you want to fade out an element that is going to be removed when the request ends, just send an SSE event with the opacity set to 0 and set a transition duration. This will fade out the element before it is removed.

Demo
Fade In On Addition [#](https://data-star.dev/examples/animations#fade-in-on-addition)
--------------------------------------------------------------------------------------

Building on the previous example, we can fade in the new content the same way, starting from an opacity of 0 and transitioning to an opacity of 1.

Demo[← Previous](https://data-star.dev/examples/active_search)[Next →](https://data-star.dev/examples/bad_apple)

---


## Bad Apple

**Source:** https://data-star.dev/examples/bad_apple

Explanation [#](https://data-star.dev/examples/bad_apple#explanation)
---------------------------------------------------------------------

Per a conversation on the [htmx meme discord channel](https://discordapp.com/channels/725789699527933952/996832027083026563/1276380165613813894) there was an offhand remark about adding the [Bad Apple Music video](https://www.youtube.com/watch?v=FtutLA63Cp8) as a benchmark. Thought it'd be fun to do so. We take the [already converted](https://github.com/trung-kieen/bad-apple-ascii) frames of video and turn them into a ZSTD compressed Gob file that’s embedded in the server binary. This makes the whole animation about 1.9MB. We then stream the frames to the client and update the contents of a pre tag with the frames. The percentage is updated with the current frame number.

```
1<label
 2    data-signals="{_percentage: 0, _contents: 'bad apple frames go here'}"
 3    data-init="@get('/examples/bad_apple/updates')"
 4>
 5    <span data-text="`Percentage: ${$_percentage.toFixed(2)}%`"></span>
 6    <input
 7        type="range"
 8        min="0"
 9        max="100"
10        step="0.01"
11        disabled
12        style="cursor: default"
13        data-attr:value="$_percentage"
14    />
15</label>
16<pre style="line-height: 100%" data-text="$_contents"></pre>
```

This is using Datastar’s ability to patch signals directly. **_No need to generate HTML elements, as the contents are already bound to existing elements._** We could also stream down the raster frames using base64 encoded images and update the src of an image tag. Either way works, you would just have to use `data-attr:src` on an image tag. Open your browser dev tool’s inspector tab for the contents of the `pre` tag. You'll see the frames being updated in real-time (in this case 30fps).

[← Previous](https://data-star.dev/examples/animations)[Next →](https://data-star.dev/examples/bulk_update)

---


## Bulk Update

**Source:** https://data-star.dev/examples/bulk_update

Demo

NameEmailStatus Joe Smith[email protected]ActiveAngie MacDowell[email protected]ActiveFuqua Tarkenton[email protected]ActiveKim Yee[email protected]Active

Activate 
Deactivate 
HTML # 

 1<div  2 id="demo"  3 data-signals__ifmissing="{_fetching: false, selections: Array(4).fill(false)}"  4>  5 <table>  6 <thead>  7 <tr>  8 <th>  9 <input 10 type="checkbox" 11 data-bind:_all 12 data-on:change="$selections = Array(4).fill($_all)" 13 data-effect="$selections; $_all = $selections.every(Boolean)" 14 data-attr:disabled="$_fetching" 15 /> 16 </th> 17 <th>Name</th> 18 <th>Email</th> 19 <th>Status</th> 20 </tr> 21 </thead> 22 <tbody> 23 <tr> 24 <td> 25 <input 26 type="checkbox" 27 data-bind:selections 28 data-attr:disabled="$_fetching" 29 /> 30 </td> 31 <td>Joe Smith</td> 32 <td>[email protected]</td> 33 <td>Active</td> 34 </tr> 35 <!-- More rows... --> 36 </tbody> 37 </table> 38 <div role="group"> 39 <button 40 class="success" 41 data-on:click="@put('/examples/bulk_update/activate')" 42 data-indicator:_fetching 43 data-attr:disabled="$_fetching" 44 > 45 <i class="pixelarticons:user-plus"></i> 46 Activate 47 </button> 48 <button 49 class="error" 50 data-on:click="@put('/examples/bulk_update/deactivate')" 51 data-indicator:_fetching 52 data-attr:disabled="$_fetching" 53 > 54 <i class="pixelarticons:user-x"></i> 55 Deactivate 56 </button> 57 </div> 58</div> 
Explanation # 
This example shows how to implement a common pattern where rows are selected and then bulk updated. This is accomplished by putting a form around a table, with checkboxes in the table, and then including the checked values in PUTs to two different endpoints: activate and deactivate.
The server will either activate or deactivate the checked users and then re-render the table with updated rows.← Previous Next →

© Star Federation
Hosted by Arcustech

---


## Click To Edit

**Source:** https://data-star.dev/examples/click_to_edit

Explanation [#](https://data-star.dev/examples/click_to_edit#explanation)
-------------------------------------------------------------------------

The click to edit pattern is a way to inline edit all or part of a record without a page refresh. This pattern starts with a UI that shows the details of a contact. The div has a button that will get the editing UI for the contact from `/edit`

```
1<div id="demo">
 2    <p>First Name: John</p>
 3    <p>Last Name: Doe</p>
 4    <p>Email: [email protected]</p>
 5    <div role="group">
 6        <button
 7            class="info"
 8            data-indicator:_fetching
 9            data-attr:disabled="$_fetching"
10            data-on:click="@get('/examples/click_to_edit/edit')"
11        >
12            Edit
13        </button>
14        <button
15            class="warning"
16            data-indicator:_fetching
17            data-attr:disabled="$_fetching"
18            data-on:click="@patch('/examples/click_to_edit/reset')"
19        >
20            Reset
21        </button>
22    </div>
23</div>
```

This returns a form that can be used to edit the contact

```
1<div id="demo">
 2    <label>
 3        First Name
 4        <input
 5            type="text"
 6            data-bind:first-name
 7            data-attr:disabled="$_fetching"
 8        >
 9    </label>
10    <label>
11        Last Name
12        <input
13            type="text"
14            data-bind:last-name
15            data-attr:disabled="$_fetching"
16        >
17    </label>
18    <label>
19        Email
20        <input
21            type="email"
22            data-bind:email
23            data-attr:disabled="$_fetching"
24        >
25    </label>
26    <div role="group">
27        <button
28            class="success"
29            data-indicator:_fetching
30            data-attr:disabled="$_fetching"
31            data-on:click="@put('/examples/click_to_edit')"
32        >
33            Save
34        </button>
35        <button
36            class="error"
37            data-indicator:_fetching
38            data-attr:disabled="$_fetching"
39            data-on:click="@get('/examples/click_to_edit/cancel')"
40        >
41            Cancel
42        </button>
43    </div>
44</div>
```

### There Is No Form [#](https://data-star.dev/examples/click_to_edit#there-is-no-form)

If you compare to htmx you’ll notice there is no form, you can use one, but it’s unnecessary. This is because you’re already using signals and when you `PUT` to `/edit`, the body is the entire contents of the signals, and it’s available to handle errors and validation holistically. There is also a profanity filter on the normal rendering of the contact that is not applied to the edit form. Controlling the rendering completely on the server allows you to have a single source of truth for the data and the rendering.

### There Is No Client Side Validation [#](https://data-star.dev/examples/click_to_edit#there-is-no-client-side-validation)

On the backend we’ve also added a quick sanitizer on the input to avoid bad actors (to some degree). You already have to deal with the data on the server so you might as well do the validation there. In this case, its just modifying how the text is rendered when not editing. This is a simple example, but you can see how to extend it to more complex forms.

[← Previous](https://data-star.dev/examples/bulk_update)[Next →](https://data-star.dev/examples/click_to_load)

---


## Click To Load

**Source:** https://data-star.dev/examples/click_to_load

Demo

| Name | Email | ID |
| --- | --- | --- |
| Agent Smith 0 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 1982e3a7bb241055 |
| Agent Smith 1 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 65cd25028f98f158 |
| Agent Smith 2 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 7b95a7322f5da314 |
| Agent Smith 3 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 7324dc1e7e9474f0 |
| Agent Smith 4 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 628911027fcf803f |
| Agent Smith 5 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 5edb980100c87e72 |
| Agent Smith 6 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 3564a48862bc4a0d |
| Agent Smith 7 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 6eed105b82285fa |
| Agent Smith 8 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 664f427c6b2c4bea |
| Agent Smith 9 | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) | 28353a066812b268 |
Load More

Explanation [#](https://data-star.dev/examples/click_to_load#explanation)
-------------------------------------------------------------------------

This example shows how to implement click-to-load the next page in a table of data. The crux of the example is the final row:

```
1<button
2    class="info wide"
3    data-indicator:_fetching
4    data-attr:aria-disabled="`${$_fetching}`"
5    data-on:click="!$_fetching && @get('/examples/click_to_load/more')"
6>
7    Load More
8</button>
```

After clicking this button, the server responds with a set of elements in a `text/event-stream` with the next page of results. And so on.

[← Previous](https://data-star.dev/examples/click_to_edit)[Next →](https://data-star.dev/examples/custom_event)

---


## Custom Event

**Source:** https://data-star.dev/examples/custom_event

```
1<p
 2    id="foo"
 3    data-signals:_event-details
 4    data-on:myevent="$_eventDetails = evt.detail"
 5    data-text="`Last Event Details: ${$_eventDetails}`"
 6></p>
 7<script>
 8    const foo = document.getElementById("foo");
 9    setInterval(() => {
10        foo.dispatchEvent(
11            new CustomEvent("myevent", {
12                detail: JSON.stringify({
13                    eventTime: new Date().toLocaleTimeString(),
14                }),
15            })
16        );
17    }, 1000);
18</script>
```

Explanation [#](https://data-star.dev/examples/custom_event#explanation)
------------------------------------------------------------------------

The `data-on` attribute can listen to any event, including custom events. In this example, we are listening to a custom event myevent on the foo element. When the event is triggered, the `$_eventDetails` signal is set to the event’s details.

This is primarily used when interacting with Web Components or other custom elements that emit custom events.

### Note [#](https://data-star.dev/examples/custom_event#note)

There is an extra variable `evt` available in the event handler that contains the event object. This is used to access the event details like `evt.detail` in this example.

[← Previous](https://data-star.dev/examples/click_to_load)[Next →](https://data-star.dev/examples/custom_plugin)

---


## Custom Plugin

**Source:** https://data-star.dev/examples/custom_plugin

[← Previous](https://data-star.dev/examples/custom_event)[Next →](https://data-star.dev/examples/dbmon)Demo
Explanation [#](https://data-star.dev/examples/custom_plugin#explanation)
-------------------------------------------------------------------------

Custom actions, attributes, and watchers can be implemented using the [plugin API](https://data-star.dev/examples/custom_plugin##). This example implements a simple alert action and attribute.

### Action [#](https://data-star.dev/examples/custom_plugin#action)

An `action` plugin can be implemented as follows.

```
1action({
2    name: 'alert',
3    apply(ctx, value) {
4        alert(value)
5    }
6})
```

Setting the `name` to `alert` results in the syntax `@alert`.

```
1<button data-on:click="@alert('Hello from an action')">
2    Alert using an action
3</button>
```

### Attribute [#](https://data-star.dev/examples/custom_plugin#attribute)

An `attribute` plugin can be implemented as follows.

```
1attribute({
 2    name: 'alert',
 3    requirement: {
 4        key: 'denied',
 5        value: 'must',
 6    },
 7    returnsValue: true,
 8    apply({ el, rx }) {
 9        const callback = () => alert(rx())
10        el.addEventListener('click', callback)
11        return () => el.removeEventListener('click', callback)
12    }
13})
```

Setting the `name` to `alert` results in the syntax `data-alert`.

The attribute shouldn’t take a key and needs a value, so `key` is `denied` and `value` is a `must`. The attribute expects a value to be returned from the expression so we set `returnsValue` to `true`.

On [apply](https://data-star.dev/examples/custom_plugin##), we create an event listener that alerts the value returned from the expression when the element is clicked. We return a function that removes the event listener on [cleanup](https://data-star.dev/examples/custom_plugin##).

```
1<button data-alert="'Hello from an attribute'">
2    Alert using an attribute
3</button>
```

[← Previous](https://data-star.dev/examples/custom_event)[Next →](https://data-star.dev/examples/dbmon)

---


## Dbmon

**Source:** https://data-star.dev/examples/dbmon

Demo
Are you still there?

Updates have been paused to save bandwidth and reduce CO₂ emissions.

We don't want to waste resources if you've stepped away!

REFRESH TO RESUME
HTML
#
 1
<div

 2
    id="demo"

 3
    data-init="@get('/examples/dbmon/updates')"

 4
    data-signals:_editing__ifmissing="false"

 5
>

 6
    <p>

 7
        Average render time for entire page: { renderTime }

 8
    </p>

 9
    <div role="group">

10
        <label>

11
            Mutation Rate %

12
            <input

13
                type="number"

14
                min="0"

15
                max="100"

16
                value="20"

17
                data-on:focus="$_editing = true"

18
                data-on:blur="@put('/examples/dbmon/inputs'); $_editing = false"

19
                data-attr:data-bind:mutation-rate="$_editing"

20
                data-attr:data-bind:_mutation-rate="!$_editing"

21
            />

22
        </label>

23
        <label>

24
            FPS

25
            <input

26
                type="number"

27
                min="1"

28
                max="144"

29
                value="60"

30
                data-on:focus="$_editing = true"

31
                data-on:blur="@put('/examples/dbmon/inputs'); $_editing = false"

32
                data-attr:data-bind:fps="$_editing"

33
                data-attr:data-bind:_fps="!$_editing"

34
            />

35
        </label>

36
    </div>

37
    <table style="table-layout: fixed; width: 100%; word-break: break-all">

38
        <tbody>

39
            <!-- Dynamic rows generated by server -->

40
            <tr>

41
                <td>cluster1</td>

42
                <td style="background-color: var(--_active-color)" class="success">

43
                    8

44
                </td>

45
                <td aria-description="SELECT blah from something">

46
                    12ms

47
                </td>

48
                <!-- More query cells... -->

49
            </tr>

50
            <!-- More database rows... -->

51
        </tbody>

52
    </table>

53
</div>
Explanation
#

Per a conversation on the discord server there was a desire to port an old React Conf talk, DBMon, to Datastar.

The logic is 1:1 but all done on the backend, and since it’s Go, it’s an interesting comparison to the SPA based approach. We’ve limited purely since the site is run on a free tier server and don’t want to be a bad user. If you run the site from source you can easily 10x the rows without major issues.

Note
#

If you open your Network tab in DevTools we are leveraging ZSTD compression so the data rate is relatively low for the contents.

← PREVIOUS
NEXT →
©
Star Federation
Hosted by
Arcustech

---


## Delete Row

**Source:** https://data-star.dev/examples/delete_row

Demo

NameEmailActions Joe Smith[email protected]
DeleteAngie MacDowell[email protected]
DeleteFuqua Tarkenton[email protected]
DeleteKim Yee[email protected]
Delete
Reset 
Explanation # 
This example shows how to implement a delete button that removes a table row upon completion. First let’s look at the table body:

 1<table>  2 <thead>  3 <tr>  4 <th>Name</th>  5 <th>Email</th>  6 <th>Actions</th>  7 </tr>  8 </thead>  9 <tbody> 10 <tr> 11 <td>Joe Smith</td> 12 <td>[email protected]</td> 13 <td> 14 <button 15 class="error" 16 data-on:click="confirm('Are you sure?') && @delete('/examples/delete_row/0')" 17 data-indicator:_fetching 18 data-attr:disabled="$_fetching" 19 > 20 Delete 21 </button> 22 </td> 23 </tr> 24 </tbody> 25</table> 
The row has a normal confirm to confirm() the delete action.← Previous Next →

© Star Federation
Hosted by Arcustech

---


## Edit Row

**Source:** https://data-star.dev/examples/edit_row

[← Previous](https://data-star.dev/examples/delete_row)[Next →](https://data-star.dev/examples/event_bubbling)Demo

| Name | Email | Actions |
| --- | --- | --- |
| Joe Smith | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) |  |
| Angie MacDowell | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) |  |
| Fuqua Tarkenton | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) |  |
| Kim Yee | [[email protected]](https://data-star.dev/cdn-cgi/l/email-protection) |  |

Explanation [#](https://data-star.dev/examples/edit_row#explanation)
--------------------------------------------------------------------

This example shows how to implement editable rows. First let’s look at the row prior to editing:

```
1<tr>
2    <td>Joe Smith</td>
3    <td>[email protected]</td>
4    <td>
5        <button data-on:click="@get('/examples/edit_row/0')">
6            Edit
7        </button>
8    </td>
9</tr>
```

This will trigger a whole table replacement as we are going to remove the edit buttons from other rows as well as change out the inputs to allow editing.

Finally, here is what the row looks like when the data is being edited:

```
1<tr>
 2    <td>
 3        <input type="text" data-bind:name>
 4    </td>
 5    <td>
 6        <input type="text" data-bind:email>
 7    </td>
 8    <td>
 9        <button data-on:click="@get('/examples/edit_row/cancel')">
10            Cancel
11        </button>
12        <button data-on:click="@patch('/examples/edit_row/0')">
13            Save
14        </button>
15    </td>
16</tr>
```

Here we have a few things going on, clicking the cancel button will bring back the read-only version of the row. Finally, there is a save button that issues a `PATCH` to update the contact.

[← Previous](https://data-star.dev/examples/delete_row)[Next →](https://data-star.dev/examples/event_bubbling)

---


## Event Bubbling

**Source:** https://data-star.dev/examples/event_bubbling

[← Previous](https://data-star.dev/examples/edit_row)[Next →](https://data-star.dev/examples/file_upload)Demo

Key pressed:

HTML [#](https://data-star.dev/examples/event_bubbling#html)
------------------------------------------------------------

```
1<div id="demo">
 2    Key pressed: <span data-text="$key"></span>
 3    <div id="button-container" data-on:click="$key = evt.target.dataset.id">
 4        <button data-id="KEY ELSE" class="gray">KEY<br/>ELSE</button>
 5        <button data-id="CM">CM</button>
 6        <button data-id="OM">OM</button>
 7        <button data-id="FETCH">FETCH</button>
 8        <button data-id="SET">SET</button>
 9        <button data-id="EXEC">EXEC</button>
10        <button data-id="TEST ALARM" class="gray">TEST<br/>ALARM</button>
11        <button data-id="3">3</button>
12        <button data-id="2">2</button>
13        <button data-id="1">1</button>
14        <button data-id="ENTER">ENTER</button>
15        <button data-id="CLEAR">CLEAR</button>
16    </div>
17</div>
18
19<style>
20    #button-container {
21        pointer-events: none;
22    }
23</style>
```

Explanation [#](https://data-star.dev/examples/event_bubbling#explanation)
--------------------------------------------------------------------------

This example shows how [event bubbling](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling) can be leveraged using Datastar. A `data-on:click` attribute on the parent container of the buttons. When any button is clicked, the event bubbles up to the parent, where we can access the clicked button’s `data-id` attribute via `evt.target.dataset.id`. This allows us to handle all button clicks with a single event listener.

Note the `pointer-events: none;` style on the button container. This is to prevent the container from sending click events.

[← Previous](https://data-star.dev/examples/edit_row)[Next →](https://data-star.dev/examples/file_upload)

---


## File Upload

**Source:** https://data-star.dev/examples/file_upload

Demo

Pick anything less than 1 MiB

 Submit

Explanation [#](https://data-star.dev/examples/file_upload#explanation)
-----------------------------------------------------------------------

In this example we show how to create a file upload form that will be submitted via fetch.

```
1<label>
 2    <p>Pick anything less than 1MB</p>
 3    <input type="file" data-bind:files multiple/>
 4</label>
 5<button
 6    class="warning"
 7    data-on:click="$files.length && @post('/examples/file_upload')"
 8    data-attr:aria-disabled="`${!$files.length}`"
 9>
10    Submit
11</button>
```

We don’t need a form because everything is encoded as signals and automatically sent to the server. We `POST` the form to `/examples/file_upload`, since the `input` is using `data-bind` the file’s contents will be automatically encoded as base64.

### Note [#](https://data-star.dev/examples/file_upload#note)

If you try to upload a file that is too large you will get an error message in the console.

[← Previous](https://data-star.dev/examples/event_bubbling)[Next →](https://data-star.dev/examples/form_data)

---


## Form Data

**Source:** https://data-star.dev/examples/form_data

[← Previous](https://data-star.dev/examples/file_upload)[Next →](https://data-star.dev/examples/infinite_scroll)Demo
Explanation [#](https://data-star.dev/examples/form_data#explanation)
---------------------------------------------------------------------

Setting the `contentType` option to `form` tells the `@get()` action to look for the closest form, perform validation on it, and send all form elements within it to the backend. A `selector` option can be provided to specify a form element. No signals are sent to the backend in this type of request.

```
1<form id="myform">
 2    foo:<input type="checkbox" name="checkboxes" value="foo" />
 3    bar:<input type="checkbox" name="checkboxes" value="bar" />
 4    baz:<input type="checkbox" name="checkboxes" value="baz" />
 5    <button data-on:click="@get('/endpoint', {contentType: 'form'})">
 6        Submit GET request
 7    </button>
 8    <button data-on:click="@post('/endpoint', {contentType: 'form'})">
 9        Submit POST request
10    </button>
11</form>
12
13<button data-on:click="@get('/endpoint', {contentType: 'form', selector: '#myform'})">
14    Submit GET request from outside the form
15</button>
```

Explanation [#](https://data-star.dev/examples/form_data#explanation)
---------------------------------------------------------------------

In this example, the `@get()` action is placed inside a submit listener on the form element using `data-on:submit`.

```
1<form data-on:submit="@get('/endpoint', {contentType: 'form'})">
2    foo: <input type="text" name="foo" required />
3    <button>
4        Submit form
5    </button>
6</form>
```

[← Previous](https://data-star.dev/examples/file_upload)[Next →](https://data-star.dev/examples/infinite_scroll)

---


## Infinite Scroll

**Source:** https://data-star.dev/examples/infinite_scroll

```
1<div data-on-intersect="@get('/examples/infinite_scroll/more')">
2    Loading...
3</div>
```

This last element contains a listener which, when scrolled into view, will trigger a request. The result is then appended after it. `data-on-intersect` is an attribute that triggers a request when the element is scrolled into view.

Demo

Agents| Name | Email | ID |
| --- | --- | --- |
| Agent Smith 0 | void1@null.org | 1982e3a7bb241055 |
| Agent Smith 1 | void2@null.org | 65cd25028f98f158 |
| Agent Smith 2 | void3@null.org | 7b95a7322f5da314 |
| Agent Smith 3 | void4@null.org | 7324dc1e7e9474f0 |
| Agent Smith 4 | void5@null.org | 628911027fcf803f |
| Agent Smith 5 | void6@null.org | 5edb980100c87e72 |
| Agent Smith 6 | void7@null.org | 3564a48862bc4a0d |
| Agent Smith 7 | void8@null.org | 6eed105b82285fa |
| Agent Smith 8 | void9@null.org | 664f427c6b2c4bea |
| Agent Smith 9 | void10@null.org | 28353a066812b268 |
| Agent Smith 10 | void11@null.org | 50698444ed39c832 |
| Agent Smith 11 | void12@null.org | 205381dc855b977a |
| Agent Smith 12 | void13@null.org | 7ecd2e572c949f74 |
| Agent Smith 13 | void14@null.org | 10a0338accf546ca |
| Agent Smith 14 | void15@null.org | 14908a81dd43806 |
| Agent Smith 15 | void16@null.org | 57080b213541ea80 |
| Agent Smith 16 | void17@null.org | 6fe5d3b279f68366 |
| Agent Smith 17 | void18@null.org | 224b1d542cede2db |
| Agent Smith 18 | void19@null.org | 7b7265f3c6196653 |
| Agent Smith 19 | void20@null.org | f2c84c43a4bb670 |

Loading...![Image 1: Indicator](https://data-star.dev/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

[← Previous](https://data-star.dev/examples/form_data)[Next →](https://data-star.dev/examples/inline_validation)

---


## Inline Validation

**Source:** https://data-star.dev/examples/inline_validation

```
1<div id="demo">
 2    <label>
 3        Email Address
 4        <input
 5            type="email"
 6            required
 7            aria-live="polite"
 8            aria-describedby="email-info"
 9            data-bind:email
10            data-on:keydown__debounce.500ms="@post('/examples/inline_validation/validate')"
11        />
12    </label>
13    <p id="email-info" class="info">The only valid email address is "[email protected]".</p>
14    <label>
15        First Name
16        <input
17            type="text"
18            required
19            aria-live="polite"
20            data-bind:first-name
21            data-on:keydown__debounce.500ms="@post('/examples/inline_validation/validate')"
22        />
23    </label>
24    <label>
25        Last Name
26        <input
27            type="text"
28            required
29            aria-live="polite"
30            data-bind:last-name
31            data-on:keydown__debounce.500ms="@post('/examples/inline_validation/validate')"
32        />
33    </label>
34    <button
35        class="success"
36        data-on:click="@post('/examples/inline_validation')"
37    >
38        <i class="material-symbols:person-add"></i>
39        Sign Up
40    </button>
41</div>
```

Explanation [#](https://data-star.dev/examples/inline_validation#explanation)
-----------------------------------------------------------------------------

This example shows how to do inline field validation, in this case of an email address. To do this we need to create a form with an input that `POST`s back to the server with the value to be validated and updates the DOM with the validation results. Since it’s easy to replace the whole form, the logic for displaying the validation results is kept simple.

[← Previous](https://data-star.dev/examples/infinite_scroll)[Next →](https://data-star.dev/examples/lazy_load)

---


## Lazy Load

**Source:** https://data-star.dev/examples/lazy_load

Demo

Loading...![Image 4: Indicator](https://data-star.dev/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

Explanation [#](https://data-star.dev/examples/lazy_load#explanation)
---------------------------------------------------------------------

This example shows how to lazily load an element on a page. We start with an initial state that looks like this:

```
1<div id="graph" data-init="@get('/examples/lazy_load/graph')">
2    Loading...
3</div>
```

Which shows a progress indicator as we are loading the graph. The graph is loaded by patching an element with the same ID.

```
1<div id="graph">
2    <img src="/images/examples/tokyo.png" />
3</div>
```

[← Previous](https://data-star.dev/examples/inline_validation)[Next →](https://data-star.dev/examples/lazy_tabs)

---


## Lazy Tabs

**Source:** https://data-star.dev/examples/lazy_tabs

Demo

Tab 0 Tab 1 Tab 2 Tab 3 Tab 4 Tab 5 Tab 6 Tab 7

Ut vitae nostrum debitis ea necessitatibus. Asperiores illo non necessitatibus eveniet accusantium. Molestiae officia aut autem rerum pariatur. Vel alias hic voluptate aliquid debitis. Sit ex rem unde quis accusamus.

HTML [#](https://data-star.dev/examples/lazy_tabs#html)
-------------------------------------------------------

```
1<div id="demo">
 2    <div role="tablist">
 3        <button
 4            role="tab"
 5            aria-selected="true"
 6            data-on:click="@get('/examples/lazy_tabs/0')"
 7        >
 8            Tab 0
 9        </button>
10        <button
11            role="tab"
12            aria-selected="false"
13            data-on:click="@get('/examples/lazy_tabs/1')"
14        >
15            Tab 1
16        </button>
17        <button
18            role="tab"
19            aria-selected="false"
20            data-on:click="@get('/examples/lazy_tabs/2')"
21        >
22            Tab 2
23        </button>
24        <!-- More tabs... -->
25    </div>
26    <div role="tabpanel">
27        <p>Lorem ipsum dolor sit amet...</p>
28        <p>Consectetur adipiscing elit...</p>
29        <!-- Tab content -->
30    </div>
31</div>
```

Explanation [#](https://data-star.dev/examples/lazy_tabs#explanation)
---------------------------------------------------------------------

This example shows how easy it is to implement tabs using Datastar. Following the principles of Hypertext As The Engine Of Application State, the selected tab is a part of the application state. Therefore, to display and select tabs in your application, simply include the tab markup in the returned HTML fragment.

[← Previous](https://data-star.dev/examples/lazy_load)[Next →](https://data-star.dev/examples/on_signal_patch)

---


## On Signal Patch

**Source:** https://data-star.dev/examples/on_signal_patch

[← Previous](https://data-star.dev/examples/lazy_tabs)[Next →](https://data-star.dev/examples/progress_bar)Demo

### Current Values

Counter:

Message:

Explanation [#](https://data-star.dev/examples/on_signal_patch#explanation)
---------------------------------------------------------------------------

```
1<div data-signals="{counter: 0, message: 'Hello World', allChanges: [], counterChanges: []}">
 2    <div class="actions">
 3        <button data-on:click="$message = `Updated: ${performance.now().toFixed(2)}`">
 4            Update Message
 5        </button>
 6        <button data-on:click="$counter++">
 7            Increment Counter
 8        </button>
 9        <button
10            class="error"
11            data-on:click="$allChanges.length = 0; $counterChanges.length = 0"
12        >
13            Clear All Changes
14        </button>
15    </div>
16    <div>
17        <h3>Current Values</h3>
18        <p>Counter: <span data-text="$counter"></span></p>
19        <p>Message: <span data-text="$message"></span></p>
20    </div>
21    <div
22        data-on-signal-patch="$counterChanges.push(patch)"
23        data-on-signal-patch-filter="{include: /^counter$/}"
24    >
25        <h3>Counter Changes Only</h3>
26        <pre data-json-signals__terse="{include: /^counterChanges/}"></pre>
27    </div>
28    <div
29        data-on-signal-patch="$allChanges.push(patch)"
30        data-on-signal-patch-filter="{exclude: /allChanges|counterChanges/}"
31    >
32        <h3>All Signal Changes</h3>
33        <pre data-json-signals__terse="{include: /^allChanges/}"></pre>
34    </div>
35</div>
```

The [`data-on-signal-patch`](https://data-star.dev/reference/attributes#data-on-signal-patch) plugin allows you to execute an expression whenever signals are patched. This is useful for tracking changes, updating dependent values, or triggering side effects.

You can filter which signals to watch using the `data-on-signal-patch-filter` attribute with include/exclude patterns, as seen above.

[← Previous](https://data-star.dev/examples/lazy_tabs)[Next →](https://data-star.dev/examples/progress_bar)

---


## Progress Bar

**Source:** https://data-star.dev/examples/progress_bar

```
1<div
 2    id="progress-bar"
 3    data-init="@get('/examples/progress_bar/updates', {openWhenHidden: true})"
 4>
 5    <!-- When progress is less than 100% -->
 6    <svg
 7        width="200"
 8        height="200"
 9        viewbox="-25 -25 250 250"
10        style="transform: rotate(-90deg)"
11    >
12        <circle
13            r="90"
14            cx="100"
15            cy="100"
16            fill="transparent"
17            stroke="#e0e0e0"
18            stroke-width="16px"
19            stroke-dasharray="565.48px"
20            stroke-dashoffset="565px"
21        ></circle>
22        <circle
23            r="90"
24            cx="100"
25            cy="100"
26            fill="transparent"
27            stroke="#6bdba7"
28            stroke-width="16px"
29            stroke-linecap="round"
30            stroke-dashoffset="282px"
31            stroke-dasharray="565.48px"
32        ></circle>
33        <text
34            x="44px"
35            y="115px"
36            fill="#6bdba7"
37            font-size="52px"
38            font-weight="bold"
39            style="transform:rotate(90deg) translate(0px, -196px)"
40        >50%</text>
41    </svg>
42    
43    <!-- When progress is 100% -->
44    <button
45        data-indicator:_fetching
46        data-attr:aria-disabled="`${$_fetching}`"
47        data-on:click="
48            !$_fetching && @get('/examples/progress_bar/updates', {openWhenHidden: true})
49        "
50    >
51        <i class="material-symbols:check-circle"></i>
52        Completed! Try again?
53    </button>
54</div>
```

Explanation [#](https://data-star.dev/examples/progress_bar#explanation)
------------------------------------------------------------------------

This example shows an updating progress graphic. Since Datastar supports SSE, this is very easy to implement. The server sends down a new progress bar svg every 500 milliseconds causing the client to update. After the progress is complete, the server sends down a button allowing the user to restart the progress bar.

### Note [#](https://data-star.dev/examples/progress_bar#note)

The `openWhenHidden` option is used to keep the connection open even when the progress bar is not visible. This is useful for when the user navigates away from the page and then returns. This will use more resources, so use it judiciously.

[← Previous](https://data-star.dev/examples/on_signal_patch)[Next →](https://data-star.dev/examples/progressive_load)

---


## Progressive Load

**Source:** https://data-star.dev/examples/progressive_load

Demonstrates how to progressively load different sections of a page using SSE events.

Demo

![Image 1: Indicator](https://data-star.dev/cdn-cgi/image/format=auto,width=32/static/images/rocket-animated-1d781383a0d7cbb1eb575806abeec107c8a915806fb55ee19e4e33e8632c75e5.gif)

Each part is loaded randomly and progressively.

HTML [#](https://data-star.dev/examples/progressive_load#html)
--------------------------------------------------------------

```
1<div>
 2    <div class="actions">
 3        <button
 4            id="load-button"
 5            data-signals:load-disabled="false"
 6            data-on:click="$loadDisabled=true; @get('/examples/progressive_load/updates')"
 7            data-attr:disabled="$loadDisabled"
 8            data-indicator:progressive-Load
 9        >
10            Load
11        </button>
12        <!-- Indicator element -->
13    </div>
14    <p>
15        Each part is loaded randomly and progressively.
16    </p>
17</div>
18<div id="Load">
19    <header id="header">Welcome to my blog</header>
20    <section id="article">
21        <h4>This is my article</h4>
22        <section id="articleBody">
23            <p>
24                Lorem ipsum dolor sit amet...
25            </p>
26        </section>
27    </section>
28    <section id="comments">
29        <h5>Comments</h5>
30        <p>
31            This is the comments section. It will also be progressively loaded as you scroll down.
32        </p>
33        <ul id="comments-list">
34            <li id="1">
35                <img src="https://avatar.iran.liara.run/username?username=example" alt="Avatar" class="avatar"/>
36                This is a comment...
37            </li>
38            <!-- More comments loaded progressively -->
39        </ul>
40    </section>
41    <div id="footer">Hope you like it</div>
42</div>
```

Explanation [#](https://data-star.dev/examples/progressive_load#explanation)
----------------------------------------------------------------------------

This is a response to [Dan Abramov's article on progressive JSON](https://overreacted.io/progressive-json/). I think it's overcomplicated and shows a lack of understanding of how powerful native hypermedia is.

### Note [#](https://data-star.dev/examples/progressive_load#note)

This example shows how to progressively load a page using Datastar. The page is divided into sections. We already have examples of [infinite scroll](https://data-star.dev/examples/infinite_scroll) and [progress bar](https://data-star.dev/examples/progress_bar), but this example shows how to progressively load a page in a more structured way.

It's truly baffling to me the amount of complexity that React developers tend to introduce. Hypermedia is a powerful tool that allows you to progressively load content in a way that is simple and efficient. This example shows how to use Datastar's server-sent events (SSE) to progressively load a page in a way that is easy to understand and maintain.

Nothing is faster than direct HTML morphing without a virtual DOM. – let the browser do the heavy lifting. This example shows how to use Datastar to progressively load a page in a way that is simple and efficient while only using a one-time cost CDN shim.

[← Previous](https://data-star.dev/examples/progress_bar)[Next →](https://data-star.dev/examples/sortable)

---


## Sortable

**Source:** https://data-star.dev/examples/sortable

Explanation [#](https://data-star.dev/examples/sortable#explanation)
--------------------------------------------------------------------

Datastar allows you to listen for custom events using `data-on` and react to them by modifying signals.

```
1<div data-signals:order-info="'Initial order'" data-text="$orderInfo"></div>
 2<div id="sortContainer" data-on:reordered="$orderInfo = event.detail.orderInfo">
 3    <button>Item 1</button>
 4    <button>Item 2</button>
 5    <button>Item 3</button>
 6    <button>Item 4</button>
 7    <button>Item 5</button>
 8</div>
 9
10<script type="module">
11    import Sortable from 'https://cdn.jsdelivr.net/npm/sortablejs/+esm'
12    new Sortable(sortContainer, {
13        animation: 150,
14        ghostClass: 'opacity-25',
15        onEnd: (evt) => {
16            sortContainer.dispatchEvent(
17                new CustomEvent('reordered', {detail: {
18                    orderInfo: `Moved from position ${evt.oldIndex + 1} to ${evt.newIndex + 1}`
19                }})
20            )
21        }
22    })
23</script>
```

We create an `orderInfo` signal and modify it whenever a `reordered` event is triggered.

We instruct the [SortableJS](https://sortablejs.github.io/Sortable/) library to dispatch a custom event `reordered` whenever the sortable list is changed. This event contains the order information that we can use to update the `orderInfo` signal.

[← Previous](https://data-star.dev/examples/progressive_load)[Next →](https://data-star.dev/examples/svg_morphing)

---


## Svg Morphing

**Source:** https://data-star.dev/examples/svg_morphing

```
1<svg>
2    <svg id="target">
3        <circle cx="50" cy="100" r="50" fill="red" />
4    </svg>
5    <circle cx="150" cy="100" r="50" fill="red" />
6</svg>
```

Basic Circle Color Change [#](https://data-star.dev/examples/svg_morphing#basic-circle-color-change)
----------------------------------------------------------------------------------------------------

This example demonstrates morphing an SVG circle’s color. Click the button to change the circle from red to blue.

Demo

```
1svgMorphingRouter.Get("/circle_color", func(w http.ResponseWriter, r *http.Request) {
2    sse := datastar.NewSSE(w, r)
3    color := svgColors[rand.N(len(svgColors))]
4    sse.PatchElements(fmt.Sprintf(`<svg id="circle-demo"><circle cx="50" cy="50" r="40" fill="%s" /></svg>`, color))
5})
```

Circle Radius Change [#](https://data-star.dev/examples/svg_morphing#circle-radius-change)
------------------------------------------------------------------------------------------

This example shows how to morph the size of an SVG element. The circle will change to a random radius when you click the button.

Demo

```
1svgMorphingRouter.Get("/circle_size", func(w http.ResponseWriter, r *http.Request) {
2    sse := datastar.NewSSE(w, r)
3    radius := 15 + rand.N(45) // Random radius between 15-60
4    sse.PatchElements(fmt.Sprintf(`<svg id="size-demo"><circle cx="50" cy="50" r="%d" fill="green" /></svg>`, radius))
5})
```

Random Shape Transformation [#](https://data-star.dev/examples/svg_morphing#random-shape-transformation)
--------------------------------------------------------------------------------------------------------

SVG morphing can handle changing between different shape types. This example morphs to a random shape each time you click.

Demo

```
1svgMorphingRouter.Get("/shape_transform", func(w http.ResponseWriter, r *http.Request) {
2    sse := datastar.NewSSE(w, r)
3    shape := svgShapes[rand.N(len(svgShapes))]
4    sse.PatchElements(fmt.Sprintf(`<svg id="shape-demo">%s</svg>`, shape))
5})
```

Multiple Random Elements [#](https://data-star.dev/examples/svg_morphing#multiple-random-elements)
--------------------------------------------------------------------------------------------------

You can morph multiple SVG elements at once. This example updates three circles with random colors and sizes each time you click.

Demo

```
1svgMorphingRouter.Get("/multiple_elements", func(w http.ResponseWriter, r *http.Request) {
 2    sse := datastar.NewSSE(w, r)
 3    color1 := svgColors[rand.N(len(svgColors))]
 4    color2 := svgColors[rand.N(len(svgColors))]
 5    color3 := svgColors[rand.N(len(svgColors))]
 6    r1 := 10 + rand.N(20) // radius 10-30
 7    r2 := 10 + rand.N(20)
 8    r3 := 10 + rand.N(20)
 9    sse.PatchElements(fmt.Sprintf(`<svg id="multi-demo">
10        <circle cx="30" cy="30" r="%d" fill="%s" />
11        <circle cx="70" cy="30" r="%d" fill="%s" />
12        <circle cx="50" cy="70" r="%d" fill="%s" />
13    </svg>`, r1, color1, r2, color2, r3, color3))
14})
```

Animated Sequence [#](https://data-star.dev/examples/svg_morphing#animated-sequence)
------------------------------------------------------------------------------------

This example demonstrates a sequence of SVG morphs that happen automatically when triggered, creating a smooth animation effect.

Demo

```
1svgMorphingRouter.Get("/animated_morph", func(w http.ResponseWriter, r *http.Request) {
 2    sse := datastar.NewSSE(w, r)
 3    
 4    // First morph
 5    sse.PatchElements(`<svg id="animated-demo"><circle cx="50" cy="50" r="30" fill="red" /></svg>`)
 6    time.Sleep(500 * time.Millisecond)
 7    
 8    // Second morph
 9    sse.PatchElements(`<svg id="animated-demo"><circle cx="50" cy="50" r="45" fill="orange" /></svg>`)
10    time.Sleep(500 * time.Millisecond)
11    
12    // Third morph
13    sse.PatchElements(`<svg id="animated-demo"><circle cx="50" cy="50" r="60" fill="yellow" /></svg>`)
14    time.Sleep(500 * time.Millisecond)
15    
16    // Reset
17    sse.PatchElements(`<svg id="animated-demo"><circle cx="50" cy="50" r="20" fill="green" /></svg>`)
18})
```

Key Points [#](https://data-star.dev/examples/svg_morphing#key-points)
----------------------------------------------------------------------

*   SVG elements must be wrapped in an outer `<svg>` container
*   The inner `<svg>` element should have the target ID
*   All SVG element types (circle, rect, path, etc.) can be morphed
*   Multiple SVG elements can be updated in a single morph operation
*   CSS transitions work with SVG morphing for smooth animations

[← Previous](https://data-star.dev/examples/sortable)[Next →](https://data-star.dev/examples/templ_counter)

---


## Templ Counter

**Source:** https://data-star.dev/examples/templ_counter

Demo

Increment Global: 41 Increment User: 0

HTML [#](https://data-star.dev/examples/templ_counter#html)
-----------------------------------------------------------

```
1<div
 2    style="display: flex; gap: var(--size-6)"
 3    data-init="@get('/examples/templ_counter/updates')"
 4>
 5    <!-- Global Counter -->
 6    <button
 7        id="global"
 8        class="info"
 9        data-on:click="@patch('/examples/templ_counter/global')"
10    >
11        Global Clicks: 0
12    </button>
13
14    <!-- User Counter -->
15    <button
16        id="user"
17        class="success"
18        data-on:click="@patch('/examples/templ_counter/user')"
19    >
20        User Clicks: 0
21    </button>
22</div>
```

Explanation [#](https://data-star.dev/examples/templ_counter#explanation)
-------------------------------------------------------------------------

This example demonstrates two counters - a global counter shared across all users and a user-specific counter. The counters are updated via server-sent events (SSE) and increment when clicked.

[← Previous](https://data-star.dev/examples/svg_morphing)[Next →](https://data-star.dev/examples/title_update)

---


## Title Update

**Source:** https://data-star.dev/examples/title_update

Demo

Look at the title change in the browser tab!

Explanation [#](https://data-star.dev/examples/title_update#explanation)
------------------------------------------------------------------------

A user in the Discord channel was asking about needing a plugin similar to htmx’s head support to update title or head elements. With Datastar this is unnecessary as you can just update the title directly with a patch elements event.

```
1event: datastar-patch-elements
2data: selector title
3data: elements <title>08:30:36</title>
```

[← Previous](https://data-star.dev/examples/templ_counter)[Next →](https://data-star.dev/examples/todomvc)

---


## Todomvc

**Source:** https://data-star.dev/examples/todomvc

Explanation [#](https://data-star.dev/examples/todomvc#explanation)
-------------------------------------------------------------------

This is a full implementation of TodoMVC using Datastar. It demonstrates complex state management, including adding, editing, deleting, and filtering todos, all handled through server-sent events.

HTML [#](https://data-star.dev/examples/todomvc#html)
-----------------------------------------------------

```
1<section
 2    id="todomvc"
 3    data-init="@get('/examples/todomvc/updates')"
 4>
 5    <header id="todo-header">
 6        <input
 7            type="checkbox"
 8            data-on:click__prevent="@post('/examples/todomvc/-1/toggle')"
 9            data-init="el.checked = false"
10        />
11        <input
12            id="new-todo"
13            type="text"
14            placeholder="What needs to be done?"
15            data-signals:input
16            data-bind:input
17            data-on:keydown="
18                evt.key === 'Enter' && $input.trim() && @patch('/examples/todomvc/-1') && ($input = '');
19            "
20        />
21    </header>
22    <ul id="todo-list">
23        <!-- Todo items are dynamically rendered here -->
24    </ul>
25    <div id="todo-actions">
26        <span>
27            <strong>0</strong> items pending
28        </span>
29        <button class="small info" data-on:click="@put('/examples/todomvc/mode/0')">
30            All
31        </button>
32        <button class="small" data-on:click="@put('/examples/todomvc/mode/1')">
33            Pending
34        </button>
35        <button class="small" data-on:click="@put('/examples/todomvc/mode/2')">
36            Completed
37        </button>
38        <button class="error small" aria-disabled="true">
39            Delete
40        </button>
41        <button class="warning small" data-on:click="@put('/examples/todomvc/reset')">
42            Reset
43        </button>
44    </div>
45</section>
```

[← Previous](https://data-star.dev/examples/title_update)[Next →](https://data-star.dev/examples/web_component)

---


## Web Component

**Source:** https://data-star.dev/examples/web_component

Explanation [#](https://data-star.dev/examples/web_component#explanation)
-------------------------------------------------------------------------

This is an example of two-way binding with a web component that reverses a string. Normally, the web component would output the reversed value, but in this example, all it does is perform the logic and dispatch an event containing the result, which is then displayed.

```
1<label>
2    Reversed
3    <input type="text" value="Your Name" data-bind:_name/>
4</label>
5<span data-signals:_reversed data-text="$_reversed"></span>
6<reverse-component
7    data-on:reverse="$_reversed = evt.detail.value"
8    data-attr:name="$_name"
9></reverse-component>
```

The `name` attribute value is bound to the `$_name` signal's value, and an event listener modifies the `$_reversed` signal's value sent in the `reverse` event. The web component observes changes to the `name` attribute and responds by reversing the string and dispatching a `reverse` event containing the resulting value.

```
1class ReverseComponent extends HTMLElement {
 2    static get observedAttributes() {
 3        return ["name"];
 4    }
 5
 6    attributeChangedCallback(name, oldValue, newValue) {
 7        const len = newValue.length;
 8        let value = Array(len);
 9        let i = len - 1;
10        for (const char of newValue) {
11            value[i--] = char.codePointAt(0);
12        }
13        value = String.fromCodePoint(...value);
14        this.dispatchEvent(new CustomEvent("reverse", { detail: { value } }));
15    }
16}
17
18customElements.define("reverse-component", ReverseComponent);
```

[← Previous](https://data-star.dev/examples/todomvc)[](https://data-star.dev/examples/web_component)

---
