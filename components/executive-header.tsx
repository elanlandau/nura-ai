'use client';

import { useSupabase } from '@/lib/supabase/provider';
import { Cloud } from 'lucide-react';
import { MobileMenuButton } from '@/components/mobile-menu-button';

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function ExecutiveHeader() {
  const { user } = useSupabase();
  const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'there';
  const greeting = getTimeBasedGreeting();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 px-4 md:px-8 min-h-[3rem] border-b border-[var(--border-subtle)] bg-[var(--header-bg)] w-full">
      <div className="flex items-center gap-3 min-w-0">
        <MobileMenuButton />
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {greeting}, {name}
        </p>
      </div>
      <div className="flex items-center gap-2 text-[var(--text-muted)] shrink-0">
        <Cloud className="h-4 w-4 shrink-0" />
        <span className="text-sm">Tel Aviv, 22°C</span>
      </div>
    </header>
  );
}
