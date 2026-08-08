import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RequireAuth from './components/RequireAuth';
import RedirectIfAuthed from './components/RedirectIfAuthed';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LessonView from './pages/LessonView';
import LessonResults from './pages/LessonResults';
import LessonHistory from './pages/LessonHistory';
import NotesOverview from './pages/NotesOverview';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthed>
                <Register />
              </RedirectIfAuthed>
            }
          />

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
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
