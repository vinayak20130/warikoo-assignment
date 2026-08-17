# Skill Path

A landing page for a learning platform: hero, a course grid driven by a live API, and a footer.

The components are written so the **same files run in Next.js and paste into Framer** — Next is the
dev harness and preview, Framer is the design surface.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 63 tests
npm run build
```

## The API, and what it does on purpose

Base URL: `https://syncsphere-hiv6.onrender.com`

| Endpoint | Returns |
|---|---|
| `GET /assignment/course-data` | 5–10 courses; the count changes between calls |
| `GET /assignment/country-code` | `{"country_code":"IN"}` or `"US"`, alternating |

Three behaviours drove the design, all confirmed by sampling the live API rather than assumed:

**The count varies.** Observed 5, 6, 7, 8, 9 and 10 courses across loads. The grid takes however
many cards it is given and flows them into the chosen number of columns, so nothing anywhere assumes
a fixed card count — a short last row is just a short last row.

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

`fetchJson` in `lib/api.ts`. Four attempts by default, **six at the absolute most**.

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
- **At most 5 retries, ever.** `retries` defaults to 3 and is clamped to a hard ceiling of 5, so no
  caller can turn this into a long or unbounded loop. Retrying every failure is only safe because
  the number of attempts is capped.
- The caller's `AbortSignal` is chained into every attempt, so unmounting cancels the chain and no
  stale response lands. An abort breaks out immediately rather than being retried.
- If the country lookup fails but the courses arrive, the page renders and falls back to `IN`. A
  currency lookup is not worth taking a working catalogue down for.

## Framer

`components/skillpath/SkillPathLanding.tsx` is the code component. Paste the `components/skillpath`
and `lib` files into Framer's code panel — no import needs rewriting, because `framer` is aliased to
a local no-op shim (`lib/framer-shim.ts`) in `next.config.ts`, `tsconfig.json` and `vitest.config.mts`.

Two property controls appear in the design panel:

| Control | Type | Does |
|---|---|---|
| **Card colour** | Color | The course card surface |
| **Cards per row** | Number stepper, 1–4 | How many cards sit in a row on a wide screen |

**Card colour derives its own contrast.** Card text, muted text, borders, the badge tint and the
skeleton shimmer are all computed from the chosen colour's relative luminance, so a near-black card
flips to white text and light hairlines while a cream one keeps ink — without a designer touching
anything else. The page *around* the cards is deliberately unaffected.

**Cards per row is an upper bound, never a floor.** The count is clamped to 1–4, and narrower
viewports only ever reduce it (at most 2 on a tablet, 1 on a phone). It is held as three separate
variables because a media query cannot do arithmetic on a custom property.

Styling is a single injected `<style>` block reading CSS custom properties — Framer has no build step
for Tailwind, and inline style objects cannot express hover, media queries, focus rings or line
clamping. The two controls flow through those variables rather than being threaded down as props.

## Layout

```
app/                     Next shell — fonts and the page
components/skillpath/    the Framer component and its parts
  SkillPathLanding.tsx   default export + addPropertyControls
  tokens.ts              defaults, column clamping, card contrast maths
  styles.ts              the stylesheet
lib/
  api.ts                 fetchJson with retries, validation, typed ApiError
  price.ts               currency formatting
  useCourses.ts          the loading/error/empty/ready state machine
  framer-shim.ts         no-op stand-in for Framer's `framer` module
tests/                   63 tests
```
