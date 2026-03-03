import { Region, regionAttrs } from "@honostar/core/server"
import { ids } from "../lib/app"

export function Counter(props: { count: number }) {
  return (
    <Region id={ids.regions.counter}>
      <p>
        Count: {props.count}{" "}
        <svg
          {...regionAttrs(ids.regions.counterDot)}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
        />
      </p>
    </Region>
  )
}
