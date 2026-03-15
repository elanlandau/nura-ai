'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  CheckSquare,
  Mail,
  Settings,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useSupabase } from '@/lib/supabase/provider';
import { cn } from '@/lib/utils';
import { useMobileSidebar } from '@/components/mobile-sidebar-context';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
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
  );
}

const NAV_ITEMS = [
  { href: '/', label: "צ'אט", icon: MessageSquare },
  { href: '/tasks', label: 'משימות', icon: CheckSquare },
  { href: '/inbox', label: 'מיילים', icon: Mail },
  { href: '/settings', label: 'הגדרות', icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSupabase();
  const { open, setOpen } = useMobileSidebar();
  const [collapsed, setCollapsed] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(true);

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'משתמש';
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.replace('/sign-in');
  };

  useEffect(() => {
    const timeoutMs = 3000;
    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
    const work = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const effectiveUserId = session?.user?.id ?? 'guest-user-bypass';
        const res = await fetch(`/api/connections?userId=${encodeURIComponent(effectiveUserId)}`);
        const accounts = res.ok ? await res.json() : [];
        setGoogleConnected(accounts.some((a: { provider: string }) => a.provider === 'google'));
      } catch {
        setGoogleConnected(false);
      } finally {
        setConnectionsLoading(false);
      }
    };
    Promise.race([work(), timeoutPromise]).finally(() => setConnectionsLoading(false));
  }, []);

  const closeMobile = () => setOpen(false);

  return (
    <>
      {/* Mobile overlay when sidebar is open */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden
        onClick={closeMobile}
      />

      <aside
        className={cn(
          'flex flex-col shrink-0 transition-all duration-300 ease-out',
          'bg-[var(--sidebar-bg)] backdrop-blur-xl',
          'fixed md:relative inset-y-0 left-0 z-50 md:z-auto',
          'w-[var(--sidebar-width)] md:w-[var(--sidebar-width)]',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed && 'md:w-[var(--sidebar-collapsed)]'
        )}
        style={{ boxShadow: 'var(--shadow-soft)' }}
      >
        <div
          className={cn(
            'flex h-14 items-center',
            collapsed ? 'justify-center px-0' : 'justify-between px-4'
          )}
        >
          {!collapsed && (
            <Link href="/" className="flex items-center gap-3 min-w-0" onClick={closeMobile}>
              <div className="relative h-8 w-8 rounded-[12px] bg-[var(--coral)] flex items-center justify-center" style={{ boxShadow: 'var(--coral-glow)' }}>
                <Bot className="h-4 w-4 text-white" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--mint)] border-2 border-[var(--sidebar-bg)] pulse-dot" aria-label="Pulse Active" />
              </div>
              <span className="font-semibold text-[var(--text-primary)] truncate">NURA</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden md:flex p-2 rounded-[var(--radius-salon)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 transition-[var(--transition-lux)]"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === '/' && pathname === '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className={cn(
                  'flex items-center gap-4 rounded-[var(--radius-salon)] px-4 py-3 text-sm font-medium transition-[var(--transition-lux)]',
                  active
                    ? 'bg-[var(--coral)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
          {!collapsed && (
            <Link
              href="/connections"
              onClick={closeMobile}
              className={cn(
                'flex items-center gap-4 rounded-[var(--radius-salon)] px-4 py-3 text-sm font-medium transition-[var(--transition-lux)] mt-4 pt-4',
                pathname === '/connections'
                  ? 'bg-[var(--teal)]/20 text-[var(--teal)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--teal)] hover:bg-[var(--teal-soft)]'
              )}
            >
              <span className="relative h-5 w-5 shrink-0 flex items-center justify-center">
                <GoogleIcon className="h-5 w-5" />
                {!connectionsLoading && googleConnected && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full status-dot-mint" aria-label="Connected" />
                )}
              </span>
              <span className="truncate">חיבורים</span>
            </Link>
          )}
        </nav>

        {user && (
          <div className={cn('shrink-0 p-4', collapsed && 'flex flex-col items-center')}>
            {!collapsed ? (
              <div className="flex items-center gap-4 rounded-[var(--radius-salon)] px-4 py-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-[var(--teal-soft)] flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-[var(--teal)]">
                      {(displayName || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{displayName}</p>
                  {user.email && (
                    <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                  )}
                </div>
              </div>
            ) : (
              avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover mx-auto" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-[var(--teal-soft)] flex items-center justify-center mx-auto">
                  <span className="text-sm font-medium text-[var(--teal)]">{(displayName || '?').charAt(0).toUpperCase()}</span>
                </div>
              )
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                'flex items-center gap-4 rounded-[var(--radius-salon)] px-4 py-3 text-sm font-medium w-full mt-2',
                'text-[var(--text-muted)] hover:text-[var(--coral)] hover:bg-[var(--coral-soft)] transition-[var(--transition-lux)]',
                collapsed && 'justify-center w-auto px-2'
              )}
              aria-label="התנתק"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>התנתק</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
