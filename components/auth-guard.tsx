'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase/provider';
import { MobileSidebarProvider } from '@/components/mobile-sidebar-context';
import { AppSidebar } from '@/components/app-sidebar';
import { MobileMenuButton } from '@/components/mobile-menu-button';
import { InterstellarBackground } from '@/components/interstellar-background';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSupabase();

  useEffect(() => {
    if (loading) return;
    if (pathname === '/sign-in') {
      if (user) router.replace('/');
      return;
    }
    if (!user) router.replace('/sign-in');
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="glass-hero rounded-[var(--radius-salon)] p-8 flex flex-col items-center gap-6">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--coral)]" />
          <p className="text-sm text-[var(--text-muted)]">טוען...</p>
        </div>
      </div>
    );
  }

  if (pathname === '/sign-in') {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="glass-hero rounded-[var(--radius-salon)] p-8 flex flex-col items-center gap-6">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--coral)]" />
          <p className="text-sm text-[var(--text-muted)]">מפנה להתחברות...</p>
        </div>
      </div>
    );
  }

  return (
    <MobileSidebarProvider>
      <InterstellarBackground />
      <div className="relative z-10 flex h-screen w-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-auto">
          <div
            className="flex h-14 shrink-0 items-center gap-3 bg-[var(--sidebar-bg)] backdrop-blur-xl px-6 md:px-8 pl-[max(1.5rem,var(--safe-area-inset-left))] min-h-[3.5rem] transition-[var(--transition-lux)]"
            style={{ paddingTop: 'max(0.75rem, var(--safe-area-inset-top))', boxShadow: 'var(--shadow-soft)' }}
          >
            <MobileMenuButton />
            <span className="text-sm font-medium text-[var(--text-muted)] md:hidden">NURA</span>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">{children}</div>
        </main>
      </div>
    </MobileSidebarProvider>
  );
}
