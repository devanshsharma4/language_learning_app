# Articulo

**Learn languages from real articles.**

Paste something you actually want to read — a news story, a Wikipedia page, a blog post —
and Articulo turns it into a lesson: the vocabulary you need, questions that check you
understood it, writing prompts, and AI feedback on what you write back.

### → **[articulo-fawn.vercel.app](https://articulo-fawn.vercel.app)**


> Hosted on free tiers. If the API has been idle for 15 minutes the first lesson takes
> ~50 seconds while the server wakes; after that it's ~8 seconds.

---

## Why this exists

Most language apps teach from sentences written for learners. That works until you try to
read anything real, where the vocabulary and sentence structure are nothing like the
textbook. Articulo inverts it: you bring the text you care about, and the lesson is built
around that.

The design consequence is that **the article is the centre of the screen**, not a quiz.
Vocabulary is clickable inline where the word appears rather than in a separate list, so
you learn a word in the sentence that taught it to you.

Two decisions follow from the same instinct. **The demo needs no account** — it runs on a
fixed lesson and grades multiple choice in the browser with the same comparison the server
uses, so the score is real rather than theatre. And **the free text it can't grade is
labelled ungraded** instead of being quietly scored, because a number you haven't earned is
worse than an honest blank.

The app is also slow in one specific place — a lesson takes about eight seconds, or fifty
if the free-tier API has gone to sleep. Rather than hide that behind a spinner, the UI says
which of the two is happening and counts up, because the complaint about a slow thing is
usually that you can't tell whether it's working.

---

## Building the interface

The article is the only thing on the lesson page that's allowed to be loud. Everything else
— the margin, the questions, the outline — is set quietly around it.

**A highlighted word is a `<span role="button">`, not a `<button>`.** A real button is a
replaced inline-block and can't break across lines, so a multi-word phrase caught at the end
of a line either overflows the measure or jumps whole to the next one. A span wraps
naturally; the role and key handling restore what the element gave up. Typography made the
markup decision, not the other way round.

**The definition card can't cover what you were just reading.** It opens in the right
margin, positioned against the word — but clamped so it never rides over the highlighter key
above it or spills past the bottom of the article. The height estimate deliberately errs
high, so the worst case is a card sitting slightly above its word rather than one running
off the page.

**Pages share a query cache, so moving between them costs nothing.** `['lessons']` and
`['vocabulary', null]` are used verbatim by every page that needs them, with matching request
limits. Arriving at the vocabulary page from the dashboard issues no new request, and the
lesson's page number in the margin comes from the same cached list the history page renders.

**Both destructive actions are optimistic, with rollback.** Deleting a lesson and removing a
saved word apply immediately and restore the previous cache on error. Neither is worth a
round trip of waiting, and both are rare enough to fail loudly when they do.

**The auth guard is two-tier, because "no token" and "bad token" are different questions.**
No token redirects instantly with zero network calls. A token that turns out to be expired
redirects once `/auth/me` resolves. Both carry the attempted location, so signing in returns
you where you were going instead of dumping you on the dashboard.

**A wrong password is not an expired session.** The 401 interceptor used to hard-redirect on
every 401, including the one from a failed sign-in — which reloaded the page and wiped both
the form and the error message. A typo looked like the button simply not working. Login and
register are now exempt, and only a stale session clears the token.

**The lesson outline tracks the section you're reading by a trigger line**, not an
IntersectionObserver. The usual "topmost visible section" approach assumes sections of
similar height; these range from a long article to three short questions, so a tall section
kept winning over the short one actually under the cursor. A scroll handler comparing
heading positions against a fixed line, throttled with `requestAnimationFrame`, matches what
the reader perceives.

**Answers survive a reload.** All three answer types live in one `useReducer` seeded from
`localStorage`, so a half-finished lesson is still half-finished after a refresh.

**No flags anywhere** — a flag names a country, not a language, and the four languages here
are spoken in far more than four. Two-letter codes instead.

