> **Superseded — historical.** This describes the app *before* the notebook
> redesign, and every token in §5 has since been replaced. It is kept as the
> record of what the redesign started from. For the current system see
> `docs/articulo-redesign/DESIGN_HANDOFF.md` and the "Design System" section of
> `CLAUDE.md`.

# Articulo — Redesign Design Brief

A description of the app as it exists today: every route, what the user does on
it, the flows that connect them, the component inventory, and the design tokens
currently in use. This is the baseline a redesign has to either preserve or
deliberately replace.

Two exploratory directions already exist as standalone lesson-view mockups —
`frontend/public/design/reference.html` (dictionary / phrasebook) and
`frontend/public/design/marker.html` (highlighter / study). Both cover the
lesson view only; everything else in this brief is still unaddressed by them.

---

## 1. What the product is

Paste an article (or a link) in a language you're learning. The app runs it
through Claude and returns a lesson: inline vocabulary with translations,
comprehension MCQs, vocabulary MCQs, short-answer questions, and writing
prompts. You answer, submit, and get scored feedback with grammar corrections
and better-word suggestions. Words you tap while reading get saved to a personal
collection; each lesson gets one free-text note.

Four languages: Spanish, French, Japanese, Korean. Three difficulty levels:
beginner, intermediate, advanced.

**The reading surface is the product.** Everything else is scaffolding around it.

---

## 2. Screens and routes

Twelve route entries, nine distinct screens. Auth state is the main axis:
`/` `/login` `/register` are public-only (redirect away when signed in),
`/lessons/demo*` is public to everyone, the rest require a token.

### `/` — Home *(public)*
`frontend/src/pages/Home.tsx`

Single centered hero on a grain-textured cream field. Leaf mark, wordmark
"Articulo" in Fraunces, one-line value prop, one paragraph of explanation, two
buttons, one footer line.

- **Primary action is "Try a lesson"**, not "Sign up" — it routes to the demo,
  which needs no account and is graded in the browser.
- Secondary: "Sign Up". Tertiary text link: "Log in".

No nav, no footer, no scroll. Currently the only marketing surface in the app.

### `/login` and `/register` *(public-only)*
`pages/Login.tsx`, `pages/Register.tsx`

Near-identical: centered `max-w-md` column, leaf mark, display heading
("Welcome" / "Create Account"), one-line subhead, two icon-prefixed inputs
(email, password), full-width submit, cross-link to the other form. Errors
render as a red-tinted rounded box above the fields.

Register asks for email + password only — **no name field**, despite the DB
having one and the UI never showing a user's name anywhere.

### `/dashboard` — lesson creation *(auth)*
`pages/Dashboard.tsx`

The app's home once signed in, and its most complex screen. Vertically stacked,
centered, on a cream field with four soft out-of-focus circles (sage, moss,
sand, terracotta at 6–12% opacity) fixed behind the content.

Top to bottom:
1. **Header** — an avatar-ish circle on the left that is decorative only (no
   menu, no sign-out anywhere in the app), and a pill nav on the right: My
   Lessons / Vocabulary / Notes.
2. **Hero** — leaf mark, "What will you explore today?", subhead.
3. **URL input** — link icon, "Paste an article link…"
4. **Toggle** — "or paste text instead", flanked by two hairlines. Expands a
   textarea with a live character counter (100–10,000) that turns terracotta
   when out of range.
5. **Generate Lesson** — full-width, disabled until input is valid.
6. **Progress copy** — creation takes ~10s (four Claude calls), and on a cold
   free-tier server up to a minute. The status line escalates through four
   messages by elapsed seconds and eventually names the reason.
7. **"Learning in"** — four language pills with flags, persisted to the server.
8. **"Level"** — three difficulty pills, persisted to `localStorage`.

Design problems worth naming: language and level are the *least* prominent
controls on the page but must be correct before generating; the header avatar
implies an account menu that doesn't exist; there's no sign-out.

### `/lessons/:id` and `/lessons/demo` — the lesson *(auth / public)*
`pages/LessonView.tsx`

`max-w-3xl` single column, grain overlay.

