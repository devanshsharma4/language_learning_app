/** @type {import('tailwindcss').Config} */

/**
 * "Notebook" design tokens — see docs/articulo-redesign/DESIGN_HANDOFF.md §2.
 *
 * The old sage/cream palette is gone entirely, including its opacity-suffixed
 * usages. Highlighter colors are NOT here: they need raw RGB triples to build
 * the marker gradient, so they live in src/lib/partOfSpeech.ts alongside the
 * part-of-speech mapping that gives them their meaning.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Titles, section headings, vocab headwords, big scores.
        display: ['"Zilla Slab"', 'Georgia', 'serif'],
        // Anything in the target language. CJK falls back to Noto Sans, which
        // is a sans — the handoff's font list has no CJK serif. Flagged.
        read: ['Literata', '"Noto Sans JP"', '"Noto Sans KR"', 'Georgia', 'serif'],
        // All UI chrome: nav, buttons, labels, body copy.
        ui: ['Recursive', '"Noto Sans JP"', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
      },
      // Recursive is variable 300–1000; these intermediate weights are used by
      // the mockups and have no Tailwind default.
      fontWeight: {
        550: '550',
        650: '650',
        750: '750',
        850: '850',
      },
      colors: {
        paper: '#FCFBF7',
        grid: '#E4EBF1',
        // The red notebook margin line, and the rules on index cards.
        margin: '#F4C2BD',
        ink: {
          DEFAULT: '#1E2230',
          // The handoff lists both #3A3F4C and #3A4256 for secondary text.
          // Collapsed to one — they are indistinguishable in use.
          2: '#3A4256',
          // Lowest permitted text contrast on paper. Nothing lighter.
          3: '#5B6170',
        },
        line: {
          DEFAULT: '#CCD5DF',
          strong: '#B9C3CE',
          // Dashed borders: "~6 min read" chip, the hand-it-in rule.
          dash: '#9AA6B4',
          // A–D badge border at rest.
          badge: '#AFC0DA',
        },
        // Ruled lines inside cards and textareas.
        rule: {
          DEFAULT: '#DCE7F3',
          textarea: '#D5E3F1',
        },
        pen: {
          DEFAULT: '#2B4FD8',
          dark: '#1A36A8',
          // Selected-row fill.
          tint: '#EEF3FF',
          // Chips, avatar, spinner track.
          chip: '#D6E4FF',
          // Focus ring on inputs.
          ring: '#DCE6FF',
          // Offset shadow under a selected choice row.
          shadow: '#C3D3FA',
          // Selected choice-row text.
          text: '#16244F',
          // A–D badge fill at rest.
          badge: '#F2F6FC',
        },
        // Offset shadow on primary buttons, and the word-count meter fill.
        sticker: '#FFE08A',
        // Sticky notes: slow-server messages, tutor feedback.
        note: '#FFF4CC',
        tape: {
          sand: 'rgba(236,214,158,0.75)',
          blue: 'rgba(188,214,236,0.8)',
        },
        // Correct / incorrect on the results page. Paired with ✓/✕ always,
        // never color alone.
        correct: { DEFAULT: '#2F8A4C', tint: '#D9F2DF', text: '#1D6334' },
        wrong: { DEFAULT: '#D6336C', tint: '#FFE3EC', text: '#8E2352' },
      },
      boxShadow: {
        // "Paper" — a sheet lifted off the page.
        paper: '0 1px 2px rgba(30,34,48,0.08), 0 18px 40px -24px rgba(30,34,48,0.35)',
        card: '0 1px 2px rgba(30,34,48,0.1), 0 16px 30px -18px rgba(30,34,48,0.4)',
        sticker: '4px 4px 0 #FFE08A',
        choice: '3px 3px 0 #C3D3FA',
        ring: '0 0 0 4px #DCE6FF',
      },
      borderRadius: {
        // "Hand-drawn" boxes: the A–D badges and definition-card corners.
        hand: '7px 5px 8px 6px',
      },
    },
  },
  plugins: [],
};