**Two colour systems that must never be confused.** Part of speech is always a marker
stroke; language is always a solid chip. They reuse the same four hues, which is only safe
because the forms never collide — so the colour is legible without a legend, and the legend
is there anyway.

---

## How it works

### Generating a lesson — four AI calls, deliberately shaped

```
link ──> pick the article body ──┐   (only for URLs; skipped for pasted text
                                 │    and for Wikipedia, which needs no filtering)
                                 v
article ──┬─ extract vocabulary ──────┐
          ├─ comprehension questions  │  run in parallel
          └─ writing prompts ─────────┘
                                      └──> vocabulary quiz (needs the words from call 1)
```

Three calls run concurrently; the fourth is sequential because it needs the extracted
vocabulary as input. Everything merges into one `LessonQuestion[]` stored as JSONB on a
single `lessons` row.

A fifth call goes first when the article came from a link — it decides which of the
scraped text blocks are the article, which is what the other four then get spent on.

### Grading — split on purpose

- **Multiple choice is graded in code.** A direct comparison. Free, instant, and it cannot
  hallucinate a wrong answer.
- **Only free text goes to the LLM** — short answers and writing get scores, feedback,
  grammar corrections, and vocabulary suggestions.

Unanswered **multiple choice** counts as wrong rather than being ignored, so the
denominator is "questions asked," not "questions attempted."

Unanswered **free text** is different: it is never sent to the model and never scored.
A blank prompt used to come back 0/10 and get averaged into the overall score, which
punished skipping exactly as hard as being wrong. Unattempted is not the same as bad —
the results page marks it "skipped" and leaves it out of the average.

### Question language scales with difficulty

| | Comprehension & vocabulary questions | Writing prompt |
|---|---|---|
| beginner | **English** | target language |
| intermediate / advanced | target language | target language |

A beginner can't read a question written in the language they're learning — it tests
decoding, not comprehension. Writing prompts stay in the target language at every level,
because reading the prompt *is* part of that exercise. One helper (`questionLanguage()`)
drives all of it, so the prompt templates can't drift apart.

---

## Notable backend decisions

**LLM output is validated at the boundary.** Every model response is parsed with a zod
schema in `services/llm/types.ts` before anything downstream touches it, and retried with
backoff on failure. Without this, a shape change throws a `TypeError` deep in the pipeline
*after* three or four calls have already been paid for. Failures surface as a specific 503
the UI can act on, not a generic 500.

**Vocabulary count scales with article length — and beginners get more, not fewer.**
`vocabularyTarget()` asks for roughly one word per 90 words of text, weighted 1.2 / 1.0 / 0.8
by level and clamped to 6–20. The weighting originally ran the other way, on the assumption
that a beginner is more easily overwhelmed; that had it backwards. The vocabulary list *is*
the help, and a beginner meets more unfamiliar words in the same text than an advanced
reader does. The model treats counts as suggestions, so `normalizeVocabulary()` enforces the
ceiling and de-duplicates — duplicates matter beyond tidiness, because they generate two
quiz questions on the same word.

**Each word carries both its forms.** `word` is the dictionary form the definition card
headlines; `surfaceForm` is the exact substring in the article, which is what gets
highlighted — so `désolé` still marks `désolée`. The server verifies the surface form
actually occurs in the text and drops it if not, falling back to matching the base form.
This was previously a known limitation: a lemma the article never spells never highlighted.

**The article body is chosen by a model, because tags can't do it.** Readability finds the
right region of a page; it doesn't promise that region is only prose. Captions, newsletter
forms and clipboard toasts come with it, and one French reading site shipped
*"please consider making a donation"* — in English — straight into a lesson.