- `LessonHeader`: back link + two pills (native language name, difficulty).
- Optional truncation notice when the source article was over the cap, with a
  link to the original.
- **Article** — centered display title, then paragraphs at `text-lg
  leading-relaxed`. Vocabulary words are inline buttons: sage tint, sage
  underline. Each word is highlighted **only on its first occurrence**.
- Tapping one opens `VocabPopover` — a 288px white card portalled to `body`,
  positioned below the word (flipping right if it would fall off screen):
  word + part of speech, translation, explanation, optional example in a
  quoted rule, and a save affordance that varies by state (save / saving /
  saved+link / "Sign up to save words" when signed out).
- Leaf divider.
- **Questions** — grouped "Reading Comprehension" and "Vocabulary", both MCQ,
  then "Short Answer" textareas. MCQ options are A–D labelled rows; pressing
  the letter key selects. The vocabulary block deliberately hides the word
  under test.
- **Writing** — prompts with textareas and a live word counter against the
  prompt's min/max, colored by whether you're in range.
- Full-width Submit.

Answers autosave to `localStorage` on a 500ms debounce so a refresh doesn't
lose them. Visiting an already-submitted lesson redirects to its results.

This is the screen that matters most and the one the two existing mockups
attack.

### `/lessons/:id/results` and `/lessons/demo/results`
`pages/LessonResults.tsx`

Same `max-w-3xl` column.

- Back link, "Lesson Results" heading, article title.
- **`ScoreSummary`** — white card with a 120px animated SVG progress ring
  (sage ≥70%, terracotta below) beside up to three stat cards (MCQ fraction,
  short-answer average /10, writing average /10). Only sections the lesson had
  are shown, and the grid columns follow the count.
- Overall feedback in a sage-tinted panel.
- "Detailed Results" divider, then, each as an optional section of white cards:
  `MCQResults` (every option re-rendered, correct one green, your wrong pick
  terracotta, the rest dimmed), `ShortAnswerResults` (question, score pill,
  your answer as a blockquote, feedback), `WritingResults` (same plus
  Strengths / Areas to Improve lists), `GrammarCorrections` (struck original →
  corrected, with explanation), `VocabSuggestions` (same arrow pattern).
- "Your Notes" divider → an autosaving textarea (1s debounce) with a live
  "Saving… / Saved / couldn't save" status.
- Collapsible "Saved Vocabulary (n)" for words saved during this lesson.
- Two footer buttons: Review Article / Back to Dashboard.

This page is long and uniform — a dozen near-identical white rounded cards. It
is the strongest candidate for hierarchy work.

### `/lessons` — history *(auth)*
`pages/LessonHistory.tsx`

Back link, "My Lessons", then a vertical stack of white cards: article title,
a metadata row (flag + language · difficulty · date) and, right-aligned, either
a score badge (sage ≥70, terracotta below) or an "In Progress" pill. Completed
cards link to results, in-progress to the lesson. Empty state: book icon,
"No lessons yet", CTA to the dashboard.

No search, no filter, no pagination UI (fetches 50).

### `/vocabulary` — saved words *(auth)*
`pages/SavedVocabularyPage.tsx`

Back link, "Vocabulary", count. A row of five filter pills (All + four
languages). Then cards: word in display face, translation in sage, explanation,
the source sentence in italic behind a sage left-rule, and a footer row
(language · date · "View lesson"). A delete × appears on hover and removes
optimistically.

No search, no sort, no grouping — this is the screen most likely to break
down as the list grows past a screenful.

### `/notes` *(auth)*
`pages/NotesOverview.tsx`

Same card list shape: article title, flag + language · date, a two-line clamp
of the note, chevron. Links to the lesson's results page. Empty state points
you at the results page. **Notes can't be created or deleted from here** — only
edited on the results page.

### `*` — 404
`pages/NotFound.tsx` — big sage "404", heading, one CTA whose destination
depends on whether a token exists.

### Error boundary
`components/ErrorBoundary.tsx` — full-screen fallback with a reload button;
shows the error message only in dev.

---

## 3. User flows

