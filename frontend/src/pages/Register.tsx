import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/register', { email, password });
      localStorage.setItem('token', data.data?.token ?? data.token);
      navigate('/dashboard');
    } catch {
      setError('Registration failed. Email may already be in use.');
    }
  };

  return (
    <div className="relative min-h-screen bg-cream font-body overflow-hidden flex items-center justify-center">
      {/* Grain texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Leaf icon */}
        <div className="mb-5 flex justify-center text-sage">
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

        <h1 className="font-display text-4xl font-semibold text-bark text-center mb-2 tracking-tight">
          Create Account
        </h1>
        <p className="text-bark-light text-center mb-10">
          Sign up to start your language learning journey.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-bark-light/40 group-focus-within:text-sage transition-colors duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-11 pr-4 py-4 bg-white rounded-2xl border border-sand text-bark placeholder:text-bark-light/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 shadow-sm hover:shadow-md transition-all duration-200"
            />
          </div>

          {/* Password */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-bark-light/40 group-focus-within:text-sage transition-colors duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full pl-11 pr-4 py-4 bg-white rounded-2xl border border-sand text-bark placeholder:text-bark-light/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 shadow-sm hover:shadow-md transition-all duration-200"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-4 bg-sage hover:bg-sage-dark active:bg-olive text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 text-lg cursor-pointer"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-bark-light">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-sage-dark hover:text-olive transition-colors duration-200"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