A structural rule can't fix that: the tag that holds an infobox on one site holds the
article on another. A rule dropping `<table>` was tried and deleted the article on
lawlessfrench.com, which lays its text out in a table and puts its donation plea outside
`<article>`. So the scraped paragraphs are numbered and handed to Haiku, which keeps the
ones that are the article. If it fails or tries to drop most of the text, nothing is
filtered — a filter that eats the article is worse than one that leaves a stray line in.

**Wikipedia skips all of that.** Those links are read through the Wikipedia API, which
returns the body as data — no guessing, no filter call, nothing to get wrong. It's the one
source guaranteed to come through clean, and the Dashboard recommends it first.

**A page that isn't an article is refused, with a reason.** Homepages (measured by link
density and paragraph length), bot-challenge pages — Le Monde serves one with HTTP 200, so
`response.ok` passes and a Cloudflare notice used to become a lesson — and paywalls, which
get told apart from typos and dead links. `npm run check:extraction` pins every one of
these against the live pages that produced them.

**SSRF is handled properly.** `/api/lessons/create` fetches a user-supplied URL, so the
hostname is resolved and every resulting address is checked against loopback, private,
link-local (cloud metadata at `169.254.169.254`) and CGNAT ranges — IPv4 and IPv6, including
decimal-encoded forms. Checking the protocol alone stops none of those.

**Rate limiting is keyed on user id, not IP.** Each lesson costs four or five Claude calls, so the
spend is per account. IP keying gets this backwards: it punishes users sharing a NAT and
lets one user on many addresses spend freely.

**Schema changes go through migrations.** `database/migrations/` plus a small runner that
records what it has applied. This exists because the schema used to be applied by hand with
`CREATE TABLE IF NOT EXISTS`, which silently does nothing against an existing table — so a
column rename never reached the live database and every lesson submission failed for weeks.

---

## Stack

**Backend** (repo root) — Node + TypeScript, Express 5, PostgreSQL via `pg` (raw SQL, no
ORM), `@anthropic-ai/sdk` (`claude-haiku-4-5`), JWT + bcrypt, `zod` for validation,
`@mozilla/readability` + `jsdom` for extraction.

**Frontend** (`frontend/`) — React 19 + TypeScript, Vite, Tailwind, React Query v5,
React Router v7, axios.

**Hosting** — Vercel (static frontend, CDN) + Render (API + Postgres). Split deliberately;
see [DEPLOYMENT.md](DEPLOYMENT.md) for why.

> `jsdom` is pinned to v26. v27+ pulls in an ES Module and this backend is CommonJS, so
> `require()` of it throws `ERR_REQUIRE_ESM` at boot.

---

## Running locally

**Prerequisites:** Node 20+, PostgreSQL, an [Anthropic API key](https://console.anthropic.com).

```bash
npm install
npm install --prefix frontend

createdb language_learning    # or any name, as long as DATABASE_URL matches
cp .env.example .env          # set DATABASE_URL, JWT_SECRET (32+ chars), ANTHROPIC_API_KEY

npm run migrate:dev           # applies database/migrations in order
```

Then two terminals:

```bash
npm run dev            # API on :3001
npm run frontend:dev   # UI  on :5173
```

Open http://localhost:5173. Vite proxies `/api` to the backend, so the frontend needs no
configuration locally.

The server validates its environment at boot and exits immediately if anything is missing or
malformed — a bad config fails at startup, not on the first request.

### Commands

```bash
npm run dev            # API with hot reload
npm run build          # compile to dist/
npm start              # run compiled server
npm run migrate:dev    # apply pending migrations (ts-node)
npm run lint
npm run typecheck
npm run frontend:dev
npm run frontend:build

./test-api.sh          # end-to-end smoke test against a running server
```

---

## API

All routes except `/health` and the two auth entry points require
`Authorization: Bearer <token>`. Responses are shaped `{ status, data }`.

| Method | Route | |
|---|---|---|
| POST | `/api/auth/register` | Create account → user + token |
| POST | `/api/auth/login` | → user + token |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/language` | Update preferred language |
| POST | `/api/lessons/create` | From `articleText` or `articleUrl` (camelCase) |
| GET | `/api/lessons` | History, `limit`/`offset`, with computed `overall_score` |
| GET | `/api/lessons/:id` | Lesson + any existing response |
| POST | `/api/lessons/:id/submit` | Submit answers → graded feedback |
| DELETE | `/api/lessons/:id` | Responses and notes cascade; saved words survive |
| POST | `/api/vocabulary/save` | Upsert a saved word |
| GET | `/api/vocabulary` | Saved words, filterable by `language` |
| DELETE | `/api/vocabulary/:id` | |
| GET | `/api/notes` | All notes with lesson metadata |
| GET | `/api/notes/lesson/:lessonId` | Notes + saved vocabulary for one lesson |
| POST | `/api/notes` | Create or update a lesson's note (upsert) |
| PUT/DELETE | `/api/notes/:id` | |
| GET | `/health` | Status + a real `SELECT 1` against the database |

```bash
# Create a lesson
curl -X POST https://articulo-api.onrender.com/api/lessons/create \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"language":"spanish","difficulty":"intermediate",
       "articleText":"Your Spanish article text (100-10000 characters)..."}'
