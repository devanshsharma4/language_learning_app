# What breaks at 10,000 users

Notes on where this app falls over as traffic grows, what I'd fix first, and
what I'd deliberately leave alone. Written against the code as it stands, with
measured numbers rather than estimates where I had them.

**Measured locally, single user, no contention:**

| | |
|---|---|
| `POST /api/lessons/create` | **9.2s** (four sequential-ish Claude calls) |
| `GET /api/lessons?limit=20` | **175ms** |
| Frontend bundle | **390KB** raw / **118KB** gzipped, one chunk |

The headline: **this app's cost and latency are dominated by one endpoint**, and
almost every scaling decision follows from that.

---

## 1. Lesson creation is the whole problem

`lessonService.createLesson` makes four Claude calls per request — three in
parallel, then one dependent call that needs the extracted vocabulary:

```
article ──┬─ extractVocabulary ────┐
          ├─ generateQuestions     │ Promise.all
          └─ generateWritingPrompts┘
                                   └──> generateVocabQuestions
```

At 10k users each creating one lesson a week, that's ~5,700 lessons/day →
**~23,000 Claude calls/day**. Three things break.

### Cost, which is the one that actually bites

There is no cache. The same article, reprocessed at the same difficulty,
pays full price again. **Fix: content-addressed cache** keyed on
`sha256(articleText) + language + difficulty`, storing the generated lesson
payload. Two users pasting the same viral article share one generation.

This matters more than it sounds for a consumer product: article popularity is
power-law distributed. A small number of articles account for most pastes, so a
cache with a modest hit rate removes a disproportionate share of spend. I'd
measure the hit rate before tuning anything else.

Rate limiting is already in (`middleware/rateLimit.ts`), keyed on **user id, not
IP** — deliberately, because the cost is incurred per account. IP keying gets
this exactly backwards: it punishes users behind shared NAT and lets one user on
many addresses spend freely.

### A 9-second request holds a connection open

Node handles this fine — it's I/O-bound, not CPU-bound, so the event loop is
free. The real constraint is upstream: Anthropic rate limits, and the Postgres
pool (`max: 8` on the free plan, `config/database.ts`).

**At 10k users this needs to stop being synchronous.** Creation should enqueue a
job and return immediately with a lesson id in a `pending` state; the client
subscribes (SSE or polling) and the UI shows the generation progressing. That
also fixes a real UX problem today: navigating away mid-generation loses the
work entirely, because the only record of it is an in-flight HTTP request.

I did not build this now because at current traffic it would be
infrastructure with no user visible behind it — and the progress UI in
`Dashboard.tsx` makes the 9 seconds legible in the meantime.

### Partial failure wastes money

`llmService.generateJSON` validates with zod and retries twice with backoff.
But if the fourth call fails after the first three succeeded, all four are
discarded and the user has paid for three. **Fix: persist the lesson with
whatever succeeded.** A lesson without writing prompts is still a usable lesson;
a 503 is not.

---

## 2. Database

### Per-row JSON parsing in a hot path

`lessonService.getUserLessons` parses `ai_feedback` for every row to compute one
number, the overall score:

```ts
let feedback: any = row.ai_feedback;
if (typeof feedback === 'string') { feedback = JSON.parse(feedback); ... }
const overallScore = computeOverallScore(feedback);
```

At `limit=20` that's 20 JSON parses of a multi-kilobyte blob to produce 20
integers, on every load of the history page. **Fix: store `overall_score` as a
column, written once at submission.** It is derived data that never changes after
grading. The current shape costs a parse per row per view, forever.

I'd take this one early — it's cheap and it's on the most-visited authenticated
page.

### Missing indexes

Only `user_id` columns are indexed (`001_baseline.sql`). The actual query in
`getUserLessons` is `WHERE l.user_id = $1 ORDER BY l.created_at DESC LIMIT/OFFSET`,
which wants a **composite `(user_id, created_at DESC)`**. With a few lessons per
user this never shows up; with thousands it's a sort of the user's whole history
to return 20 rows.

### OFFSET pagination degrades

`LIMIT/OFFSET` makes Postgres walk and discard every skipped row, so page 500 is
far slower than page 1. Fine for a personal lesson history, which nobody deep-
paginates. **Not fine for a social feed** — that wants keyset pagination
(`WHERE created_at < $cursor`). Worth naming because it's exactly the pattern a
feed-shaped product cannot use.

### Concurrency on submit

`submitLessonResponse` reads the lesson, spends ~5s in the LLM, then upserts.
Two concurrent submissions both pay for grading and the later silently
overwrites the earlier. **Fix: `SELECT ... FOR UPDATE` on the response row, and
short-circuit if a completed response already exists.** Low probability per user;
inevitable at volume.

