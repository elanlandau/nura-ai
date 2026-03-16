'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { OAuthAccount } from '@/lib/types';
import { Loader2, Mail, MessageCircle, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'available' | 'coming_soon';
  email?: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  connectLoading?: boolean;
}

function IntegrationCard({
  name,
  description,
  icon,
  status,
  email,
  onConnect,
  onDisconnect,
  connectLoading,
}: IntegrationCardProps) {
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  const handleDisconnect = async () => {
    if (!onDisconnect) return;
    setDisconnectLoading(true);
    try {
      await onDisconnect();
    } finally {
      setDisconnectLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition-[var(--transition-lux)] hover:border-[var(--accent)]/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 shrink-0 rounded-xl bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)]">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{name}</h3>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{description}</p>
            {status === 'connected' && email && (
              <p className="text-xs text-[var(--accent)] mt-2 truncate">{email}</p>
            )}
          </div>
        </div>
        {status === 'coming_soon' && (
          <span className="shrink-0 rounded-full bg-[var(--text-muted)]/20 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
            Coming Soon
          </span>
        )}
      </div>
      <div className="mt-6">
        {status === 'coming_soon' ? (
          <Button disabled className="w-full rounded-xl bg-[var(--bg)] text-[var(--text-muted)] cursor-not-allowed">
            Connect
          </Button>
        ) : status === 'connected' ? (
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={disconnectLoading}
            className="w-full rounded-xl border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--error)]/10 hover:text-[var(--error)] hover:border-[var(--error)]/30"
          >
            {disconnectLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Disconnect'}
          </Button>
        ) : (
          <Button
            onClick={onConnect}
            disabled={connectLoading}
            className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
          >
            {connectLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleAccount, setGoogleAccount] = useState<OAuthAccount | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<'success' | 'error' | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success === 'google') {
      setConnectionMessage('success');
      router.replace('/connections', { scroll: false });
    } else if (error) {
      setConnectionMessage('error');
      router.replace('/connections', { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    let cancelled = false;
    const work = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        const uid = session?.user?.id ?? 'guest-user-bypass';
        const res = await fetch(`/api/connections?userId=${encodeURIComponent(uid)}`);
        const accounts: OAuthAccount[] = res.ok ? await res.json() : [];
        if (!cancelled) setGoogleAccount(accounts.find((a) => a.provider === 'google') ?? null);
      } catch {
        if (!cancelled) setGoogleAccount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    work();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (connectionMessage === null) return;
    const t = setTimeout(() => setConnectionMessage(null), 5000);
    return () => clearTimeout(t);
  }, [connectionMessage]);

  const effectiveUserId = user?.id ?? 'guest-user-bypass';

  const handleGoogleConnect = () => {
    setConnectLoading(true);
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--bg)]">
      <div className="p-8 md:p-10 max-w-5xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
            Connections
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Your integration control center. Connect services to unlock NURA&apos;s full power.
          </p>
          {connectionMessage === 'success' && (
            <p className="mt-4 py-2 px-4 rounded-xl bg-[var(--mint)]/15 text-[var(--mint)] text-sm font-medium" role="alert">
              Connection saved successfully.
            </p>
          )}
          {connectionMessage === 'error' && (
            <p className="mt-4 py-2 px-4 rounded-xl bg-[var(--error)]/15 text-[var(--error)] text-sm font-medium" role="alert">
              Connection failed. Try again or disconnect and reconnect.
            </p>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <IntegrationCard
            name="Google Calendar"
            description="Schedule, events, and availability"
            icon={<GoogleIcon className="h-6 w-6" />}
            status={googleAccount ? 'connected' : 'available'}
            email={googleAccount?.email}
            onConnect={handleGoogleConnect}
            onDisconnect={handleGoogleDisconnect}
            connectLoading={connectLoading}
          />
          <IntegrationCard
            name="Email Inbox"
            description="Gmail — read and send mail"
            icon={<Mail className="h-6 w-6" />}
            status={googleAccount ? 'connected' : 'available'}
            email={googleAccount?.email}
            onConnect={handleGoogleConnect}
            onDisconnect={handleGoogleDisconnect}
            connectLoading={connectLoading}
          />
          <IntegrationCard
            name="WhatsApp"
            description="Messages and notifications"
            icon={<MessageCircle className="h-6 w-6" />}
            status="coming_soon"
          />
          <IntegrationCard
            name="Apple iCloud"
            description="Calendar and Mail"
            icon={<Cloud className="h-6 w-6" />}
            status="coming_soon"
          />
        </div>
      </div>
    </div>
  );
}
