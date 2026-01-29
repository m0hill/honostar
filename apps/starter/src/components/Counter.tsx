export function Counter(props: { count: number }) {
  return (
    <div id="counter">
      <p>
        Count: {props.count}{" "}
        <svg
          id="counter-dot"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
        />
      </p>
    </div>
  )
}
