import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import RequireAuth from './components/RequireAuth';
import RedirectIfAuthed from './components/RedirectIfAuthed';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import LessonView from './pages/LessonView';
import LessonResults from './pages/LessonResults';
import LessonHistory from './pages/LessonHistory';
import NotesOverview from './pages/NotesOverview';
import SavedVocabularyPage from './pages/SavedVocabularyPage';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lessons and their feedback are immutable once created, and vocabulary and
      // notes only change through this tab's own mutations, which invalidate
      // explicitly. Refetching on every window focus bought nothing and cost a
      // request each time the user tabbed back.
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      // One retry covers a dropped connection without making a genuine failure
      // take four round trips to surface. 4xx responses are not worth retrying at
      // all -- a 401 or 404 will not succeed on a second attempt.
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public.

                One page serves all three paths. The tabs switch between the
                forms by navigating, so /login and /register still deep-link and
                the back button still works, but the page itself never remounts
                and nothing typed is lost on a switch. */}
            <Route
              path="/"
              element={
                <RedirectIfAuthed>
                  <Welcome />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/login"
              element={
                <RedirectIfAuthed>
                  <Welcome />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/register"
              element={
                <RedirectIfAuthed>
                  <Welcome />
                </RedirectIfAuthed>
              }
            />

            {/* The demo lesson is deliberately public: it is how someone tries the
                product before creating an account. It reads from a local fixture
                and is graded in the browser, so it touches no user data. These
                must be declared before the ":id" routes they shadow. */}
            <Route path="/lessons/demo" element={<LessonView />} />
            <Route path="/lessons/demo/results" element={<LessonResults />} />

            {/* Authenticated */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/lessons/:id/results"
              element={
                <RequireAuth>
                  <LessonResults />
                </RequireAuth>
              }
            />
            <Route
              path="/lessons/:id"
              element={
                <RequireAuth>
                  <LessonView />
                </RequireAuth>
              }
            />
            <Route
              path="/lessons"
              element={
                <RequireAuth>
                  <LessonHistory />
                </RequireAuth>
              }
            />
            <Route
              path="/notes"
              element={
                <RequireAuth>
                  <NotesOverview />
                </RequireAuth>
              }
            />
            <Route
              path="/vocabulary"
              element={
                <RequireAuth>
                  <SavedVocabularyPage />
                </RequireAuth>
              }
            />

            {/* Without this, an unmatched path rendered a blank page. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
