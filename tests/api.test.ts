import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  BAD_BODY,
  NO_RESPONSE,
  TIMED_OUT,
  backoffDelay,
  fetchJson,
  getCountryCode,
  getCourses,
} from "@/lib/api";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function errorResponse(status: number) {
  return new Response("upstream said no", { status });
}

/** Awaits a call that is expected to fail and hands back the error, typed. */
async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  const resolved = Symbol("resolved");
  const outcome = await promise.then(
    () => resolved,
    (error: unknown) => error,
  );
  if (outcome === resolved) throw new Error("Expected the request to fail, but it resolved.");
  return outcome as ApiError;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("backoffDelay", () => {
  it("doubles each attempt, with no randomness", () => {
    expect(backoffDelay(0, 300)).toBe(300);
    expect(backoffDelay(1, 300)).toBe(600);
    expect(backoffDelay(2, 300)).toBe(1200);
  });

  it("caps the wait so a long retry chain cannot stall the page", () => {
    expect(backoffDelay(20, 300)).toBe(8000);
  });

  it("adds no delay at all when the base is zero", () => {
    expect(backoffDelay(3, 0)).toBe(0);
  });
});

describe("fetchJson — the happy path", () => {
  it("returns the parsed body and asks for it exactly once", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ country_code: "IN" }));

    await expect(fetchJson("/x", { baseDelayMs: 0 })).resolves.toEqual({
      country_code: "IN",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never serves a cached response, because the country code is meant to flip", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ country_code: "US" }));

    await fetchJson("/x", { baseDelayMs: 0 });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });
});

describe("fetchJson — every failure is retried", () => {
  // This API injects 404s and 500s at random; the same URL succeeds on the
  // next call. Nothing it can return is worth classifying as permanent.
  it.each([
    ["a 500", () => errorResponse(500)],
    ["a 404", () => errorResponse(404)],
    ["a 400", () => errorResponse(400)],
    ["an unreadable body", () => new Response("<html>oops</html>", { status: 200 })],
  ])("recovers when %s is followed by a success", async (_label, failure) => {
    fetchMock.mockResolvedValueOnce(failure()).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(fetchJson("/x", { baseDelayMs: 0 })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recovers from a dropped connection", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(fetchJson("/x", { baseDelayMs: 0 })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps trying a 404 to exhaustion rather than giving up on the first one", async () => {
    fetchMock.mockResolvedValue(errorResponse(404));

    const error = await captureError(fetchJson("/x", { retries: 3, baseDelayMs: 0 }));

    expect(error.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("gives up after the configured number of retries and reports how many it made", async () => {
    fetchMock.mockResolvedValue(errorResponse(500));

    const error = await captureError(fetchJson("/x", { retries: 3, baseDelayMs: 0 }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
    expect(error.attempts).toBe(4); // the first try plus three retries
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("reports each attempt as it starts, so the UI can explain a long wait", async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const attempts: number[] = [];

    await fetchJson("/x", { baseDelayMs: 0, onAttempt: (n) => attempts.push(n) });

    expect(attempts).toEqual([1, 2, 3]);
  });
});

describe("fetchJson — the codes it reports", () => {
  it("reports the real status when the server answered", async () => {
    fetchMock.mockResolvedValue(errorResponse(503));

    const error = await captureError(fetchJson("/x", { retries: 0 }));

    expect(error.status).toBe(503);
  });

  it("reports NO_RESPONSE when the server could not be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await captureError(fetchJson("/x", { retries: 0 }));

    expect(error.status).toBe(NO_RESPONSE);
  });

  it("reports BAD_BODY when the answer was not readable JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>oops</html>", { status: 200 }));

    const error = await captureError(fetchJson("/x", { retries: 0 }));

    expect(error.status).toBe(BAD_BODY);
  });
});

describe("fetchJson — timeouts", () => {
  function hangingFetch() {
    return vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason ?? new DOMException("Aborted", "AbortError")),
          );
        }),
    );
  }

  it("abandons a request that hangs and tries again", async () => {
    // A cold start does not fail, it stalls. Without a per-attempt deadline
    // the page would spin forever instead of trying again.
    fetchMock = hangingFetch();
    vi.stubGlobal("fetch", fetchMock);

    const error = await captureError(
      fetchJson("/x", { retries: 1, timeoutMs: 10, baseDelayMs: 0 }),
    );

    expect(error.status).toBe(TIMED_OUT);
    expect(error.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("succeeds on the retry after the first attempt stalls", async () => {
    let call = 0;
    fetchMock = vi.fn((_url: string, init: RequestInit) => {
      call += 1;
      if (call === 1) {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        });
      }
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchJson("/x", { retries: 2, timeoutMs: 10, baseDelayMs: 0 }),
    ).resolves.toEqual({ ok: true });
  });

  it("gives the first attempt longer than the ones after it", async () => {
    // A sleeping host deserves one patient try; once it has answered fast,
    // waiting another ten seconds per retry buys nothing.
    fetchMock = hangingFetch();
    vi.stubGlobal("fetch", fetchMock);
    const deadlines: number[] = [];
    const realSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", ((fn: () => void, ms?: number) => {
      if (ms && ms > 100) deadlines.push(ms);
      return realSetTimeout(fn, ms && ms > 100 ? 5 : ms);
    }) as typeof setTimeout);

    await captureError(fetchJson("/x", { retries: 1, baseDelayMs: 0 }));

    expect(deadlines[0]).toBeGreaterThan(deadlines[1]);
  });
});

