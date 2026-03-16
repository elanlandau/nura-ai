'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        setError(null);
        setLoading(false);
        setPassword('');
        if (data.session) {
          router.replace('/chat');
          router.refresh();
        }
        return;
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
      router.replace('/chat');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : isSignUp ? 'Sign up failed' : 'Login failed';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-10 flex items-center justify-center">
          <span className="text-5xl font-semibold tracking-tight text-[var(--text-primary)]">NURA</span>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-10 text-center">
          Your AI Executive Assistant
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-[var(--transition-lux)]"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-[var(--transition-lux)]"
            />
          </div>
          {error && (
            <p className="text-sm text-[var(--error)] text-center" role="alert">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] disabled:opacity-70 transition-[var(--transition-lux)]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : isSignUp ? 'Sign up' : 'Login'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setIsSignUp((v) => !v); setError(null); }}
          className="mt-6 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