```

Submission takes `mcqAnswers`, `shortAnswerResponses` and `writingResponses` — all three
required, send `[]` if empty.

---

## Environment variables

| Variable | Required | |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://` or `postgresql://` |
| `JWT_SECRET` | yes | 32+ characters |
| `ANTHROPIC_API_KEY` | yes | server-side only, never reaches the browser |
| `CORS_ORIGIN` | production | comma-separated allowed origins |
| `JINA_API_KEY` | no | hosted-reader fallback for JavaScript-rendered pages; sends the URL to a third party |
| `PORT` | no | default 3001 |
| `NODE_ENV` | no | `production` enables Postgres TLS and trust-proxy |

Frontend: `VITE_API_URL` in production only (inlined at build time). Locally the Vite proxy
handles it.

---

## Planned

### Looking up any word, not just the highlighted ones

Right now the marked words are fixed when the lesson is made: `vocabularyTarget()` picks
6–20 of them, they're stored on the lesson row, and everything else in the article is inert.
That's backwards from how reading actually goes. The word you stop on is, by definition, one
the model didn't predict you'd stop on — and today the only thing to do with it is leave the
page and look it up somewhere else.

So: tap any word and get the same definition card the highlighted words get.


---

## Known limitations


- **No caching of AI responses.** The same article reprocessed costs four fresh calls, five
  from a link. Should be keyed on (article hash, language, difficulty). This is the single
  biggest remaining cost win — see [docs/SCALE.md](docs/SCALE.md).
- **Extraction is not guaranteed, and can't be.** HTML carries no marker meaning "this is the
  article"; every extractor is inferring from layout. The pipeline above removes the failures
  that were found and refuses pages it can't read, but a site nobody has tried can still
  surprise it. Pasting the text always works.
- **Paywalled and JavaScript-rendered pages need pasting.** A subscriber-only article returns
  402 however it's fetched. Pages that build themselves in the browser only work if the
  optional `JINA_API_KEY` hosted-reader fallback is configured.
- **No test suite.** `npm test` is a stub; `./test-api.sh` covers the API path and
  `npm run check:extraction` covers URL extraction, both against live services.
  Unit coverage should start with LLM output validation, the auth flow, and the pure
  extraction helpers.
- **Frontend types are hand-mirrored** from `src/types/models.ts` with nothing enforcing
  agreement. This already caused one bug.
- **Accessibility is incomplete.** Keyboard focus and MCQ semantics are fixed; a full pass
  (labels, live regions) is in progress.
- **Not responsive yet.** Desktop-first; a mobile pass is the current work.

[docs/SCALE.md](docs/SCALE.md) covers what breaks at 10k users in more depth — query costs,
bundle size, where the N+1s are, and what I'd fix in what order.
