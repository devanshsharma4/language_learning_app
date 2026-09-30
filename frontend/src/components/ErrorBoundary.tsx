import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes so one bad component does not blank the whole app.
 *
 * Without this, any throw during render -- a malformed feedback payload, an
 * unexpected null -- unmounted the entire tree and left a white screen with no
 * navigation and no indication that anything had happened.
 *
 * Must be a class: there is still no hook equivalent of componentDidCatch.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    /*
     * Deliberately plain markup and no imported components: this renders only
     * after something below it has already thrown, so it must not depend on
     * anything that could throw too. The tokens are Tailwind classes, which
     * are just CSS by the time they get here.
     */
    return (
      <div className="notebook-grid flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-3 font-display text-[28px] font-bold text-ink">
            Something tore on our end
          </h1>
          <p className="mb-7 text-[15px] leading-relaxed text-ink-2">
            This page hit an unexpected error. Reloading usually clears it — your lessons,
            words and notes are unaffected.
          </p>
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="casual rounded-xl bg-pen px-6 py-3 text-base font-750 text-white shadow-sticker hover:bg-pen-dark"
            >
              Reload the page
            </button>
            <a href="/dashboard" className="text-[15px] font-650 text-pen no-underline hover:underline">
              Back to your notebook
            </a>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-8 overflow-x-auto rounded-xl border-[1.5px] border-line bg-white p-4 text-left text-xs text-wrong-text">
              {error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
