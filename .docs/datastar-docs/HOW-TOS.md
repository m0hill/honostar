Title: How to bind keydown events to specific keys

URL Source: https://data-star.dev/how_tos/bind_keydown_events_to_specific_keys

Markdown Content:
[](https://data-star.dev/how_tos/bind_keydown_events_to_specific_keys)[Next →](https://data-star.dev/how_tos/keep_datastar_code_dry)
The [`data-on`](https://data-star.dev/reference/attributes#data-on) attribute allows us to attach an event listener to any element, and run an expression whenever the event is triggered. We can use this to listen for keydown events and run an expression only when a specific key or key combination is pressed.

## Goal [#](https://data-star.dev/how_tos/bind_keydown_events_to_specific_keys#goal)

Our goal is to show an alert whenever the user presses the `Enter` key, or a combination of the `Ctrl` and `L` keys.

Demo
Press `Enter` or `Ctrl + L`

## Steps [#](https://data-star.dev/how_tos/bind_keydown_events_to_specific_keys#steps)

The `data-on:keydown` attribute will listen for keydown events only on the element on which it is placed, by default. We can listen for events on the `window` element to capture keydown events globally, by adding the `__window` modifier.

Copied!

`1<div data-on:keydown__window="alert('Key pressed')"></div>`

This will show an alert whenever the user presses _any_ key. To limit the alert to only the `Enter` key, we can use the `evt.key` property to check the key that was pressed. The `evt` variable represents the event object and is always available in the expression.

Copied!

`1<div data-on:keydown__window="evt.key === 'Enter' && alert('Key pressed')"></div>`

We can add the `Ctrl` and `L` key combination by checking the `evt.ctrlKey` and `evt.key` properties.

Copied!

`1<div data-on:keydown__window="evt.ctrlKey && evt.key === 'l' && alert('Key pressed')"></div>`

Finally, we can combine the two expressions to show an alert whenever the user presses the `Enter` key, or the `Ctrl` and `L` keys.

Copied!

`1<div data-on:keydown__window="(evt.key === 'Enter' || (evt.ctrlKey && evt.key === 'l')) && alert('Key pressed')"></div>`

Sometimes, we may want to prevent the default behavior of the keydown event, such as submitting a form when the `Enter` key is pressed. We can do this by calling `evt.preventDefault()`.

Copied!

`1<div data-on:keydown__window="evt.key === 'Enter' && (evt.preventDefault(), alert('Key pressed'))"></div>`

## Conclusion [#](https://data-star.dev/how_tos/bind_keydown_events_to_specific_keys#conclusion)

The `evt` variable is always available in [`data-on`](https://data-star.dev/reference/attributes#data-on) attribute expressions. In the case of the [`keydown`](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event) event, which is a [`KeyboardEvent`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent), we can perform actions conditionally, based on any of the event’s properties.

[](https://data-star.dev/how_tos/bind_keydown_events_to_specific_keys)[Next →](https://data-star.dev/how_tos/keep_datastar_code_dry)

Title: How to keep Datastar code DRY

URL Source: https://data-star.dev/how_tos/keep_datastar_code_dry

Markdown Content:
[← Previous](https://data-star.dev/how_tos/bind_keydown_events_to_specific_keys)[Next →](https://data-star.dev/how_tos/load_more_list_items)
The question of how to keep things DRY (Don’t Repeat Yourself) comes up often when using Datastar. One commonly used example concerns preventing the repetition of a backend action.

Copied!

```
1<button data-on:click="@get('/endpoint')">Click me</button>
2<button data-on:click="@get('/endpoint')">No, click me!</button>
3<button data-on:click="@get('/endpoint')">Click us all!</button>
```

The common misconception is that Datastar should provide shorthand syntax for the repeated `@get` action. The answer is that this should be solved using your templating language. For example:

Copied!

```
1{% set action = "@get('/endpoint')" %}
2<button data-on:click="{{ action }}">Click me</button>
3<button data-on:click="{{ action }}">No, click me!</button>
4<button data-on:click="{{ action }}">Click us all!</button>
```

Alternatively, using a loop:

Copied!

```
1{% set labels = ['Click me', 'No, click me!', 'Click us all!'] %}
2{% for label in labels %}
3    <button data-on:click="@get('/endpoint')">{{ label }}</button>
4{% endfor %}
```

Thanks to [event bubbling](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling), a single event listener can be attached to a parent element instead of each button:

Copied!

```
1<div data-on:click="evt.target.tagName == 'BUTTON'
2    && @get('/endpoint')
3">
4    <button>Click me</button>
5    <button>No, click me!</button>
6    <button>Click us all!</button>
7</div>
```

This is the pattern that both the [Blinksy](https://play.putyourlightson.com/blinksy) and [Checkboxes](https://checkboxes.andersmurphy.com/) demos use to prevent registering multiple event listeners for the same action, while being able to send a corresponding ID for each button clicked.

Copied!

```
1<div data-on:click="evt.target.tagName == 'BUTTON'
2    && ($id = evt.target.dataset.id)
3    && @get('/endpoint')
4">
5    <button data-id="1">Click me</button>
6    <button data-id="2">No, click me!</button>
7    <button data-id="3">Click us all!</button>
8</div>
```

[← Previous](https://data-star.dev/how_tos/bind_keydown_events_to_specific_keys)[Next →](https://data-star.dev/how_tos/load_more_list_items)

Title: How to load more list items

URL Source: https://data-star.dev/how_tos/load_more_list_items

Markdown Content:
[← Previous](https://data-star.dev/how_tos/keep_datastar_code_dry)[Next →](https://data-star.dev/how_tos/poll_the_backend_at_regular_intervals)
Loading more list items into the DOM from the backend is a common alternative to pagination. What makes it different is that we need to append the new items to the existing list, rather than replace them.

## Goal [#](https://data-star.dev/how_tos/load_more_list_items#goal)

Our goal is to incrementally append list items into a specific part of the DOM, each time a button is clicked. Once five items are visible, the button should be removed.

Demo

- Item 1

## Steps [#](https://data-star.dev/how_tos/load_more_list_items#steps)

We’ll give the list item container and the button unique IDs, so that we can target them individually.

We’ll use a `data-signals` attribute to set the initial `offset` to `1`, and a `data-on:click` button that will send a `GET` request to the backend.

Copied!

```
1<div id="list">
2<div>Item 1</div>
3</div>
4<button id="load-more"
5        data-signals:offset="1"
6        data-on:click="@get('/how_tos/load_more/data')">
7Click to load another item
8</button>
```

The backend will receive the `offset` signal and, if not above the max number of allowed items, will return the next item to be appended to the list.

We’ll set up our backend to send a [`datastar-patch-elements`](https://data-star.dev/reference/sse_events#datastar-patch-elements) event with the `selector` option set to `#list` and the `mode` option set to `append`. This tells Datastar to _append_ the elements _into_ the `#list` container (rather than the default behaviour of replacing it).

Copied!

```
1event: datastar-patch-elements
2data: selector #list
3data: mode append
4data: elements <div>Item 2</div>
```

In addition, we’ll send a [`datastar-patch-signals`](https://data-star.dev/reference/sse_events#datastar-patch-signals) event to update the `offset`.

Copied!

```
1event: datastar-patch-signals
2data: signals {offset: 2}
```

In the case when all five list items have been shown, we’ll remove the button from the DOM entirely.

Copied!

```
1event: datastar-patch-elements
2data: selector #load-more
3data: mode remove
```

Here’s how it might look using the SDKs.

Copied!

```
1(require
 2  '[starfederation.datastar.clojure.api :as d*]
 3  '[starfederation.datastar.clojure.adapter.http-kit :refer [->sse-response on-open]]
 4  '[some.hiccup.library :refer [html]]
 5  '[some.json.library :refer [read-json-str write-json-str]]))
 6
 7
 8(def max-offset 5)
 9
10(defn handler [ring-request]
11  (->sse-response ring-request
12    {on-open
13     (fn [sse]
14       (let [d*-signals (-> ring-request d*/get-signals read-json-str)
15             offset (get d*-signals "offset")
16             limit 1
17             new-offset (+ offset limit)]
18
19         (d*/patch-elements! sse
20                             (html [:div "Item " new-offset])
21                             {d*/selector   "#list"
22                              d*/merge-mode d*/mm-append})
23
24         (if (< new-offset max-offset)
25           (d*/patch-signals! sse (write-json-str {"offset" new-offset}))
26           (d*/remove-fragment! sse "#load-more"))
27
28         (d*/close-sse! sse)))}))
```

Copied!

```
1using System.Text.Json;
 2using StarFederation.Datastar;
 3using StarFederation.Datastar.DependencyInjection;
 4
 5public class Program
 6{
 7    public record OffsetSignals(int offset);
 8
 9    public static void Main(string[] args)
10    {
11        var builder = WebApplication.CreateBuilder(args);
12        builder.Services.AddDatastar();
13        var app = builder.Build();
14
15        app.MapGet("/more", async (IDatastarService datastarService) =>
16        {
17            var max = 5;
18            var limit = 1;
19            var signals = await datastarService.ReadSignalsAsync<OffsetSignals>();
20            var offset = signals.offset;
21            if (offset < max)
22            {
23                var newOffset = offset + limit;
24                await datastarService.PatchElementsAsync($"<div>Item {newOffset}</div>", new()
25                {
26                    Selector = "#list",
27                    PatchMode = PatchElementsMode.Append,
28                });
29                if (newOffset < max)
30                    await datastarService.PatchSignalsAsync(new OffsetSignals(newOffset));
31                else
32                    await datastarService.RemoveElementAsync("#load-more");
33            }
34        });
35
36        app.Run();
37    }
38}
```

Copied!

```
1import (
 2    "fmt"
 3    "net/http"
 4
 5    "github.com/go-chi/chi/v5"
 6    "github.com/starfederation/datastar-go/datastar"
 7)
 8
 9type OffsetSignals struct {
10    Offset int `json:"offset"`
11}
12
13signals := &OffsetSignals{}
14if err := datastar.ReadSignals(r, signals); err != nil {
15    http.Error(w, err.Error(), http.StatusBadRequest)
16}
17
18max := 5
19limit := 1
20offset := signals.Offset
21
22sse := datastar.NewSSE(w, r)
23
24if offset < max {
25    newOffset := offset + limit
26    sse.PatchElements(fmt.Sprintf(`<div>Item %d</div>`, newOffset),
27        datastar.WithSelectorID("list"),
28        datastar.WithModeAppend(),
29    )
30    if newOffset < max {
31        sse.PatchSignals([]byte(fmt.Sprintf(`{offset: %d}`, newOffset)))
32    } else {
33        sse.RemoveElements(`#load-more`)
34    }
35}
```

No example found for Java

Copied!

```
1@Serializable
 2data class OffsetSignals(
 3    val offset: Int,
 4)
 5
 6val signals =
 7    readSignals(
 8        request,
 9        { json: String -> Json.decodeFromString<OffsetSignals>(json) },
10    )
11
12val max = 5
13val limit = 1
14val offset = signals.offset
15
16val generator = ServerSentEventGenerator(response)
17
18if (offset < max) {
19    val newOffset = offset + limit
20
21    generator.patchElements(
22        elements = "<div>Item $newOffset</div>",
23        options =
24            PatchElementsOptions(
25                selector = "#list",
26                mode = ElementPatchMode.Append,
27            ),
28    )
29
30    if (newOffset < max) {
31        generator.patchSignals(
32            signals = """{"offset": $newOffset}""",
33        )
34    } else {
35        generator.patchElements(
36            options =
37                PatchElementsOptions(
38                    selector = "#load-more",
39                    mode = ElementPatchMode.Remove,
40                ),
41        )
42    }
43}
```

Copied!

```
1use starfederation\datastar\enums\ElementPatchMode;
 2use starfederation\datastar\ServerSentEventGenerator;
 3
 4$signals = ServerSentEventGenerator::readSignals();
 5
 6$max = 5;
 7$limit = 1;
 8$offset = $signals['offset'] ?? 1;
 9
10$sse = new ServerSentEventGenerator();
11
12if ($offset < $max) {
13    $newOffset = $offset + $limit;
14    $sse->patchElements("<div>Item $newOffset</div>", [
15        'selector' => '#list',
16        'mode' => ElementPatchMode::Append,
17    ]);
18    if (newOffset < $max) {
19        $sse->patchSignals(['offset' => $newOffset]);
20    } else {
21        $sse->removeElements('#load-more');
22    }
23}
```

Copied!

```
1from datastar_py import ServerSentEventGenerator as SSE
 2from datastar_py.consts import ElementPatchMode
 3from datastar_py.fastapi import datastar_response, ReadSignals
 4
 5MAX_ITEMS = 5
 6
 7@app.get("/how_tos/load_more/data")
 8@datastar_response
 9async def load_data(signals: ReadSignals):
10    if signals["offset"] < MAX_ITEMS:
11        new_offset = signals["offset"] + 1
12        yield SSE.patch_elements(
13            f"<div>Item {new_offset}</div>",
14            mode=ElementPatchMode.APPEND,
15            selector="#list"
16        )
17        if new_offset < MAX_ITEMS:
18            yield SSE.patch_signals({"offset": new_offset})
19        else:
20            yield SSE.remove_elements("#load-more")
```

No example found for Ruby

No example found for Rust

No example found for TypeScript

## Conclusion [#](https://data-star.dev/how_tos/load_more_list_items#conclusion)

While using the default mode of `outer` is generally recommended, appending to a list is a good example of when to use the `append` mode.

[← Previous](https://data-star.dev/how_tos/keep_datastar_code_dry)[Next →](https://data-star.dev/how_tos/poll_the_backend_at_regular_intervals)

Title: How to poll the backend at regular intervals

URL Source: https://data-star.dev/how_tos/poll_the_backend_at_regular_intervals

Markdown Content:
[← Previous](https://data-star.dev/how_tos/load_more_list_items)[Next →](https://data-star.dev/how_tos/prevent_sse_connections_closing)
Polling is a pull-based mechanism for fetching data from the server at regular intervals. It is useful when you want to refresh the UI on the frontend, based on real-time data from the backend.

This in contrast to a push-based mechanism, in which a long-lived SSE connection is kept open between the client and the server, and the server pushes updates to the client whenever necessary. Push-based mechanisms are more efficient than polling, and can be achieved using Datastar, but may be less desirable for some backends.

In PHP, for example, keeping long-lived SSE connections is fine for a dashboard in which users are authenticated, as the number of connections are limited. For a public-facing website, however, it is not recommended to open many long-lived connections, due to the architecture of most PHP servers.

## Goal [#](https://data-star.dev/how_tos/poll_the_backend_at_regular_intervals#goal)

Our goal is to poll the backend at regular intervals (starting at 5 second intervals) and update the UI accordingly. The backend will determine changes to the DOM and be able to control the rate at which the frontend polls based on some criteria. For this example, we will simply output the server time, increasing the polling frequency to 1 second during the last 10 seconds of every minute. The criteria could of course be anything such as the number of times previously polled, the user’s role, load on the server, etc.

## Steps [#](https://data-star.dev/how_tos/poll_the_backend_at_regular_intervals#steps)

The `data-on-interval` attribute allows us to run an expression at a regular interval. We’ll use it to send a `GET` request to the backend, and use the `__duration` modifier to set the interval duration.

Copied!

```
1<div id="time"
2     data-on-interval__duration.5s="@get('/endpoint')"
3></div>
```

In addition to the interval, we could also run the expression immediately by adding `.leading` to the modifier.

Copied!

```
1<div id="time"
2     data-on-interval__duration.5s.leading="@get('/endpoint')"
3></div>
```

Most of the time, however, we’d just render the current time on page load using a backend templating language.

Copied!

```
1<div id="time"
2     data-on-interval__duration.5s="@get('/endpoint')"
3>
4     {{ now }}
5</div>
```

Now our backend can respond to each request with a [`datastar-patch-elements`](https://data-star.dev/reference/sse_events#datastar-patch-elements) event with an updated version of the element.

Copied!

```
1event: datastar-patch-elements
2data: elements <div id="time" data-on-interval__duration.5s="@get('/endpoint')">
3data: elements     {{ now }}
4data: elements </div>
```

Be careful not to add `.leading` to the modifier in the response, as it will cause the frontend to immediately send another request.

Here’s how it might look using the SDKs.

Copied!

```
1(require
 2  '[starfederation.datastar.clojure.api :as d*]
 3  '[starfederation.datastar.clojure.adapter.http-kit :refer [->sse-response on-open]])
 4  '[some.hiccup.library :refer [html]])
 5
 6(import
 7  'java.time.format.DateTimeFormatter
 8  'java.time.LocalDateTime)
 9
10(def formatter (DateTimeFormatter/ofPattern "YYYY-MM-DD HH:mm:ss"))
11
12(defn handle [ring-request]
13   (->sse-response ring-request
14     {on-open
15      (fn [sse]
16        (d*/patch-elements! sse
17          (html [:div#time {:data-on-interval__duration.5s (d*/sse-get "/endpoint")}
18                  (LocalDateTime/.format (LocalDateTime/now) formatter)])))}))
19
20        (d*/close-sse! sse))}))
```

Copied!

```
1using StarFederation.Datastar.DependencyInjection;
 2
 3app.MapGet("/endpoint", async (IDatastarService datastarService) =>
 4{
 5    var currentTime = DateTime.Now.ToString("yyyy-MM-dd hh:mm:ss");
 6    await datastarService.PatchElementsAsync($"""
 7        <div id="time" data-on-interval__duration.5s="@get('/endpoint')">
 8            {currentTime}
 9        </div>
10    """);
11});
```

Copied!

```
1import (
 2    "time"
 3    "github.com/starfederation/datastar-go/datastar"
 4)
 5
 6currentTime := time.Now().Format("2006-01-02 15:04:05")
 7
 8sse := datastar.NewSSE(w, r)
 9sse.PatchElements(fmt.Sprintf(`
10    <div id="time" data-on-interval__duration.5s="@get('/endpoint')">
11        %s
12    </div>
13`, currentTime))
```

No example found for Java

Copied!

```
1val now: LocalDateTime = currentTime()
 2
 3val generator = ServerSentEventGenerator(response)
 4
 5generator.patchElements(
 6    elements =
 7        """
 8        <div id="time" data-on-interval__duration.5s="@get('/endpoint')">
 9            $now
10        </div>
11        """.trimIndent(),
12)
```

Copied!

```
1use starfederation\datastar\ServerSentEventGenerator;
 2
 3$currentTime = date('Y-m-d H:i:s');
 4
 5$sse = new ServerSentEventGenerator();
 6$sse->patchElements(`
 7    <div id="time"
 8         data-on-interval__duration.5s="@get('/endpoint')"
 9    >
10        $currentTime
11    </div>
12`);
```

Copied!

```
1from datastar_py import ServerSentEventGenerator as SSE
 2from datastar_py.sanic import DatastarResponse
 3
 4@app.get("/endpoint")
 5async def endpoint():
 6    current_time = datetime.now()
 7
 8    return DatastarResponse(SSE.patch_elements(f"""
 9        <div id="time" data-on-interval__duration.5s="@get('/endpoint')">
10            {current_time:%Y-%m-%d %H:%M:%S}
11        </div>
12    """))
```

Copied!

```
1datastar = Datastar.new(request:, response:)
 2
 3current_time = Time.now.strftime('%Y-%m-%d %H:%M:%S')
 4
 5datastar.patch_elements <<~FRAGMENT
 6    <div id="time"
 7         data-on-interval__duration.5s="@get('/endpoint')"
 8    >
 9        #{current_time}
10    </div>
11FRAGMENT
```

Copied!

```
1use datastar::prelude::*;
 2use chrono::Local;
 3use async_stream::stream;
 4
 5let current_time = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
 6
 7Sse(stream! {
 8    yield PatchElements::new(
 9        format!(
10            "<div id='time' data-on-interval__duration.5s='@get(\"/endpoint\")'>{}</div>",
11            current_time
12        )
13    ).into();
14})
```

Copied!

```
1import { createServer } from "node:http";
 2import { ServerSentEventGenerator } from "../npm/esm/node/serverSentEventGenerator.js";
 3
 4const server = createServer(async (req, res) => {
 5  const currentTime = new Date().toISOString();
 6
 7  ServerSentEventGenerator.stream(req, res, (sse) => {
 8    sse.patchElements(`
 9       <div id="time"
10          data-on-interval__duration.5s="@get('/endpoint')"
11       >
12         ${currentTime}
13       </div>
14    `);
15  });
16});
```

Our second requirement was that the polling frequency should increase to 1 second during the last 10 seconds of every minute. To make this possible, we’ll calculate and output the interval duration based on the current seconds of the minute.

Copied!

```
1(require
 2  '[starfederation.datastar.clojure.api :as d*]
 3  '[starfederation.datastar.clojure.adapter.http-kit :refer [->sse-response on-open]])
 4  '[some.hiccup.library :refer [html]])
 5
 6(import
 7  'java.time.format.DateTimeFormatter
 8  'java.time.LocalDateTime)
 9
10(def date-time-formatter (DateTimeFormatter/ofPattern "YYYY-MM-DD HH:mm:ss"))
11(def seconds-formatter (DateTimeFormatter/ofPattern "ss"))
12
13(defn handle [ring-request]
14  (->sse-response ring-request
15    {on-open
16     (fn [sse]
17       (let [now (LocalDateTime/now)
18             current-time (LocalDateTime/.format now date-time-formatter)
19             seconds (LocalDateTime/.format now seconds-formatter)
20             duration (if (neg? (compare seconds "50"))
21                         "5"
22                         "1")]
23         (d*/patch-elements! sse
24           (html [:div#time {(str "data-on-interval__duration." duration "s")
25                             (d*/sse-get "/endpoint")}
26                   current-time]))))}))
27
28         (d*/close-sse! sse))}))
```

Copied!

```
1using StarFederation.Datastar.DependencyInjection;
 2
 3app.MapGet("/endpoint", async (IDatastarService datastarService) =>
 4{
 5    var currentTime = DateTime.Now.ToString("yyyy-MM-dd hh:mm:ss");
 6    var currentSeconds = DateTime.Now.Second;
 7    var duration = currentSeconds < 50 ? 5 : 1;
 8    await datastarService.PatchElementsAsync($"""
 9        <div id="time" data-on-interval__duration.{duration}s="@get('/endpoint')">
10            {currentTime}
11        </div>
12    """);
13});
```

Copied!

```
1import (
 2    "time"
 3    "github.com/starfederation/datastar-go/datastar"
 4)
 5
 6currentTime := time.Now().Format("2006-01-02 15:04:05")
 7currentSeconds := time.Now().Format("05")
 8duration := 1
 9if currentSeconds < "50" {
10    duration = 5
11}
12
13sse := datastar.NewSSE(w, r)
14sse.PatchElements(fmt.Sprintf(`
15    <div id="time" data-on-interval__duration.%ds="@get('/endpoint')">
16        %s
17    </div>
18`, duration, currentTime))
```

No example found for Java

Copied!

```
1val now: LocalDateTime = currentTime()
 2val currentSeconds = now.second
 3val duration = if (currentSeconds < 50) 5 else 1
 4
 5val generator = ServerSentEventGenerator(response)
 6
 7generator.patchElements(
 8    elements =
 9        """
10        <div id="time" data-on-interval__duration.${duration}s="@get('/endpoint')">
11            $now
12        </div>
13        """.trimIndent(),
14)
```

Copied!

```
1use starfederation\datastar\ServerSentEventGenerator;
 2
 3$currentTime = date('Y-m-d H:i:s');
 4$currentSeconds = date('s');
 5$duration = $currentSeconds < 50 ? 5 : 1;
 6
 7$sse = new ServerSentEventGenerator();
 8$sse->patchElements(`
 9    <div id="time"
10         data-on-interval__duration.${duration}s="@get('/endpoint')"
11    >
12        $currentTime
13    </div>
14`);
```

Copied!

```
1from datastar_py import ServerSentEventGenerator as SSE
 2from datastar_py.sanic import DatastarResponse
 3
 4@app.get("/endpoint")
 5async def endpoint():
 6    current_time = datetime.now()
 7    duration = 5 if current_time.seconds < 50 else 1
 8
 9    return DatastarResponse(SSE.patch_elements(f"""
10        <div id="time" data-on-interval__duration.{duration}s="@get('/endpoint')">
11            {current_time:%Y-%m-%d %H:%M:%S}
12        </div>
13    """))
```

Copied!

```
1datastar = Datastar.new(request:, response:)
 2
 3now = Time.now
 4current_time = now.strftime('%Y-%m-%d %H:%M:%S')
 5current_seconds = now.strftime('%S').to_i
 6duration = current_seconds < 50 ? 5 : 1
 7
 8datastar.patch_elements <<~FRAGMENT
 9    <div id="time"
10         data-on-interval__duration.#{duration}s="@get('/endpoint')"
11    >
12        #{current_time}
13    </div>
14FRAGMENT
```

Copied!

```
1use datastar::prelude::*;
 2use chrono::Local;
 3use async_stream::stream;
 4
 5let current_time = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
 6let current_seconds = Local::now().second();
 7let duration = if current_seconds < 50 {
 8    5
 9} else {
10    1
11};
12
13Sse(stream! {
14    yield PatchElements::new(
15        format!(
16            "<div id='time' data-on-interval__duration.{}s='@get(\"/endpoint\")'>{}</div>",
17            duration,
18            current_time,
19        )
20    ).into();
21})
```

Copied!

```
1import { createServer } from "node:http";
 2import { ServerSentEventGenerator } from "../npm/esm/node/serverSentEventGenerator.js";
 3
 4const server = createServer(async (req, res) => {
 5  const currentTime = new Date();
 6  const duration = currentTime.getSeconds > 50 ? 5 : 1;
 7
 8  ServerSentEventGenerator.stream(req, res, (sse) => {
 9    sse.patchElements(`
10       <div id="time"
11          data-on-interval__duration.${duration}s="@get('/endpoint')"
12       >
13         ${currentTime.toISOString()}
14       </div>
15    `);
16  });
17});
```

## Conclusion [#](https://data-star.dev/how_tos/poll_the_backend_at_regular_intervals#conclusion)

Using this approach, we not only end up with a way to poll the backend at regular intervals, but we can also control the rate at which the frontend polls based on whatever criteria our backend requires.

[← Previous](https://data-star.dev/how_tos/load_more_list_items)[Next →](https://data-star.dev/how_tos/prevent_sse_connections_closing)

Title: How to prevent SSE connections closing

URL Source: https://data-star.dev/how_tos/prevent_sse_connections_closing

Markdown Content:
[← Previous](https://data-star.dev/how_tos/poll_the_backend_at_regular_intervals)[Next →](https://data-star.dev/how_tos/redirect_the_page_from_the_backend)
When a page is hidden (in a background tab, for example), the default behavior is for the SSE connection to be closed, and reopened when the page becomes visible again. This is to save resources on both the client and server.

To keep the connection open even when the page is hidden, you can set the [`openWhenHidden`](https://data-star.dev/reference/actions#openWhenHidden) option to `true`.

Copied!

`1<button data-on:click="@get('/endpoint', {openWhenHidden: true})"></button>`

### CQRS Pattern [#](https://data-star.dev/how_tos/prevent_sse_connections_closing#cqrs-pattern)

When using the [CQRS pattern](https://martinfowler.com/bliki/CQRS.html), it’s best to design event streams with interruptions in mind, since they can occur for many reasons beyond just tab switching. The simplest way to ensure resilience is to use a “fat morph” approach: send the complete desired state of the main content area with each update instead of incremental changes like append, which are much more vulnerable to interruptions.

Here’s a simple example of a CQRS approach in which the main content area is always kept up to date. This way, you can leave `openWhenHidden` as is, and if the SSE connection is interrupted for any reason, the next event will contain the complete and correct state of the main content area.

Copied!

```
1<div data-init="@get('/cqrs_endpoint')"></div>
2<div id="main">
3    ...
4</div>
```

[← Previous](https://data-star.dev/how_tos/poll_the_backend_at_regular_intervals)[Next →](https://data-star.dev/how_tos/redirect_the_page_from_the_backend)

Title: How to redirect the page from the backend

URL Source: https://data-star.dev/how_tos/redirect_the_page_from_the_backend

Markdown Content:
[← Previous](https://data-star.dev/how_tos/prevent_sse_connections_closing)[](https://data-star.dev/how_tos/redirect_the_page_from_the_backend)
Redirecting to another page is a common task that can be done from the backend by patching a `script` tag into the DOM using a [`datastar-patch-elements`](https://data-star.dev/reference/sse_events#datastar-patch-elements) SSE event. Since this results in a browser redirect, existing signals will _not_ persist to the new page.

## Goal [#](https://data-star.dev/how_tos/redirect_the_page_from_the_backend#goal)

Our goal is to indicate to the user that they will be redirected, wait 3 seconds, and then redirect them to `/guide`, all from the backend.

Demo
Steps [#](https://data-star.dev/how_tos/redirect_the_page_from_the_backend#steps)

---

We’ll place a `data-on:click` attribute on a button and use the `get` action to send a `GET` request to the backend. We’ll include an empty indicator `div` to show the user that they will be redirected.

Copied!

```
1<button data-on:click="@get('/endpoint')">
2    Click to be redirected from the backend
3</button>
4<div id="indicator"></div>
```

We’ll set up our backend to first send a `datastar-patch-elements` event with a populated indicator fragment, then wait 3 seconds, and then send another `datastar-patch-elements` SSE event to append a `script` tag that redirects the page.

Copied!

```
1event: datastar-patch-elements
2data: elements <div id="indicator">Redirecting in 3 seconds...</div>
3
4// Wait 3 seconds
5
6event: datastar-patch-elements
7data: selector body
8data: mode append
9data: elements <script>window.location.href = "/guide"</script>
```

All SDKs provide an `ExecuteScript` helper function that wraps the provided code in a `script` tag and patches it into the DOM.

Copied!

```
1(require
 2  '[starfederation.datastar.clojure.api :as d*]
 3  '[starfederation.datastar.clojure.adapter.http-kit :refer [->sse-response on-open]]
 4  '[some.hiccup.library :refer [html]])
 5
 6
 7(defn handle [ring-request]
 8  (->sse-response ring-request
 9    {on-open
10      (fn [sse]
11        (d*/patch-elements! sse
12          (html [:div#indicator "Redirecting in 3 seconds..."]))
13        (Thread/sleep 3000)
14        (d*/execute-script! sse "window.location = \"/guide\"")
15        (d*/close-sse! sse)}))
```

Copied!

```
1using StarFederation.Datastar.DependencyInjection;
2
3app.MapGet("/redirect", async (IDatastarService datastarService) =>
4{
5    await datastarService.PatchElementsAsync("""<div id="indicator">Redirecting in 3 seconds...</div>""");
6    await Task.Delay(TimeSpan.FromSeconds(3));
7    await datastarService.ExecuteScriptAsync("""window.location = "/guide";""");
8});
```

Copied!

```
1import (
 2    "time"
 3    "github.com/starfederation/datastar-go/datastar"
 4)
 5
 6sse := datastar.NewSSE(w, r)
 7sse.PatchElements(`
 8    <div id="indicator">Redirecting in 3 seconds...</div>
 9`)
10time.Sleep(3 * time.Second)
11sse.ExecuteScript(`
12    window.location = "/guide"
13`)
```

No example found for Java

Copied!

```
1val generator = ServerSentEventGenerator(response)
 2
 3generator.patchElements(
 4    elements =
 5        """
 6        <div id="indicator">Redirecting in 3 seconds...</div>
 7        """.trimIndent(),
 8)
 9
10Thread.sleep(3 * ONE_SECOND)
11
12generator.executeScript(
13    script = "window.location.href = '/success'",
14)
```

Copied!

```
1use starfederation\datastar\ServerSentEventGenerator;
 2
 3$sse = new ServerSentEventGenerator();
 4$sse->patchElements(`
 5    <div id="indicator">Redirecting in 3 seconds...</div>
 6`);
 7sleep(3);
 8$sse->executeScript(`
 9    window.location = "/guide"
10`);
```

Copied!

```
1from datastar_py import ServerSentEventGenerator as SSE
2from datastar_py.sanic import datastar_response
3
4@app.get("/redirect")
5@datastar_response
6async def redirect_from_backend():
7    yield SSE.patch_elements('<div id="indicator">Redirecting in 3 seconds...</div>')
8    await asyncio.sleep(3)
9    yield SSE.execute_script('window.location = "/guide"')
```

Copied!

```
1datastar = Datastar.new(request:, response:)
2
3datastar.stream do |sse|
4  sse.patch_elements '<div id="indicator">Redirecting in 3 seconds...</div>'
5  sleep 3
6  sse.execute_script 'window.location = "/guide"'
7end
```

Copied!

```
1use datastar::prelude::*;
2use async_stream::stream;
3use core::time::Duration;
4
5Sse(stream! {
6    yield PatchElements::new("<div id='indicator'>Redirecting in 3 seconds...</div>").into();
7    tokio::time::sleep(core::time::Duration::from_secs(3)).await;
8    yield ExecuteScript::new("window.location = '/guide'").into();
9});
```

Copied!

```
1import { createServer } from "node:http";
 2import { ServerSentEventGenerator } from "../npm/esm/node/serverSentEventGenerator.js";
 3
 4const server = createServer(async (req, res) => {
 5
 6  ServerSentEventGenerator.stream(req, res, async (sse) => {
 7    sse.patchElements(`
 8      <div id="indicator">Redirecting in 3 seconds...</div>
 9    `);
10
11    setTimeout(() => {
12      sse.executeScript(`window.location = "/guide"`);
13    }, 3000);
14  });
15});
```

Note that in Firefox, if a redirect happens within a `script` tag then the URL is _replaced_, rather than _pushed_, meaning that the previous URL won’t show up in the back history (or back/forward navigation).

To work around this, you can wrap the redirect in a `setTimeout` function call. See [issue #529](https://github.com/starfederation/datastar/issues/529) for reference.

Copied!

```
1(require
 2  '[starfederation.datastar.clojure.api :as d*]
 3  '[starfederation.datastar.clojure.adapter.http-kit :refer [->sse-response on-open]]
 4  '[some.hiccup.library :refer [html]])
 5
 6
 7(defn handle [ring-request]
 8  (->sse-response ring-request
 9    {on-open
10      (fn [sse]
11        (d*/patch-elements! sse
12          (html [:div#indicator "Redirecting in 3 seconds..."]))
13        (Thread/sleep 3000)
14        (d*/execute-script! sse
15          "setTimeout(() => window.location = \"/guide\")"
16        (d*/close-sse! sse))}))
```

Copied!

```
1using StarFederation.Datastar.DependencyInjection;
2
3app.MapGet("/redirect", async (IDatastarService datastarService) =>
4{
5    await datastarService.PatchElementsAsync("""<div id="indicator">Redirecting in 3 seconds...</div>""");
6    await Task.Delay(TimeSpan.FromSeconds(3));
7    await datastarService.ExecuteScriptAsync("""setTimeout(() => window.location = "/guide");""");
8});
```

Copied!

```
1import (
 2    "time"
 3    "github.com/starfederation/datastar-go/datastar"
 4)
 5
 6sse := datastar.NewSSE(w, r)
 7sse.PatchElements(`
 8    <div id="indicator">Redirecting in 3 seconds...</div>
 9`)
10time.Sleep(3 * time.Second)
11sse.ExecuteScript(`
12    setTimeout(() => window.location = "/guide")
13`)
```

No example found for Java

Copied!

```
1val generator = ServerSentEventGenerator(response)
 2
 3generator.patchElements(
 4    elements =
 5        """
 6        <div id="indicator">Redirecting in 3 seconds...</div>
 7        """.trimIndent(),
 8)
 9
10Thread.sleep(3 * ONE_SECOND)
11
12generator.executeScript(
13    script = "setTimeout(() => window.location = '/guide')",
14)
```

Copied!

```
1use starfederation\datastar\ServerSentEventGenerator;
 2
 3$sse = new ServerSentEventGenerator();
 4$sse->patchElements(`
 5    <div id="indicator">Redirecting in 3 seconds...</div>
 6`);
 7sleep(3);
 8$sse->executeScript(`
 9    setTimeout(() => window.location = "/guide")
10`);
```

Copied!

```
1from datastar_py import ServerSentEventGenerator as SSE
2from datastar_py.sanic import datastar_response
3
4@app.get("/redirect")
5@datastar_response
6async def redirect_from_backend():
7    yield SSE.patch_elements('<div id="indicator">Redirecting in 3 seconds...</div>')
8    await asyncio.sleep(3)
9    yield SSE.execute_script('setTimeout(() => window.location = "/guide")')
```

Copied!

```
1datastar = Datastar.new(request:, response:)
 2
 3datastar.stream do |sse|
 4  sse.patch_elements '<div id="indicator">Redirecting in 3 seconds...</div>'
 5
 6  sleep 3
 7
 8  sse.execute_script <<~JS
 9    setTimeout(() => {
10      window.location = '/guide'
11    })
12  JS
13end
```

Copied!

```
1use datastar::prelude::*;
2use async_stream::stream;
3use core::time::Duration;
4
5Sse(stream! {
6    yield PatchElements::new("<div id='indicator'>Redirecting in 3 seconds...</div>").into();
7    tokio::time::sleep(core::time::Duration::from_secs(3)).await;
8    yield ExecuteScript::new("setTimeout(() => window.location = '/guide')").into();
9});
```

Copied!

```
1import { createServer } from "node:http";
 2import { ServerSentEventGenerator } from "../npm/esm/node/serverSentEventGenerator.js";
 3
 4const server = createServer(async (req, res) => {
 5
 6  ServerSentEventGenerator.stream(req, res, async (sse) => {
 7    sse.patchElements(`
 8      <div id="indicator">Redirecting in 3 seconds...</div>
 9    `);
10
11    setTimeout(() => {
12      sse.executeScript(`setTimeout(() => window.location = "/guide")`);
13    }, 3000);
14  });
15});
```

Some SDKs provide a helper method that automatically wraps the statement in a `setTimeout` function call, so you don’t have to worry about doing so (you’re welcome!).

Copied!

```
1(require
 2  '[starfederation.datastar.clojure.api :as d*]
 3  '[starfederation.datastar.clojure.adapter.http-kit :refer [->sse-response on-open]]
 4  '[some.hiccup.library :refer [html]])
 5
 6
 7(defn handler [ring-request]
 8  (->sse-response ring-request
 9    {on-open
10      (fn [sse]
11        (d*/patch-elements! sse
12          (html [:div#indicator "Redirecting in 3 seconds..."]))
13        (Thread/sleep 3000)
14        (d*/redirect! sse "/guide")
15        (d*/close-sse! sse))}))
```

Copied!

```
1using StarFederation.Datastar.DependencyInjection;
2using StarFederation.Datastar.Scripts;
3
4app.MapGet("/redirect", async (IDatastarService datastarService) =>
5{
6    await datastarService.PatchElementsAsync("""<div id="indicator">Redirecting in 3 seconds...</div>""");
7    await Task.Delay(TimeSpan.FromSeconds(3));
8    await datastarService.Redirect("/guide");
9});
```

Copied!

```
1import (
 2    "time"
 3    "github.com/starfederation/datastar-go/datastar"
 4)
 5
 6sse := datastar.NewSSE(w, r)
 7sse.PatchElements(`
 8    <div id="indicator">Redirecting in 3 seconds...</div>
 9`)
10time.Sleep(3 * time.Second)
11sse.Redirect("/guide")
```

No example found for Java

Copied!

```
1val generator = ServerSentEventGenerator(response)
 2
 3generator.patchElements(
 4    elements =
 5        """
 6        <div id="indicator">Redirecting in 3 seconds...</div>
 7        """.trimIndent(),
 8)
 9
10Thread.sleep(3 * ONE_SECOND)
11
12generator.redirect("/guide")
```

Copied!

```
1use starfederation\datastar\ServerSentEventGenerator;
2
3$sse = new ServerSentEventGenerator();
4$sse->patchElements(`
5    <div id="indicator">Redirecting in 3 seconds...</div>
6`);
7sleep(3);
8$sse->location('/guide');
```

Copied!

```
1from datastar_py import ServerSentEventGenerator as SSE
2from datastar_py.sanic import datastar_response
3
4@app.get("/redirect")
5@datastar_response
6async def redirect_from_backend():
7    yield SSE.patch_elements('<div id="indicator">Redirecting in 3 seconds...</div>')
8    await asyncio.sleep(3)
9    yield SSE.redirect("/guide")
```

Copied!

```
1datastar = Datastar.new(request:, response:)
2
3datastar.stream do |sse|
4  sse.patch_elements '<div id="indicator">Redirecting in 3 seconds...</div>'
5
6  sleep 3
7
8  sse.redirect '/guide'
9end
```

No example found for Rust

No example found for TypeScript

## Conclusion [#](https://data-star.dev/how_tos/redirect_the_page_from_the_backend#conclusion)

Redirecting to another page can be done from the backend thanks to the ability to patch `script` tags into the DOM using the [`datastar-patch-elements`](https://data-star.dev/reference/sse_events#datastar-patch-elements) SSE event, or to execute JavaScript using an SDK.

[← Previous](https://data-star.dev/how_tos/prevent_sse_connections_closing)[](https://data-star.dev/how_tos/redirect_the_page_from_the_backend)
