import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewLesson from './pages/NewLesson';
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
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lessons/new" element={<NewLesson />} />
          <Route path="/lessons/:id/results" element={<LessonResults />} />
          <Route path="/lessons/:id" element={<LessonView />} />
          <Route path="/lessons" element={<LessonHistory />} />
          <Route path="/notes" element={<NotesOverview />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
