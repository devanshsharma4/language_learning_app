import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import type { LessonSummary, Note } from '../types';
import { languageChip, languageCode, shortDate } from '../lib/languages';
import { ButtonLink, NotebookPage, SearchField, Spinner, Tape, TopNav } from '../components/notebook';

const ROTATIONS = ['-0.8deg', '0.7deg', '-0.4deg', '0.6deg', '-0.6deg', '0.5deg'];

interface NoteCardProps {
  note: Note;
  score?: number | null;
  index: number;
}

/**
 * A note on a page torn from the notebook.
 *
 * The text sits to the right of a red margin rule, the way it does in the field
 * you typed it into on the results page — so a note looks the same wherever you
 * meet it.
 */
function NoteCard({ note, score, index }: NoteCardProps) {
  return (
    <Link
      to={`/lessons/${note.lesson_id}/results`}
      className="relative block bg-white text-ink no-underline shadow-card"
      style={{ transform: `rotate(${ROTATIONS[index % ROTATIONS.length]})` }}
    >
      <Tape
        tone={index % 2 === 0 ? 'sand' : 'blue'}
        className="-top-3 left-1/2 -ml-11"
        rotate={index % 2 === 0 ? -3 : 4}
        width={90}
      />

      <div className="border-b-2 border-margin px-6 pb-3 pt-6 pl-14">
        <div className="font-display text-[19px] font-bold leading-tight">
          {note.article_title || 'Untitled'}
        </div>
        <div className="mono mt-2 flex items-center gap-2 text-xs text-ink-3">
          {note.language && (
            <span className={`rounded px-1.5 py-0.5 font-bold ${languageChip(note.language)}`}>
              {languageCode(note.language)}
            </span>
          )}
          {shortDate(note.updated_at)}
          {score != null && ` · ${score}%`}
        </div>
      </div>

      <p className="ruled-notes m-0 min-h-[150px] whitespace-pre-wrap px-6 pl-14 pt-0.5 text-[15px] leading-[30px] [--margin-x:40px]">
        {note.content}
      </p>

      <div className="flex items-center gap-1.5 px-6 pb-4 pl-14 pt-2.5 text-sm font-650 text-pen">
        Open lesson
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </div>
    </Link>
  );
}

/** Explains where notes come from, since they cannot be written on this page. */
function HowToCard() {
  return (
    <div className="flex min-h-[270px] flex-col justify-center gap-3 rounded-md border-2 border-dashed border-line-strong p-7">
      <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B6170" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h4L19 9l-4-4L4 16v4z" />
        <path d="M13 7l4 4" />
      </svg>
      <h2 className="m-0 font-display text-[19px] font-bold">Want another note?</h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-2">
        Every graded lesson has a notes box on its results page. Anything you write there shows
        up here.
      </p>
      <Link to="/lessons" className="text-[15px] font-650 no-underline hover:underline">
        See graded lessons →
      </Link>
    </div>
  );
}

export default function NotesOverview() {
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery<{ notes: Note[]; total: number }>({
    queryKey: ['notes'],
    queryFn: async () => {
      const { data } = await api.get('/notes?limit=200');
      return data.data ?? data;
    },
  });

  // Scores aren't on the note payload, so they come from the lessons list —
  // already cached by every other page.
  const { data: lessonList } = useQuery<{ lessons: LessonSummary[] }>({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data } = await api.get('/lessons?limit=50');
      return data.data ?? data;
    },
  });

  const scores = useMemo(() => {
    const byId = new Map<string, number | null | undefined>();
    for (const lesson of lessonList?.lessons ?? []) {
      byId.set(String(lesson.id), lesson.overall_score);
    }
    return byId;
  }, [lessonList]);

  // One note per lesson, so each note is one card.
  const notes = useMemo(() => data?.notes ?? [], [data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter((note) =>
      [note.content, note.article_title]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term)),
    );
  }, [notes, search]);

  return (
    <NotebookPage>
      <TopNav />

      <main className="px-6 pb-24 pt-12 xl:pl-[210px] xl:pr-8">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mono text-[13px] font-semibold text-ink-3">in the margins</p>
            <h1 className="mb-1.5 mt-1.5 font-display text-[40px] font-bold leading-[1.02] tracking-[-0.5px] xl:text-[46px]">
              Notes
            </h1>
            <p className="mono m-0 text-[13px] text-ink-3">
              {notes.length} note{notes.length === 1 ? '' : 's'} from your lessons
            </p>
          </div>

          {notes.length > 0 && (
            <SearchField
              value={search}
              onChange={setSearch}
              label="Search notes"
              placeholder="Search your notes"
              className="w-full sm:w-[280px]"
            />
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-3 py-16 text-ink-2">
            <Spinner size={22} label="Loading notes" />
            Finding your notes…
          </div>
        )}

        {error && (
          <p className="rounded-xl border-[1.5px] border-wrong bg-wrong-tint px-4 py-3 text-sm text-wrong-text">
            Couldn&apos;t load your notes. Try again in a moment.
          </p>
        )}

        {!isLoading && !error && notes.length === 0 && (
          <div className="max-w-md rounded-xl border-2 border-dashed border-line-strong px-7 py-9">
            <h2 className="m-0 font-display text-[22px] font-bold">No notes yet</h2>
            <p className="mb-5 mt-2 text-[15px] leading-relaxed text-ink-2">
              Hand in a lesson and you&apos;ll get a notes box beside your feedback. Whatever you
              write there collects here.
            </p>
            <ButtonLink to="/lessons">See my lessons</ButtonLink>
          </div>
        )}

        {!isLoading && notes.length > 0 && visible.length === 0 && (
          <p className="py-10 text-[15px] text-ink-2">
            No notes match that.{' '}
            <button
              type="button"
              onClick={() => setSearch('')}
              className="font-650 text-pen underline underline-offset-4"
            >
              Clear the search
            </button>
          </p>
        )}

        {visible.length > 0 && (
          <div className="grid grid-cols-1 items-start gap-9 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                score={scores.get(String(note.lesson_id))}
                index={index}
              />
            ))}
            {/* Only alongside real notes — on an empty page the dedicated empty
                state says the same thing with more room. */}
            <HowToCard />
          </div>
        )}
      </main>
    </NotebookPage>
  );
}
