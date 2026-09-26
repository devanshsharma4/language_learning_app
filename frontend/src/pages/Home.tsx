import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-cream font-body overflow-hidden flex flex-col items-center justify-center">
      {/* Grain texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      <div className="relative z-10 text-center px-6">
        {/* Leaf icon */}
        <div className="mb-5 text-sage">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto"
          >
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.5" />
            <path d="M9 12H4" />
          </svg>
        </div>

        <h1 className="font-display text-5xl md:text-6xl font-semibold text-bark tracking-tight mb-4">
          Articulo
        </h1>
        <p className="text-bark-light text-lg max-w-md mx-auto mb-4">
          Learn languages from real articles.
        </p>
        <p className="text-bark-light/80 text-base max-w-lg mx-auto mb-12">
          Paste something you actually want to read. Get the vocabulary, questions to check
          you understood it, and feedback on what you write back.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary action for a first-time visitor is to see the product, not
              to create an account. The demo needs no signup and is graded in the
              browser, so it costs nothing to offer. */}
          <Link
            to="/lessons/demo"
            className="w-full sm:w-auto px-8 py-3.5 bg-sage hover:bg-sage-dark active:bg-olive text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 text-lg"
          >
            Try a lesson
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 border border-sand hover:border-sage/40 text-bark font-semibold rounded-2xl hover:bg-white hover:shadow-sm transition-all duration-200 text-lg"
          >
            Sign Up
          </Link>
        </div>

        <p className="mt-6 text-sm text-bark-light/80">
          No signup needed for the demo ·{' '}
          <Link to="/login" className="text-sage-dark hover:text-olive underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
