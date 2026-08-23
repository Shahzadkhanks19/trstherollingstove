export default function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-mark">TRS</span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
