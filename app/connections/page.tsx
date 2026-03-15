'use client';

import { useEffect, useState } from 'react';
import { ConnectionCard } from '@/components/connection-card';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { OAuthAccount } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function ConnectionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleAccount, setGoogleAccount] = useState<OAuthAccount | null>(null);
  const [microsoftAccount, setMicrosoftAccount] = useState<OAuthAccount | null>(null);

  useEffect(() => {
    const timeoutMs = 3000;
    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));

    const work = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const effectiveUserId = session?.user?.id ?? 'guest-user-bypass';
        setUser(session?.user ?? null);
        const res = await fetch(`/api/connections?userId=${encodeURIComponent(effectiveUserId)}`);
        const accounts: OAuthAccount[] = res.ok ? await res.json() : [];
        const google = accounts.find((a) => a.provider === 'google') ?? null;
        const microsoft = accounts.find((a) => a.provider === 'microsoft') ?? null;
        setGoogleAccount(google);
        setMicrosoftAccount(microsoft);
      } catch {
        setGoogleAccount(null);
        setMicrosoftAccount(null);
      } finally {
        setLoading(false);
      }
    };

    Promise.race([work(), timeoutPromise]).finally(() => setLoading(false));
  }, []);

  const effectiveUserId = user?.id ?? 'guest-user-bypass';

  const handleGoogleConnect = async () => {
    window.location.href = `/api/auth/google?state=${encodeURIComponent(effectiveUserId)}`;
  };

  const handleGoogleDisconnect = async () => {
    if (!googleAccount) return;
    const res = await fetch(
      `/api/connections?userId=${encodeURIComponent(effectiveUserId)}&id=${encodeURIComponent(googleAccount.id)}`,
      { method: 'DELETE' }
    );
    if (res.ok) setGoogleAccount(null);
  };

  const handleMicrosoftConnect = async () => {
    alert('Microsoft OAuth is not wired to SQLite in this demo. Use Google for calendar/Gmail.');
  };

  const handleMicrosoftDisconnect = async () => {
    if (!microsoftAccount) return;
    const res = await fetch(
      `/api/connections?userId=${encodeURIComponent(effectiveUserId)}&id=${encodeURIComponent(microsoftAccount.id)}`,
      { method: 'DELETE' }
    );
    if (res.ok) setMicrosoftAccount(null);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--bg)]">
      <div className="p-8 md:p-10 max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-3">Connections</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Connect your calendar and email accounts to enable NURA&apos;s scheduling features.
            {!user && ' (Guest mode: connect Google to scan inbox and calendar.)'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ConnectionCard
            provider="google"
            title="Google"
            description="Connect Google Calendar and Gmail"
            icon={
              <svg viewBox="0 0 24 24" className="h-full w-full">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            }
            account={googleAccount}
            onConnect={handleGoogleConnect}
            onDisconnect={handleGoogleDisconnect}
          />

          <ConnectionCard
            provider="microsoft"
            title="Microsoft"
            description="Connect Outlook Calendar and Email"
            icon={
              <svg viewBox="0 0 24 24" className="h-full w-full" fill="#00A4EF">
                <path d="M2 2h20v20H2z" />
                <path
                  d="M12 2v10H2V2h10zm10 0v10H12V2h10zM12 12v10H2V12h10zm10 0v10H12V12h10z"
                  fill="#fff"
                  opacity="0.2"
                />
              </svg>
            }
            account={microsoftAccount}
            onConnect={handleMicrosoftConnect}
            onDisconnect={handleMicrosoftDisconnect}
          />
        </div>
      </div>
    </div>
  );
}
