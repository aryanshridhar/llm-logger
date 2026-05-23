export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-neutral-500">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-12 w-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
      <h3 className="text-base font-medium text-neutral-200">Start the conversation</h3>
      <p className="mt-2 max-w-sm text-sm text-neutral-400">
        Ask anything — the assistant&apos;s response will stream back in real time. Every call is
        logged for the dashboard.
      </p>
    </div>
  );
}
