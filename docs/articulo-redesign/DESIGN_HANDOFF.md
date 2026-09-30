# Articulo — "Notebook" redesign handoff

Everything needed to rebuild the frontend in the new design. The HTML files in `screens/` are
**static visual mockups** (open them in a browser at 1440px wide). They are the source of truth for
how things look — not for how the code should be structured. All styles are inline because of the
tool they came from; translate them into Tailwind tokens and shared components, don't copy them verbatim.

---

## 1. Screens → routes

| Mockup | Route | Replaces |
|---|---|---|
| `08a-welcome-signup.html`, `08b-welcome-login-error.html` | `/`, `/login`, `/register` → **one page** with Sign up / Log in tabs | `Home.tsx`, `Login.tsx`, `Register.tsx` |
| `03-dashboard-new-lesson.html` | `/dashboard` | `Dashboard.tsx` |
| `04-generating.html` | `/dashboard` while generating | the "Generating…" button state |
| `01-lesson.html` | `/lessons/:id` | `LessonView.tsx` |
| `02-results.html` | `/lessons/:id/results` | `LessonResults.tsx` |
| `05-my-lessons.html`, `05b-my-lessons-loading.html` | `/lessons` | `LessonHistory.tsx` |
| `06-notes.html` | `/notes` | `NotesOverview.tsx` |
| `07-vocabulary.html` | `/vocabulary` | `SavedVocabularyPage.tsx` |
| `later/*` | not now | richer loading states + font comparison, for reference only |

Out of scope for now: mobile layouts, dark mode, the signed-out demo, the 404 page (restyle it with the same tokens).

---

## 2. Design tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `paper` | `#FCFBF7` | page background |
| `grid` | `#E4EBF1` | 1px grid lines, 24px squares |
| `margin` | `#F4C2BD` | red notebook margin line (2px, at x=150) and index-card rules |
| `ink` | `#1E2230` | main text |
| `ink-2` | `#3A3F4C` / `#3A4256` | secondary text |
| `ink-3` | `#5B6170` | labels, meta (lowest allowed text contrast) |
| `line` | `#CCD5DF` | card/input borders; `#B9C3CE` for header & strong borders |
| `rule` | `#DCE7F3` | ruled lines inside cards/textareas |
| `pen` | `#2B4FD8` | primary action, links, selected states; hover `#1A36A8` |
| `pen-tint` | `#EEF3FF` / `#D6E4FF` | selected fills, avatar, chips |
| `sticker` | `#FFE08A` | offset shadow on primary buttons (`4px 4px 0`) |
| `note` | `#FFF4CC` | sticky notes (loading/wait messages) |
| `tape-sand` / `tape-blue` | `rgba(236,214,158,.75)` / `rgba(188,214,236,.8)` | washi tape strips |

### Highlighters (one per part of speech — this is a *meaning*, keep it consistent everywhere)
| Part of speech | Highlight RGB | Chip bg / text |
|---|---|---|
| noun | `120,175,255` | `#D6E4FF` / `#1A36A8` |
| verb | `255,140,180` | `#FFE3EC` / `#8E2352` |
| adjective | `255,215,90` | `#FFF1C4` / `#7A5A00` |
| adverb | `120,210,140` | `#D9F2DF` / `#1D6334` |
| other (phrase, pronoun, etc.) | **TBD — suggest lavender `180,150,255`** | `#EADFFF` / `#5A2E9E` |

Highlighter stroke (reuse as one utility/component):
```css
background: linear-gradient(100deg, rgba(R,G,B,.12) 0%, rgba(R,G,B,.55) 4%, rgba(R,G,B,.42) 50%, rgba(R,G,B,.6) 96%, rgba(R,G,B,.12) 100%);
border-radius: 3px 8px 4px 9px / 8px 4px 9px 3px;
padding: 0 3px; margin: 0 -3px;
-webkit-box-decoration-break: clone; box-decoration-break: clone;
```
Results page keeps green = correct, pink = wrong (always paired with ✓ / ✕ icons).

### Type (Google Fonts)
```
https://fonts.googleapis.com/css2?family=Recursive:slnt,wght,CASL,CRSV,MONO@-15..0,300..1000,0..1,0..1,0..1&family=Zilla+Slab:wght@600;700&family=Literata:ital,opsz,wght@0,7..72,400..700;1,7..72,400..700&family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap
```
| Role | Font | Notes |
|---|---|---|
| Titles, section headings, vocab headwords, big score | **Zilla Slab** 700 | |
| Anything in the target language: article, questions, answer options, typed answers, corrections, definitions/examples | **Literata** | article 20px / 36px line-height, ~62ch column (760px card, 64px padding) |
| UI: nav, buttons, labels, body copy, tutor note, sticky notes | **Recursive** | `font-variation-settings: 'CASL' 0.5` |
| Small margin labels ("page 14", "part 2 · 5 questions", dates) | **Recursive Mono Casual** | `'MONO' 1, 'CASL' 1`, 12–14px |
| Japanese / Korean | Noto Sans JP / KR fallback | **never italicize CJK** |