**First visit (the one that matters)**
`/` → "Try a lesson" → `/lessons/demo` → read, tap words, answer → Submit
(graded client-side by `lib/demoGrading.ts`) → `/lessons/demo/results` →
sign-up prompts appear at the save affordance and in the results footer.
Refreshing demo results loses them and bounces back to the demo lesson.

**Create a lesson**
`/dashboard` → set language + level → paste URL or text → Generate → ~10–60s
wait with escalating status copy → `/lessons/:id`.

**Take a lesson**
Read → tap vocab → save words → answer MCQs (keyboard A–D) → short answers →
writing → Submit → `/lessons/:id/results`. Draft answers survive refresh.

**Review**
`/lessons` → card → results (or back into the lesson if unfinished).

**Collect**
Tap word in a lesson → save → `/vocabulary` → filter by language → delete, or
jump back to the source lesson.

**Note**
Results page → type in the notes box → autosaves → later findable at `/notes`.

**Auth**
Protected route without a token redirects instantly to `/login` carrying the
intended destination; login returns you there. An expired token redirects after
`/auth/me` resolves.

Gaps in the flow map: **no sign-out**, no account/settings screen, no way to
delete a lesson, no path from `/notes` to creating a note, and no navigation
chrome on the lesson or results pages beyond a single "back" link — the pill
nav exists only on the dashboard.

---

## 4. Component inventory

**Layout / chrome**
- Page shell: `min-h-screen bg-cream font-body` + grain overlay + `max-w-3xl
  mx-auto px-6 py-8` (or the centered variant on Home/auth).
- Dashboard background: four blurred circles.
- Back link: chevron + label, `text-sm`.
- Section divider: hairline — label or leaf — hairline.

**Controls**
- Primary button: full-width or inline, sage → sage-dark → olive, white text,
  `rounded-2xl`, shadow-md → lg.
- Secondary button: sand border, transparent, hover white + shadow.
- Pill toggle (language, difficulty, vocab filter): sage/white when active,
  cream-dark/bark-light when not.
- Text input: white, sand border, `rounded-2xl`, `py-4`, optional left icon
  that tints sage on focus-within, sage/30 focus ring.
- Textarea: same, `resize-none`, with a counter beneath (characters on the
  dashboard, words on writing prompts).
- MCQ option row: bordered `rounded-xl` label with a 28px A–D circle; radio is
  `sr-only` and the label carries focus styling.

**Content**
- Card: `bg-white rounded-2xl border border-sand shadow-sm`, `p-5` for list
  rows, `p-6` for result blocks. This one shape carries almost all content.
- List card (history / notes / vocabulary): title, meta row, right-aligned
  status.
- Score badge and score pill: tinted sage or terracotta.
- Inline vocabulary highlight + popover.
- Score ring (`CircularProgress`) + stat cards.
- Correction row: original → arrow → corrected + explanation.
- Blockquote for user-submitted text: sand left-rule, italic.
- Empty state: 48px outline icon, message, optional sub-message, optional CTA.
- Loading state: spinning SVG + "Loading …" — repeated near-verbatim in five
  files.
- Error banner: `text-red-700 bg-red-50 border-red-200` — the one place raw
  Tailwind reds appear instead of terracotta.

---

## 5. Current design tokens

### Color (`frontend/tailwind.config.js`)

| Token | Hex | Used for |
|---|---|---|
| `cream` | `#F7F3EB` | Page background, everywhere |
| `cream-dark` | `#EDE7DA` | Inactive pills, subtle fills |
| `sage` | `#8B9E7E` | Primary action, highlights, correct |
| `sage-dark` | `#6B7F5E` | Hover, links, emphasis text |
| `olive` | `#5C6B4F` | Active/pressed |
| `moss` | `#A4B494` | Background shapes only |
| `sand` | `#E2D9C8` | All borders, dividers, rules |
| `bark` | `#3D3929` | Body text, headings |
| `bark-light` | `#7A7265` | Secondary text |
| `terracotta` | `#B5594E` | Errors, incorrect, below-threshold |

Plus untokenized `red-700 / red-50 / red-200` in five error banners, and heavy
use of opacity suffixes as de-facto tokens: `sage/10`, `sage/15`, `sage/20`,
`sage/30`, `bark-light/40`, `/50`, `/60`, `/70`, `/80`, `sand/50`.

