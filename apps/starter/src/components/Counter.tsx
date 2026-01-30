import { ids } from "../lib/app"

export function Counter(props: { count: number }) {
  return (
    <div id="counter" data-honostar-region={ids.regions.counter} data-honostar-region-kind="card">
      <p>
        Count: {props.count}{" "}
        <svg
          id="counter-dot"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          data-honostar-region={ids.regions.counterDot}
          data-honostar-region-kind="icon"
        />
      </p>
    </div>
  )
}
