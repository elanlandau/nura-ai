'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useMobileSidebar } from '@/components/mobile-sidebar-context';

/** E.g. "Home" → "H O M E", "New chat" → "N E W   C H A T" */
function spacedCapitals(label: string) {
  return label
    .split(/\s+/)
    .map((word) => word.toUpperCase().split('').join(' '))
    .join('   ');
}

const NAV_ITEMS = [
  { href: '/home', label: 'Home' },
  { href: '/chat', label: 'Chat' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/settings', label: 'Settings' },
  { href: '/connections', label: 'Connect' },
  { href: '/history', label: 'History' },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const { open, setOpen } = useMobileSidebar();
  const [collapsed, setCollapsed] = useState(false);

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? '';

  const handleSignOut = async () => {
    setOpen(false);
    await signOut({ callbackUrl: '/' });
  };

  const closeMobile = () => setOpen(false);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden
        onClick={closeMobile}
      />

      <aside
        className={cn(
          'flex flex-col shrink-0 bg-[#FFFFFF] border-r border-[#E5E5E5]',
          'fixed md:relative inset-y-0 left-0 z-50 md:z-auto',
          'transition-[width] duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'
        )}
      >
        <div
          className={cn(
            'flex min-h-[4rem] items-center border-b border-[#E5E5E5]',
            collapsed ? 'justify-center px-2' : 'justify-between px-5'
          )}
        >
          {!collapsed && (
            <Link
              href="/home"
              className="text-[9px] font-medium text-black min-w-0 leading-tight tracking-[0.55em]"
              style={{ fontFamily: 'var(--font-gallery-serif)', fontStyle: 'italic' }}
              onClick={closeMobile}
              title="NURA"
            >
              {spacedCapitals('NURA')}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden md:block text-[9px] uppercase tracking-[0.25em] text-black/40 hover:text-black px-2 py-1 border-0 border-b border-transparent hover:border-black bg-transparent"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <div className={cn('px-4 pt-10 pb-8', collapsed && 'px-2')}>
          <Link
            href="/chat"
            onClick={closeMobile}
            className={cn(
              'block text-[8px] leading-snug text-black/55 hover:text-black border-0 border-b border-transparent hover:border-black pb-1 transition-colors tracking-[0.35em]',
              collapsed && 'text-center tracking-normal'
            )}
            title="New chat"
          >
            {collapsed ? '＋' : spacedCapitals('New chat')}
          </Link>
        </div>

        <nav className="flex-1 px-4 pb-10 space-y-10">
          {NAV_ITEMS.map(({ href, label }) => {
            const active =
              href === '/home'
                ? pathname === '/home'
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className={cn(
                  'block text-[8px] leading-relaxed transition-colors tracking-[0.25em]',
                  collapsed ? 'text-center' : '',
                  active ? 'text-black font-medium' : 'text-black/35 hover:text-black/70'
                )}
                title={label}
              >
                {collapsed ? label.slice(0, 1) : spacedCapitals(label)}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className={cn('shrink-0 border-t border-[#E5E5E5] px-4 py-10 space-y-8', collapsed && 'px-2')}>
            {!collapsed ? (
              <div className="space-y-3">
                {displayName && (
                  <p className="text-[8px] uppercase tracking-[0.2em] text-black/40 leading-relaxed max-w-full break-words">
                    {displayName}
                  </p>
                )}
                {user.email && (
                  <p className="text-[8px] text-black/35 leading-relaxed break-all">{user.email}</p>
                )}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                'text-[8px] uppercase tracking-[0.3em] text-black/35 hover:text-black w-full text-left border-0 border-b border-transparent hover:border-black bg-transparent pb-1',
                collapsed && 'text-center'
              )}
            >
              {collapsed ? '×' : spacedCapitals('Sign out')}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
