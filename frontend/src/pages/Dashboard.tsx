import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

const languages = [
  { value: 'spanish', label: 'Espanol', flag: '\u{1F1EA}\u{1F1F8}' },
  { value: 'french', label: 'Francais', flag: '\u{1F1EB}\u{1F1F7}' },
  { value: 'japanese', label: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}' },
  { value: 'korean', label: '\uD55C\uAD6D\uC5B4', flag: '\u{1F1F0}\u{1F1F7}' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [articleUrl, setArticleUrl] = useState('');
  const [articleText, setArticleText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [language, setLanguage] = useState('spanish');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = (articleUrl.trim() || articleText.trim()) && !loading;

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/lessons/create', {
        articleUrl: articleUrl.trim() || undefined,
        articleText: articleText.trim() || undefined,
        language,
        difficulty: 'intermediate',
      });
      const lesson = data.data?.lesson ?? data.lesson ?? data;
      navigate(`/lessons/${lesson.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-cream font-body overflow-hidden">
      {/* Background organic shapes */}
      <div className="pointer-events-none fixed inset-0">
        <svg
          className="absolute -top-24 -right-24 w-[28rem] h-[28rem] text-sage/[0.08]"
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r="100" fill="currentColor" />
        </svg>
        <svg
          className="absolute -bottom-36 -left-20 w-[22rem] h-[22rem] text-moss/[0.12]"
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r="100" fill="currentColor" />
        </svg>
        <svg
          className="absolute top-[30%] right-[18%] w-44 h-44 text-sand/50"
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r="100" fill="currentColor" />
        </svg>
        <svg
          className="absolute bottom-[20%] left-[12%] w-32 h-32 text-terracotta/[0.06]"
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r="100" fill="currentColor" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-sage-dark"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            to="/lessons"
            className="px-4 py-2 rounded-full text-sm font-medium text-bark-light hover:bg-cream-dark transition-colors duration-200"
          >
            My Lessons
          </Link>
          <Link
            to="/notes"
            className="px-4 py-2 rounded-full text-sm font-medium text-bark-light hover:bg-cream-dark transition-colors duration-200"
          >
            Notes
          </Link>
        </nav>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center px-6 pt-20 md:pt-28 pb-20">
        {/* Leaf icon */}
        <div className="mb-5 text-sage">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.5" />
            <path d="M9 12H4" />
          </svg>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-semibold text-bark text-center mb-3 tracking-tight leading-tight">
          What will you explore today?
        </h1>
        <p className="text-bark-light text-center mb-14 text-lg max-w-md">
          Drop in an article and we'll craft a lesson just for you.
        </p>

        {/* Input area */}
        <div className="w-full max-w-xl space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          {/* URL input */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-bark-light/40 group-focus-within:text-sage transition-colors duration-200">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <input
              type="url"
              placeholder="Paste an article link..."
              value={articleUrl}
              onChange={(e) => setArticleUrl(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-white rounded-2xl border border-sand text-bark placeholder:text-bark-light/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 shadow-sm hover:shadow-md transition-all duration-200"
            />
          </div>

          {/* Toggle for text input */}
          <button
            type="button"
            onClick={() => setShowTextInput(!showTextInput)}
            className="flex items-center gap-3 mx-auto text-sm text-bark-light/50 hover:text-sage-dark transition-colors duration-200 cursor-pointer"
          >
            <span className="h-px w-10 bg-sand" />
            {showTextInput ? 'hide text input' : 'or paste text instead'}
            <span className="h-px w-10 bg-sand" />
          </button>

          {/* Expandable textarea */}
          {showTextInput && (
            <textarea
              placeholder="Paste your article text here..."
              value={articleText}
              onChange={(e) => setArticleText(e.target.value)}
              rows={5}
              className="w-full px-4 py-4 bg-white rounded-2xl border border-sand text-bark placeholder:text-bark-light/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 shadow-sm hover:shadow-md transition-all duration-200 resize-none"
            />
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="w-full py-4 bg-sage hover:bg-sage-dark active:bg-olive text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-md text-lg cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Lesson'
            )}
          </button>
        </div>

        {/* Language selector */}
        <div className="mt-12 flex flex-col items-center gap-3">
          <span className="text-sm text-bark-light/60 font-medium tracking-wide uppercase">
            Learning in
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {languages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                  language === lang.value
                    ? 'bg-sage text-white shadow-sm'
                    : 'bg-cream-dark text-bark-light hover:bg-sand'
                }`}
              >
                <span className="mr-1.5">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
