'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase/provider';
import { MobileSidebarProvider } from '@/components/mobile-sidebar-context';
import { AppSidebar } from '@/components/app-sidebar';
import { ExecutiveHeader } from '@/components/executive-header';
import { InterstellarBackground } from '@/components/interstellar-background';
import { Loader2 } from 'lucide-react';

const PROTECTED_PATHS = ['/chat', '/tasks', '/connections', '/history', '/inbox', '/settings'];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSupabase();

  useEffect(() => {
    if (loading) return;
    if (pathname === '/sign-in') {
      if (user) router.replace('/chat');
      return;
    }
    if (pathname === '/') {
      if (user) router.replace('/chat');
      return;
    }
    if (isProtected(pathname) && !user) router.replace('/');
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  if (pathname === '/sign-in' || pathname === '/') {
    return (
      <div className="min-h-screen w-full isolate" data-gate>
        {children}
      </div>
    );
  }

  if (isProtected(pathname) && !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
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
            className="shrink-0 transition-[var(--transition-lux)]"
            style={{ paddingTop: 'max(0.5rem, var(--safe-area-inset-top))', paddingLeft: 'max(0.5rem, var(--safe-area-inset-left))' }}
          >
            <ExecutiveHeader />
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-auto">{children}</div>
        </main>
      </div>
    </MobileSidebarProvider>
  );
}