Semantic mapping today: **sage = action, success, and brand all at once**;
terracotta = error and failure; there is no warning, info, or neutral-accent
color. Everything is light mode — **there is no dark mode and no
`prefers-color-scheme` handling anywhere**.

### Type

Loaded from Google Fonts in `index.html`:

- **Display — Fraunces** (variable, 300–900, with italics). Used for headings,
  the wordmark, vocabulary words, score numbers, and card titles. Weights in
  use: `semibold` (600) mostly, `bold` (700) on page h1s.
- **Body — Albert Sans** (300–700). Everything else. Weights: 400, `medium`
  (500), `semibold` (600).

Sizes are Tailwind defaults:
- Page h1: `text-3xl`, hero h1 `text-4xl md:text-5xl`, home `text-5xl md:text-6xl`
- Article title: `text-3xl md:text-4xl`
- Section h2: `text-2xl`
- Card title: `text-lg`
- Article body: `text-lg leading-relaxed`
- Body: `text-base`, secondary `text-sm`, meta `text-xs`
- Headings carry `tracking-tight`; uppercase micro-labels carry `tracking-wide`

No custom line-height or measure token — the article column is bounded only by
`max-w-3xl` (768px), which at `text-lg` runs long for sustained reading. Both
exploratory mockups introduce a `--measure` of 60–64ch, which is the right
instinct.

### Space, radius, shadow, motion

- Page container: `max-w-3xl mx-auto px-6 py-8`; forms `max-w-md`, dashboard
  input column `max-w-xl`.
- Rhythm: `space-y-3` list rows, `space-y-4` form fields, `space-y-6` question
  groups, `space-y-10`/`space-y-12` between major sections, `my-10`/`my-12`
  around dividers, `mb-6` under section headings, `mb-8` under page headers.
- Radius: `rounded-2xl` (16px) on nearly everything, `rounded-xl` (12px) on
  nested rows, `rounded-full` on pills and badges.
- Shadow: `shadow-sm` at rest → `shadow-md` on hover for cards; `shadow-md` →
  `shadow-lg` for primary buttons.
- Motion: `transition-all duration-200` is the house default, applied almost
  universally. Exceptions: the score ring's `0.8s ease-out` reveal and the
  chevron's 200ms rotate.
- Texture: an inline SVG `feTurbulence` grain at 3.5% opacity, repeated as a
  128px tile — duplicated verbatim in six page files.

---

## 6. Constraints a redesign inherits

- **Tailwind 3** with the custom palette above. A token change means editing
  `tailwind.config.js` plus every opacity-suffixed usage.
- **Four languages including Japanese and Korean.** Any display face must have
  a sane CJK fallback; the article body will render CJK regularly.
- **Content is model-generated and variable**: 6–20 vocabulary words, 3–5
  comprehension questions, 4–5 vocabulary MCQs, 1–3 writing prompts, article
  text up to 10,000 characters. Every layout has to survive both the short and
  the long end. Every results section can be absent.
- **Lesson creation takes 10–60 seconds.** The waiting state is a real screen
  and deserves real design, not a spinner.
- **The demo is the front door.** It must work signed-out end to end, and its
  results exist only in memory.
- Frontend types are hand-mirrored from the backend; no shared package.

## 7. Open questions for the redesign

1. Does the sage/cream/Fraunces identity survive, or is it replaced? Both
   existing mockups replace it entirely — Reference goes to paper + reference
   blue + Newsreader, Marker to white + highlighter tints + Bricolage.
2. Does the app get persistent navigation chrome, or stay page-by-page with
   back links?
3. Where do account controls live — and does sign-out get a home?
4. Does the results page stay one long scroll, or become sectioned/tabbed?
5. Does vocabulary get a real browsing surface (search, grouping, sort) or stay
   a flat filtered list?
6. Dark mode: in scope or explicitly out?
7. Mobile: currently only the dashboard, score summary, and home use `sm:`/`md:`
   breakpoints at all. Is mobile a first-class target?