### Shape & depth
- Radii: inputs/cards 10–14px, pills 6–8px, "hand-drawn" boxes use irregular radii (e.g. `7px 5px 8px 6px`).
- Paper shadow: `0 1px 2px rgba(30,34,48,.08), 0 18px 40px -24px rgba(30,34,48,.35)`.
- Primary button: `bg-pen text-white rounded-xl shadow-[4px_4px_0_#FFE08A]`.
- Slight rotations on taped items only (±0.3–1.5°). Never rotate the article itself.

---

## 3. Shared components to build first
1. `NotebookPage` — paper bg + 24px grid + red margin line. Replaces the duplicated grain overlay and blurred circles (delete those).
2. `TopNav` — wordmark, New lesson / My lessons / Vocabulary / Notes (active = blue highlighter stroke), **account menu with Sign out**. On every signed-in page.
3. `Highlight` — takes `pos` → color. Rendered as an inline `span role="button" tabIndex=0` (not `<button>`) so multi-word phrases can wrap lines.
4. `Tape` — absolutely positioned strip, sand or blue, small rotation.
5. `PaperCard` / `IndexCard` — white card, red rule under header, ruled body (`repeating-linear-gradient`).
6. `StickyNote` — `#FFF4CC`, tape, slight rotation. Used for slow-server messages and tutor feedback.
7. `ChoiceRow` — MCQ option: A–D badge, selected = `pen-tint` fill + `pen` border + `3px 3px 0 #C3D3FA` shadow. Keeps A–D keyboard shortcut (no visible hint needed).
8. `RuledTextarea` — lined interior; focused = 2px pen border + 4px `#DCE6FF` ring.
9. `SectionLabel` — pastel chip eyebrow ("part 2 · 5 questions").
10. `Spinner` — 3px ring, `#D6E4FF` track, `pen` arc, 0.9s linear spin.

---

## 4. Behavior specs

**Lesson view**
- Only the first occurrence of each vocab word is highlighted; highlight the *surface form* in the text (e.g. "désolée"), show the base form ("désolé") on the card.
- Tapping a word opens **one** definition card in the right margin, vertically aligned to that word's line (`getBoundingClientRect`), clamped to the viewport. Tapping another word moves the card; ×, Esc, or clicking outside closes it. Cards never stack.
- Saved words get a small blue ✓ after the word. Right margin top shows the highlighter key with counts per part of speech.
- Left margin: section outline (read / questions / short answer / writing) linking to anchors.
- Below ~1280px there's no margin: fall back to a popover (out of scope now, but don't hard-break).
- Submit button copy: "Hand it in".

**Results**
- Overall % = average of the section percentages; say so under the breakdown bars.
- Correct MCQs collapse to one line; wrong ones expand showing your pick (✕, pink, struck) and the right answer (✓, green). "Show the other N correct answers" toggle.
- Tabs row jumps to sections. Notes (autosave) + saved words live in a right sidebar.

**Dashboard**: numbered steps 1 language → 2 level → 3 article (Link / Paste text tabs). Language uses code chips (ES/FR/JA/KO), **no flag emoji**.

**Generating** (simple version): button becomes pale blue with spinner + "Making your lesson…", existing escalating status line under it; after ~20s show the sticky note ("server was napping… up to a minute… no need to refresh").

**My lessons**: table-of-contents rows (page number, title with dotted leader, lang chip, level, date, circled score or "continue" chip). Client-side search + language + status filters. Row "⋯" menu → Delete lesson (needs a backend endpoint). Loading: spinner + sticky note after ~5s.

**Vocabulary**: index-card grid (3 cols). Search, language filter, part-of-speech filter with counts, sort. Hover shows × to remove (keep existing optimistic delete). Footer links to source lesson.

**Notes**: lined-paper cards linking to results; dashed card explaining notes are written on the results page.

**Welcome**: one page for `/`, `/login`, `/register`; tabs switch forms without navigation (keep URLs in sync). Error = pink alert + pink field border.

---

## 5. Data the design assumes — check the backend
- [ ] Part of speech is stored on saved vocab and lesson vocab, normalized to noun / verb / adjective / adverb / other.
- [ ] Surface form (as it appears in the article) **and** base form for each vocab item.
- [ ] Optional: reading for Japanese words (e.g. せんしゅ).
- [ ] Lesson "page number" = order of creation per user (can be computed client-side).
- [ ] Delete-lesson endpoint.
- [ ] Section scores returned in a form where overall = mean of sections (currently appears to be).

---

## 6. Gotchas
- Mockups contain **sample data** (scores, some questions, feedback, corrections, notes, "El mercado de San Miguel", four extra vocab words). Don't hard-code any of it.
- Welcome page line "Free, and your first lesson takes about a minute." is placeholder copy — confirm or remove.
- Contrast: don't use text lighter than `#5B6170` on paper; white text only on `pen` (#2B4FD8).
- Honor `prefers-reduced-motion` for the spinner/pulses.
- Recursive's CASL/MONO axes only work with the full axis URL above.
- Replace the old sage/cream palette entirely, including the opacity-suffixed classes (`sage/10` etc.) and raw Tailwind reds in error banners.
