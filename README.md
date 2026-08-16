# Skill Path

A landing page for a learning platform: hero, a course grid driven by a live API, and a footer.

The components are written so the **same files run in Next.js and paste into Framer** — Next is the
dev harness and preview, Framer is the design surface.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 55 tests
npm run build
```

## The API, and what it does on purpose

Base URL: `https://syncsphere-hiv6.onrender.com`

| Endpoint | Returns |
|---|---|
| `GET /assignment/course-data` | 5–10 courses; the count changes between calls |
| `GET /assignment/country-code` | `{"country_code":"IN"}` or `"US"`, alternating |

Three behaviours drove the design, all confirmed by sampling the live API rather than assumed:

**The count varies.** Observed 5, 6, 7, 8, 9 and 10 courses across loads. The grid is
`auto-fit`/`minmax`, so nothing depends on a fixed number of cards.

**The country code alternates on every call.** It is therefore fetched **once per page load** and
applied to every card. Calling it per card would render a grid of rupees and dollars side by side.

**Failures are injected at random.** Sampling live: 4 failures in 25 calls to `course-data` and 5 in
15 to `country-code`, a mix of `404` and `500`. The same URL succeeds on the next call, so a 404 here
means *try again*, not *this does not exist* — which is why nothing is classified as permanent and
every failure is simply retried.

## Prices

`pricePaise` and `priceUsdCents` are in the smallest unit of each currency, so both are divided by
100 exactly once, in `lib/price.ts`:

- `199900` → **₹1,999** (not ₹1,99,900)
- `3999` → **$39.99**

Rupee prices drop the decimals when they are whole; dollar prices always keep two. `tests/price.test.ts`
pins this down, including a case where the two price fields disagree, which proves the right field
was read for the right market.

## Each card

Course name · description clamped to exactly two lines · price in the active currency · **category**
as a badge.

Category is the fourth field. It adds information the course name does not already carry — *Notion
Second Brain* is Productivity, *Freelance Client OS* is Business — which is how someone actually
scans a catalogue.

## The four states

| State | What you see |
|---|---|
| Loading | Six skeleton cards in the real card geometry. From the second attempt the copy changes to "Still loading — the course server is waking up", because the host sleeps when idle |
| Error | What actually failed (timeout / unreachable / status code), how many attempts were made, and a **Try again** button |
| Empty | "No courses are published yet" and a **Check again** button, in the same framed block so the section does not collapse |
| Working | The grid |

Any of them can be viewed on demand:

```
/?state=loading     /?state=error     /?state=empty
/?country=IN        /?country=US
```

The state overrides skip the network entirely; `country` pins the currency so both markets are
reachable without waiting for the endpoint to flip.

## Retries

`fetchJson` in `lib/api.ts`. Four attempts by default.

**Every failure is retried.** There is no retryable/permanent distinction, because this API produces
no failure worth giving up on early. Failures are identified by status code alone — no error
taxonomy — with three codes for the cases that never produced an HTTP response:

```ts
NO_RESPONSE = 0     // never reached the server
TIMED_OUT   = 408   // we stopped waiting
BAD_BODY    = -1    // answered, but not with readable JSON
```

`BAD_BODY` is negative on purpose: any real HTTP number chosen for it would collide with that status
arriving for real and make the error message lie.

- **A deadline on every attempt** — 10s for the first, 6s after. The load-bearing part: the host does
  not fail when cold, it stalls, so without it the page would wait forever instead of trying again.
  A sleeping host gets one patient try; once it has answered fast, waiting that long again buys
  nothing.
- Plain exponential backoff, no jitter: 300 / 600 / 1200 ms, capped at 8s.
- A fast-failing 404 reaches the error state in ~3s; a total outage in ~25s.
- The caller's `AbortSignal` is chained into every attempt, so unmounting cancels the chain and no
  stale response lands. A caller's abort is the only thing that escapes the retry loop.
- If the country lookup fails but the courses arrive, the page renders and falls back to `IN`. A
  currency lookup is not worth taking a working catalogue down for.

## Framer

`components/skillpath/SkillPathLanding.tsx` is the code component. Paste the `components/skillpath`
and `lib` files into Framer's code panel — no import needs rewriting, because `framer` is aliased to
a local no-op shim (`lib/framer-shim.ts`) in `next.config.ts`, `tsconfig.json` and `vitest.config.mts`.

Two property controls appear in the design panel:

| Control | Type | Does |
|---|---|---|
| **Accent** | Color | CTA, category badges, focus rings, hovers |
| **Card density** | Segmented enum | Comfortable / Compact — card padding, radius, grid gap, title size |

The accent control derives its own contrast: the CTA label switches between white and ink based on
the accent's relative luminance, so the button stays readable even if a designer picks a pale yellow.

Styling is a single injected `<style>` block reading CSS custom properties — Framer has no build step
for Tailwind, and inline style objects cannot express hover, media queries, focus rings or line
clamping. The two controls flow through those variables rather than being threaded down as props.

## Layout

```
app/                     Next shell — fonts and the page
components/skillpath/    the Framer component and its parts
  SkillPathLanding.tsx   default export + addPropertyControls
  tokens.ts              defaults, density maps, accent contrast maths
  styles.ts              the stylesheet
lib/
  api.ts                 fetchJson with retries, validation, typed ApiError
  price.ts               currency formatting
  useCourses.ts          the loading/error/empty/ready state machine
  framer-shim.ts         no-op stand-in for Framer's `framer` module
tests/                   55 tests
```