### JSONB was the right call, and its limit

Lesson content is stored as JSONB rather than normalised into
`questions` / `options` / `answers` tables. That's correct here: a lesson is
always read whole and never queried by individual question, so normalising would
add joins and buy nothing.

It stops being correct the moment a product question needs cross-lesson
aggregation — "which vocabulary words do learners get wrong most often?" That
query is trivial against a `questions` table and requires scanning every JSONB
blob in the current shape. Not a bug, a known boundary.

---

## 3. Frontend

### Bundle

390KB / 118KB gzipped in a **single chunk**, so the landing page downloads the
lesson view, the results renderer, and all of React Query before it can paint.

**Fix: route-level `React.lazy` + `Suspense`.** The split falls out naturally
from the route table — an unauthenticated visitor needs `Home` and `Login` and
nothing else. I'd expect the initial chunk to drop substantially; I haven't
measured it yet, so I'm not going to quote a number I made up.

### Perceived performance beats actual performance here

I can't make Claude faster. What I can control is whether waiting feels broken.

- **Skeletons over spinners.** Every loading state is currently a centred
  spinner, so each page flashes a blank screen and then reflows. Skeletons shaped
  like the incoming content reserve the layout, which removes the content shift
  and makes the same wall-clock wait read as faster. (Planned, not yet built.)
- **Escalating progress copy** on lesson generation, already built. A static
  "Generating…" for 60 seconds reads as a hang; naming what's happening — and
  admitting the free-tier cold start — reads as a system working.
- **Optimistic updates** on saving vocabulary and notes. These are high-frequency,
  low-stakes, near-always-successful actions — the ideal case. The word should
  highlight the instant it's clicked and roll back on the rare failure, rather
  than the user waiting on a round trip to see their own click register.

### Cache strategy

`QueryClient` is configured deliberately (`App.tsx`): `refetchOnWindowFocus:
false`, `staleTime: 60s`, and **no retry on 4xx**. The reasoning: lessons and
their feedback are immutable once created, and vocabulary and notes only change
through this tab's own mutations, which invalidate explicitly. Refetching on
every focus was pure cost. Retrying a 401 or 404 just makes a certain failure
take four round trips to surface.

---

## 4. Security at scale

- **SSRF is handled** (`articleService.assertFetchableUrl`): the hostname is
  resolved and every resulting address is checked against loopback, RFC1918,
  link-local (cloud metadata at `169.254.169.254`), and CGNAT ranges, IPv4 and
  IPv6. Verified against the decimal-encoded loopback bypass (`2130706433`).
  **Known remaining gap:** DNS rebinding — the name could resolve public at
  check time and private at fetch time. Closing it needs a custom agent that
  pins the validated address through the connection. Documented rather than
  half-built.
- **Article fetching is an outbound request to an arbitrary host** on a user's
  behalf. At scale this is an abuse vector regardless of SSRF: someone can use it
  as a traffic amplifier. It wants its own tighter limit and a response-size cap.
- **No structured logging.** `console.error` is fine for one instance and useless
  across many. Anything real needs request ids and log aggregation.

---

## 5. What I would do first, in order

1. **`overall_score` as a column.** Cheapest fix, most-visited page.
2. **Composite index on `(user_id, created_at DESC)`.** One migration.
3. **Content-addressed cache on lesson creation.** Directly attacks the dominant
   cost, and the win scales with popularity.
4. **Route-level code splitting.** Largest frontend win per line changed.
5. **Skeletons + optimistic updates.** Perceived performance, where the real
   constraint is a 9-second model call I can't speed up.
6. **Queue lesson generation.** The biggest architectural change; worth it only
   once concurrent generations actually contend.

Deliberately not on this list: microservices, sharding, read replicas. This is a
single Postgres instance with a handful of tables and no cross-user reads. None
of those solve a problem it has.

---

## Known issues accepted, not fixed

Named because knowing about them is the point.

| Issue | Why it's parked |
|---|---|
| LLM question ids aren't checked for uniqueness | Colliding ids would grade the wrong question, but the prompts specify distinct prefixes (`rc1`/`vq1`/`sa1`) and it hasn't occurred |
| `saved_vocabulary` upsert doesn't update `lesson_id` | Re-saving a word from a second lesson keeps it attached to the first |
| Extracted vocabulary can be a lemma the article never spells | The model returns `aimer` where the text has `aimait`, so it never highlights. Needs lemmatisation |
| Frontend types are hand-mirrored from `src/types/models.ts` | Nothing enforces agreement; this already caused one bug (`preferred_language` typed required while nullable). Wants a shared package |
| No test suite | `test-api.sh` covers the API path end to end manually. Real coverage should start with LLM output shape validation and the auth flow |
