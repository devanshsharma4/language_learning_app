import { Link } from 'react-router-dom';
import { languageNativeName } from '../../lib/languages';

interface LessonHeaderProps {
  language: string;
  difficulty: string;
}

export default function LessonHeader({ language, difficulty }: LessonHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-8">
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-bark-light hover:text-bark transition-colors duration-200"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span className="text-sm font-medium">Back</span>
      </Link>

      <div className="flex items-center gap-2">
        <span className="bg-sage/15 text-sage-dark rounded-full px-3 py-1 text-sm font-medium">
          {languageNativeName(language)}
        </span>
        <span className="bg-cream-dark text-bark-light rounded-full px-3 py-1 text-sm font-medium capitalize">
          {difficulty}
        </span>
      </div>
    </header>
  );
}
