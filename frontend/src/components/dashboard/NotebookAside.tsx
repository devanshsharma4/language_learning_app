import { Link } from 'react-router-dom';
import type { LessonSummary, SavedVocabulary } from '../../types';
import { languageCode } from '../../lib/languages';
import { partOfSpeechStyle } from '../../lib/partOfSpeech';
import { ScoreMark } from '../notebook';

interface PanelProps {
  title: string;
  linkLabel: string;
  linkTo: string;
  children: React.ReactNode;
}

function Panel({ title, linkLabel, linkTo, children }: PanelProps) {
  return (
    <div>
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-display text-[22px] font-bold">{title}</h2>
        <Link to={linkTo} className="text-sm font-650 no-underline hover:underline">
          {linkLabel}
        </Link>
      </div>
      {children}
    </div>
  );
}

interface RecentLessonsProps {
  lessons: LessonSummary[];
  /** Total lesson count, so page numbers count from the oldest. */
  total: number;
}

/**
 * The last few pages of the notebook.
 *
 * Shows the score for a finished lesson and an "in progress" chip for one left
 * open — which doubles as the way back into it. The old dashboard had no route
 * to an unfinished lesson at all; you had to go to My lessons and find it.
 */
export function RecentLessons({ lessons, total }: RecentLessonsProps) {
  if (lessons.length === 0) {
    return (
      <Panel title="Earlier pages" linkLabel="See all" linkTo="/lessons">
        <p className="rounded-xl border-[1.5px] border-dashed border-line-dash bg-white/60 px-4 py-5 text-center text-sm text-ink-3">
          Your finished lessons will collect here.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Earlier pages" linkLabel="See all" linkTo="/lessons">
      <div className="overflow-hidden rounded-xl border-[1.5px] border-line bg-white">
        {lessons.map((lesson, index) => (
          <Link
            key={lesson.id}
            to={lesson.completed ? `/lessons/${lesson.id}/results` : `/lessons/${lesson.id}`}
            className="flex items-center gap-3.5 border-b border-dashed border-line px-4 py-3.5 text-ink no-underline last:border-b-0 hover:bg-pen-tint"
          >
            <div className="min-w-0 flex-grow">
              <div className="font-display text-[17px] font-bold leading-tight">
                {lesson.article_title_english || lesson.article_title || 'Untitled'}
              </div>
              <div className="mono mt-1 text-xs text-ink-3">
                p.{total - index} · {languageCode(lesson.language)} · {lesson.difficulty}
              </div>
            </div>

            {lesson.completed && lesson.overall_score != null ? (
              <ScoreMark>{lesson.overall_score}</ScoreMark>
            ) : (
              <span className="mono flex-shrink-0 rounded bg-[#FFF1C4] px-2 py-0.5 text-xs font-bold text-[#5C4400]">
                in progress
              </span>
            )}
          </Link>
        ))}
      </div>
    </Panel>
  );
}

/**
 * Words kept recently, each still wearing the ink of its part of speech.
 *
 * Set as bare marked words with no translations: this is a glance at what you
 * have been collecting, not a study list. The translations are one click away.
 */
export function RecentWords({ words }: { words: SavedVocabulary[] }) {
  if (words.length === 0) return null;

  return (
    <Panel title="Recently saved" linkLabel="All words" linkTo="/vocabulary">
      <div className="flex flex-wrap gap-x-2 gap-y-2.5 font-display text-[18px] font-bold">
        {words.map((word) => {
          const { rgb, multiplier } = partOfSpeechStyle(word.part_of_speech);
          return (
            <span
              key={word.id}
              lang={word.language}
              title={word.translation ?? undefined}
              className="hl"
              style={{ '--hl': rgb, '--hl-m': multiplier } as React.CSSProperties}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    </Panel>
  );
}
