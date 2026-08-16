"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, NO_RESPONSE, getCountryCode, getCourses } from "@/lib/api";
import type { CountryCode, Course } from "@/lib/types";

export type CoursesStatus = "loading" | "error" | "empty" | "ready";

/**
 * If the country lookup fails but the courses arrive, the page still renders.
 * A currency lookup is not worth taking a working catalogue down for.
 */
const FALLBACK_COUNTRY: CountryCode = "IN";

export interface CoursesState {
  status: CoursesStatus;
  courses: Course[];
  country: CountryCode;
  error?: ApiError;
  /** Which attempt is in flight, numbered from 1. */
  attempt: number;
}

interface Overrides {
  state?: Exclude<CoursesStatus, "ready">;
  country?: CountryCode;
}

/**
 * `?state=loading|error|empty` and `?country=IN|US` make every state
 * reachable on demand instead of by luck — the country endpoint alternates,
 * and the failure states are not something you can ask the server for.
 *
 * Read from `window.location` rather than `next/navigation`, because that
 * module does not exist inside Framer.
 */
function readOverrides(): Overrides {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const state = params.get("state");
  const country = params.get("country");

  return {
    state: state === "loading" || state === "error" || state === "empty" ? state : undefined,
    country: country === "IN" || country === "US" ? country : undefined,
  };
}

function isAbort(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === "AbortError";
}

const INITIAL: CoursesState = {
  status: "loading",
  courses: [],
  country: FALLBACK_COUNTRY,
  attempt: 1,
};

export function useCourses(): CoursesState & { retry: () => void } {
  const [state, setState] = useState<CoursesState>(INITIAL);
  const [reloads, setReloads] = useState(0);

  // Resetting here rather than in the effect keeps the state change in the
  // event that caused it, and avoids a cascading render on first mount where
  // the state is already the initial one.
  const retry = useCallback(() => {
    setState({ ...INITIAL });
    setReloads((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let live = true;

    void (async () => {
      const overrides = readOverrides();

      if (overrides.state === "loading") return; // hold the skeleton on screen
      if (overrides.state === "error") {
        setState({
          status: "error",
          courses: [],
          country: overrides.country ?? FALLBACK_COUNTRY,
          error: new ApiError(NO_RESPONSE, "Could not reach the course server.", 4),
          attempt: 4,
        });
        return;
      }
      if (overrides.state === "empty") {
        setState({
          status: "empty",
          courses: [],
          country: overrides.country ?? FALLBACK_COUNTRY,
          attempt: 1,
        });
        return;
      }

      const [coursesResult, countryResult] = await Promise.allSettled([
        getCourses({
          signal: controller.signal,
          // Only the course request drives the attempt counter; it is the one
          // the page is actually waiting on.
          onAttempt: (attempt) => {
            if (live) setState((current) => ({ ...current, attempt }));
          },
        }),
        overrides.country
          ? Promise.resolve(overrides.country)
          : getCountryCode({ signal: controller.signal }),
      ]);

      if (!live) return;

      const country =
        countryResult.status === "fulfilled" ? countryResult.value : FALLBACK_COUNTRY;

      if (coursesResult.status === "rejected") {
        if (isAbort(coursesResult.reason)) return;
        const error = coursesResult.reason;
        setState((current) => ({
          status: "error",
          courses: [],
          country,
          error: error instanceof ApiError ? error : undefined,
          attempt: current.attempt,
        }));
        return;
      }

      const courses = coursesResult.value;
      setState((current) => ({
        status: courses.length > 0 ? "ready" : "empty",
        courses,
        country,
        attempt: current.attempt,
      }));
    })();

    return () => {
      // Unmount (or a retry) cancels everything in flight, so no stale
      // response lands and no further retry fires.
      live = false;
      controller.abort();
    };
  }, [reloads]);

  return { ...state, retry };
}
