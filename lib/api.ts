import type { CountryCode, Course } from "@/lib/types";

export const API_BASE = "https://syncsphere-hiv6.onrender.com";

const DEFAULT_RETRIES = 3;
/** Hard ceiling. Whatever a caller asks for, the chain stays finite and short. */
const MAX_RETRIES = 5;
/** A sleeping host gets one patient chance… */
const FIRST_TIMEOUT_MS = 10_000;
/** …after which it has proven it is awake, so later attempts wait less. */
const RETRY_TIMEOUT_MS = 6_000;
const DEFAULT_BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 8_000;

/**
 * Failures are identified by status code alone. These three never produced an
 * HTTP response, so they carry codes of their own. `BAD_BODY` is negative
 * deliberately: any real HTTP number chosen for it would collide with that
 * status arriving for real and make the error message lie.
 */
export const NO_RESPONSE = 0;
export const TIMED_OUT = 408;
export const BAD_BODY = -1;

export class ApiError extends Error {
  readonly status: number;
  readonly attempts: number;

  constructor(status: number, message: string, attempts: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.attempts = attempts;
  }
}

/** Plain exponential backoff: 300, 600, 1200 … capped. */
export function backoffDelay(attempt: number, baseDelayMs: number): number {
  return Math.min(baseDelayMs * 2 ** attempt, MAX_DELAY_MS);
}

function isAbortLike(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === "AbortError" || name === "TimeoutError";
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    function finish() {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }
  });
}

async function requestOnce<T>(
  url: string,
  timeoutMs: number,
  attempts: number,
  outerSignal?: AbortSignal,
): Promise<T> {
  // A fresh controller per attempt: the timeout must cancel this try without
  // poisoning the retries that follow.
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs,
  );
  const forwardAbort = () => controller.abort(outerSignal?.reason);
  outerSignal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `The course server responded with ${response.status}.`,
        attempts,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(BAD_BODY, "The course server did not return valid JSON.", attempts);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // The caller cancelled (the page unmounted) — let that pass through
    // untouched so it is never mistaken for a failure worth showing.
    if (outerSignal?.aborted) throw error;
    if (isAbortLike(error)) {
      throw new ApiError(
        TIMED_OUT,
        `The course server took longer than ${Math.round(timeoutMs / 1000)}s to answer.`,
        attempts,
      );
    }
    throw new ApiError(NO_RESPONSE, "Could not reach the course server.", attempts);
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener("abort", forwardAbort);
  }
}

export interface FetchJsonOptions {
  /** Retries after the first attempt. Clamped to `MAX_RETRIES` (5). */
  retries?: number;
  /** Overrides both per-attempt deadlines. */
  timeoutMs?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  /** Called as each attempt begins, numbered from 1. */
  onAttempt?: (attempt: number) => void;
}

/**
 * Fetches JSON, retrying any failure with exponential backoff.
 *
 * Nothing is classified as permanent. This API injects 404s and 500s at
 * random — the same URL succeeds on the next call — so there is no failure it
 * can produce that is worth giving up on early.
 *
 * The chain is always finite: at most `MAX_RETRIES` retries after the first
 * attempt, no matter what a caller passes. Retrying everything is only safe
 * because the number of attempts is capped.
 *
 * The per-attempt timeout is the load-bearing part: the host stalls rather
 * than fails when cold, and without a deadline the page would wait forever
 * instead of trying again.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs, baseDelayMs = DEFAULT_BASE_DELAY_MS, signal, onAttempt } = options;

  const retries = Math.max(0, Math.min(options.retries ?? DEFAULT_RETRIES, MAX_RETRIES));

  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");

    onAttempt?.(attempt + 1);

    const deadline = timeoutMs ?? (attempt === 0 ? FIRST_TIMEOUT_MS : RETRY_TIMEOUT_MS);

    try {
      return await requestOnce<T>(url, deadline, attempt + 1, signal);
    } catch (error) {
      // Anything the server or the network did is worth another go, up to the
      // attempt limit above. A caller's own abort is not an ApiError, so it
      // breaks out immediately instead of being retried.
      if (!(error instanceof ApiError)) throw error;
      lastError = error;

      if (attempt < retries) await sleep(backoffDelay(attempt, baseDelayMs), signal);
    }
  }

  throw lastError as ApiError;
}

function isRenderableCourse(value: unknown): boolean {
  const course = value as Partial<Course> | null;
  if (!course || typeof course !== "object") return false;
  if (typeof course.courseName !== "string" || course.courseName.trim() === "") return false;
  // Both prices are required: the country can flip on the next page load, and
  // a card that cannot be priced in the active currency should never render.
  return (
    typeof course.pricePaise === "number" &&
    Number.isFinite(course.pricePaise) &&
    typeof course.priceUsdCents === "number" &&
    Number.isFinite(course.priceUsdCents)
  );
}

function normalizeCourse(value: unknown, index: number): Course {
  const raw = value as Partial<Course>;
  const text = (field: unknown) => (typeof field === "string" ? field : "");

  return {
    courseName: (raw.courseName as string).trim(),
    courseCode: text(raw.courseCode) || `course-${index}`,
    description: text(raw.description),
    mainCategory: text(raw.mainCategory),
    shortCourse: text(raw.shortCourse),
    courseType: text(raw.courseType),
    pricePaise: raw.pricePaise as number,
    priceUsdCents: raw.priceUsdCents as number,
    mangoId: text(raw.mangoId),
    refundable: raw.refundable === true,
  };
}

/**
 * The count varies between calls (5 to 10 at the time of writing), so nothing
 * downstream may assume a fixed number of cards. Entries that could not be
 * rendered honestly are dropped rather than shown half-empty; if that leaves
 * nothing, the caller treats it as an empty result, not a failure.
 */
export async function getCourses(options: FetchJsonOptions = {}): Promise<Course[]> {
  const data = await fetchJson<unknown>(`${API_BASE}/assignment/course-data`, options);

  if (!Array.isArray(data)) {
    throw new ApiError(BAD_BODY, "Expected a list of courses.", 1);
  }

  return data.filter(isRenderableCourse).map(normalizeCourse);
}

/**
 * Fetched once per page load. Calling this per card would give the grid mixed
 * currencies, because the endpoint alternates between the two markets.
 */
export async function getCountryCode(options: FetchJsonOptions = {}): Promise<CountryCode> {
  const data = await fetchJson<{ country_code?: unknown }>(
    `${API_BASE}/assignment/country-code`,
    options,
  );
  const code = data?.country_code;

  if (code !== "IN" && code !== "US") {
    throw new ApiError(BAD_BODY, `Unrecognised country code: ${String(code)}.`, 1);
  }

  return code;
}
