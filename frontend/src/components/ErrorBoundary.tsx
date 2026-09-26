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

    return (
      <div className="min-h-screen bg-cream font-body flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl font-semibold text-bark mb-3">
            Something broke on our end
          </h1>
          <p className="text-bark-light mb-6">
            This page hit an unexpected error. Reloading usually clears it — your saved lessons
            and notes are unaffected.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-sage hover:bg-sage-dark active:bg-olive text-white font-semibold rounded-2xl px-5 py-2.5 shadow-md hover:shadow-lg transition-all duration-200"
            >
              Reload the page
            </button>
            <a
              href="/dashboard"
              className="text-sage-dark hover:text-olive transition-colors duration-200"
            >
              Back to Dashboard
            </a>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-8 text-left text-xs text-terracotta bg-white border border-sand rounded-xl p-4 overflow-x-auto">
              {error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
