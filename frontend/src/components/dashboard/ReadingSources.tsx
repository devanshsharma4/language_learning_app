import type { Language } from '../../lib/languages';
import { languageEnglishName } from '../../lib/languages';
import { readingSources, wikipediaSource } from '../../lib/sources';

interface ReadingSourcesProps {
  language: Language;
  /**
   * Shown after a link was refused, where the tone changes: this is no longer a
   * suggestion but the way forward.
   */
  afterFailure?: boolean;
}

/**
 * Where to find something to read.
 *
 * Finding material is the hard part of reading in a language you are learning,
 * and a link that won't open makes the whole feature feel broken — so this
 * stays quiet in the normal case and does the real work after a refusal.
 *
 * Wikipedia leads for a reason the reader doesn't need to know: those links are
 * read through the API rather than scraped, so they can't be paywalled or
 * mis-parsed. The copy gives them a reason of their own instead.
 */
export default function ReadingSources({ language, afterFailure = false }: ReadingSourcesProps) {
  const wikipedia = wikipediaSource(language);
  const others = readingSources(language);

  return (
    <div className={afterFailure ? 'mt-3' : 'mt-4'}>
      <p className="mono m-0 text-xs text-ink-3">
        {afterFailure
          ? 'these open reliably — find an article and copy its link'
          : `where to find something in ${languageEnglishName(language)}`}
      </p>

      <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0">
        <li>
          <a
            href={wikipedia.url}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[15px] no-underline"
          >
            <span className="font-650 text-ink group-hover:underline">{wikipedia.name}</span>
            <span className="text-[13px] text-ink-3">{wikipedia.note}</span>
          </a>
        </li>

        {others.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-sm no-underline"
            >
              <span className="font-650 text-ink-2 group-hover:underline">{source.name}</span>
              <span className="text-[13px] text-ink-3">{source.note}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
