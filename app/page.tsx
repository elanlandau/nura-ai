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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <h1
          className="text-7xl md:text-8xl font-semibold tracking-tight text-[#fafafa] mb-4"
          style={{
            textShadow: '0 0 40px rgba(59, 130, 246, 0.25), 0 0 80px rgba(59, 130, 246, 0.15)',
          }}
        >
          NURA
        </h1>
        <p className="text-sm text-[#a0a0a0] mb-12">
          Your AI Executive Assistant
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-xl bg-transparent border border-[rgba(255,255,255,0.12)] text-[#fafafa] placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-[var(--transition-lux)]"
          />
          <input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-xl bg-transparent border border-[rgba(255,255,255,0.12)] text-[#fafafa] placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-[var(--transition-lux)]"
          />
          {error && (
            <p className="text-sm text-[#ef4444] text-center" role="alert">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-medium text-white bg-[#3b82f6] hover:bg-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-70 transition-[var(--transition-lux)]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : isSignUp ? 'Sign up' : 'Login'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setIsSignUp((v) => !v); setError(null); }}
          className="mt-8 text-sm text-[#a0a0a0] hover:text-[#3b82f6] transition-colors"
        >
          {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