describe("fetchJson — cancellation", () => {
  it("stops retrying when the caller aborts, and does not dress it up as an ApiError", async () => {
    const controller = new AbortController();
    fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchJson("/x", {
      retries: 3,
      baseDelayMs: 0,
      signal: controller.signal,
    });
    controller.abort();

    const error = await captureError(pending);

    expect(error).not.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1); // an unmounted page gets no more requests
  });

  it("does not start at all if the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(fetchJson("/x", { signal: controller.signal })).rejects.toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

const validCourse = {
  courseName: "How To YouTube",
  courseCode: "how-to-youtube",
  description: "From concept to creation.",
  mainCategory: "Content Creation",
  shortCourse: "YouTube",
  courseType: "Original",
  pricePaise: 199900,
  priceUsdCents: 3999,
  mangoId: "a1b2c3d4e5f6789012345678",
  refundable: true,
};

describe("getCourses", () => {
  it("returns every well-formed course, whatever the count", async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({
      ...validCourse,
      courseCode: `course-${i}`,
    }));
    fetchMock.mockResolvedValue(jsonResponse(five));

    await expect(getCourses({ baseDelayMs: 0 })).resolves.toHaveLength(5);
  });

  it("treats an empty list as an empty result, not a failure", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await expect(getCourses({ baseDelayMs: 0 })).resolves.toEqual([]);
  });

  it("recovers from an injected 404 the way the live API produces them", async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(404))
      .mockResolvedValueOnce(jsonResponse([validCourse]));

    await expect(getCourses({ baseDelayMs: 0 })).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("drops entries that could not be rendered honestly", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        validCourse,
        { ...validCourse, courseName: "" }, // nothing to title the card with
        { ...validCourse, pricePaise: null }, // no rupee price to show
        { ...validCourse, priceUsdCents: "3999" }, // price is not a number
        null,
      ]),
    );

    const courses = await getCourses({ baseDelayMs: 0 });

    expect(courses).toHaveLength(1);
    expect(courses[0].courseName).toBe("How To YouTube");
  });

  it("rejects a response that is not a list", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ courses: [] }));

    const error = await captureError(getCourses({ baseDelayMs: 0 }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(BAD_BODY);
  });

  it("fills in a missing category rather than dropping the course", async () => {
    const noCategory = { ...validCourse } as Partial<typeof validCourse>;
    delete noCategory.mainCategory;
    fetchMock.mockResolvedValue(jsonResponse([noCategory]));

    const courses = await getCourses({ baseDelayMs: 0 });

    expect(courses).toHaveLength(1);
    expect(courses[0].mainCategory).toBe("");
  });
});

describe("getCountryCode", () => {
  it("accepts both codes the endpoint alternates between", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ country_code: "IN" }));
    await expect(getCountryCode({ baseDelayMs: 0 })).resolves.toBe("IN");

    fetchMock.mockResolvedValueOnce(jsonResponse({ country_code: "US" }));
    await expect(getCountryCode({ baseDelayMs: 0 })).resolves.toBe("US");
  });

  it("recovers from an injected 404", async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(404))
      .mockResolvedValueOnce(jsonResponse({ country_code: "US" }));

    await expect(getCountryCode({ baseDelayMs: 0 })).resolves.toBe("US");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a code it does not know how to price", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ country_code: "GB" }));

    const error = await captureError(getCountryCode({ baseDelayMs: 0 }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(BAD_BODY);
  });
});
