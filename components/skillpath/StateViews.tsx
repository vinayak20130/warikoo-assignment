"use client";

import { BAD_BODY, NO_RESPONSE, TIMED_OUT, type ApiError } from "@/lib/api";

const SKELETON_COUNT = 6;

/**
 * Skeletons mirror the real card geometry so nothing jumps when the data
 * lands. After the first attempt the copy explains the wait instead of
 * leaving it to feel broken — this API sleeps when idle and a cold start
 * genuinely takes a while.
 */
export function LoadingState({ attempt }: { attempt: number }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <div className="sp-grid">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <div className="sp-skeleton-card" key={index}>
            <div className="sp-shimmer" style={{ width: "38%", height: 22 }} />
            <div className="sp-shimmer" style={{ width: "75%", height: 20, marginTop: 18 }} />
            <div className="sp-shimmer" style={{ width: "100%", height: 12 }} />
            <div className="sp-shimmer" style={{ width: "82%", height: 12 }} />
            <div className="sp-shimmer" style={{ width: "30%", height: 20, marginTop: 26 }} />
          </div>
        ))}
      </div>

      <p className="sp-loading-note">
        {attempt > 1
          ? `Still loading — the course server is waking up. Attempt ${attempt}.`
          : "Loading courses…"}
      </p>
    </div>
  );
}

/** Says what actually failed, so "try again" is an informed choice. */
function explain(error?: ApiError): string {
  if (!error) return "The courses could not be loaded.";

  switch (error.status) {
    case NO_RESPONSE:
      return "We could not reach the course server. Check your connection and try again.";
    case TIMED_OUT:
      return "The course server did not answer in time. It sleeps when idle, so the first request after a quiet spell can take a while.";
    case BAD_BODY:
      return "The course server sent back something we could not read.";
    default:
      return `The course server responded with ${error.status}. That is on our side, not yours.`;
  }
}

export function ErrorState({ error, onRetry }: { error?: ApiError; onRetry: () => void }) {
  return (
    <div className="sp-panel" role="alert">
      <h3 className="sp-panel-title">Courses didn&rsquo;t load</h3>
      <p className="sp-panel-body">{explain(error)}</p>
      {error ? (
        <p className="sp-panel-meta">
          Tried {error.attempts} {error.attempts === 1 ? "time" : "times"}.
        </p>
      ) : null}
      <button className="sp-retry" type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="sp-panel">
      <h3 className="sp-panel-title">No courses are published yet</h3>
      <p className="sp-panel-body">
        Nothing is live right now. New paths are added regularly — check again in a moment.
      </p>
      <button className="sp-retry" type="button" onClick={onRefresh}>
        Check again
      </button>
    </div>
  );
}
