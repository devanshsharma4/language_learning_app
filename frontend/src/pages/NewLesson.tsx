import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function NewLesson() {
  const navigate = useNavigate();
  const [articleText, setArticleText] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [language, setLanguage] = useState('spanish');
  const [difficulty, setDifficulty] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/lessons/create', {
        article_text: articleText || undefined,
        article_url: articleUrl || undefined,
        language,
        difficulty,
      });
      navigate(`/lessons/${data.id}`);
    } catch {
      setError('Failed to create lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Create New Lesson</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium">Article URL</label>
          <input
            type="url"
            placeholder="https://example.com/article"
            value={articleUrl}
            onChange={(e) => setArticleUrl(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Or paste article text
          </label>
          <textarea
            placeholder="Paste article text here..."
            value={articleText}
            onChange={(e) => setArticleText(e.target.value)}
            rows={8}
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded border px-3 py-2"
            >
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="japanese">Japanese</option>
              <option value="korean">Korean</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded border px-3 py-2"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || (!articleText && !articleUrl)}
          className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating Lesson...' : 'Create Lesson'}
        </button>
      </form>
    </div>
  );
}
