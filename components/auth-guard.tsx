'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MobileSidebarProvider } from '@/components/mobile-sidebar-context';
import { AppSidebar } from '@/components/app-sidebar';
import { ExecutiveHeader } from '@/components/executive-header';
import { GalleryExhibit } from '@/components/gallery-exhibit';
import { Loader2 } from 'lucide-react';

const PROTECTED_PATHS = ['/home', '/chat', '/tasks', '/connections', '/history', '/inbox', '/settings'];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

const PUBLIC_PATHS = ['/', '/sign-in'];
const isPublicPath = (pathname: string) => PUBLIC_PATHS.includes(pathname);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const user = session?.user ?? null;

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const fetchOnboardingStatus = useCallback(async () => {
    if (!user?.id) {
      setNeedsOnboarding(false);
      setOnboardingChecked(true);
      return;
    }
    try {
      const r = await fetch(`/api/user/onboarding-status?userId=${encodeURIComponent(user.id)}`);
      const d = (await r.json()) as { onboarding_completed?: boolean; needsOnboarding?: boolean };
      if (typeof d.onboarding_completed === 'boolean') {
        setNeedsOnboarding(!d.onboarding_completed);
      } else {
        setNeedsOnboarding(Boolean(d.needsOnboarding));
      }
    } catch {
      setNeedsOnboarding(true);
    } finally {
      setOnboardingChecked(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setNeedsOnboarding(false);
      setOnboardingChecked(true);
      return;
    }
    setOnboardingChecked(false);
    void fetchOnboardingStatus();
  }, [user, loading, fetchOnboardingStatus]);

  useEffect(() => {
    const onProfileUpdated = () => void fetchOnboardingStatus();
    window.addEventListener('nura-profile-updated', onProfileUpdated);
    return () => window.removeEventListener('nura-profile-updated', onProfileUpdated);
  }, [fetchOnboardingStatus]);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    if (!user) {
      if (pathname === '/onboarding') router.replace('/');
      return;
    }

    if (isPublicPath(pathname)) {
      router.replace(needsOnboarding ? '/onboarding' : '/home');
      return;
    }

    if (pathname === '/onboarding' && !needsOnboarding) {
      router.replace('/home');
      return;
    }

    if (needsOnboarding && pathname !== '/onboarding' && !isPublicPath(pathname)) {
      router.replace('/onboarding');
    }
  }, [loading, onboardingChecked, user, needsOnboarding, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FCFAF7]">
        <Loader2 className="h-6 w-6 animate-spin text-black" />
      </div>
    );
  }

  if (user && !onboardingChecked && !isPublicPath(pathname) && pathname !== '/onboarding') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FCFAF7]">
        <Loader2 className="h-6 w-6 animate-spin text-black" />
      </div>
    );
  }

  if (isPublicPath(pathname)) {
    return (
      <div className="min-h-screen w-full isolate bg-[#FCFAF7] flex flex-col items-center justify-center px-6 md:px-12 py-24 md:py-40" data-gate>
        <div className="w-full max-w-[800px] my-auto">{children}</div>
      </div>
    );
  }

  if (pathname === '/onboarding') {
    if (!user) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FCFAF7]">
          <Loader2 className="h-6 w-6 animate-spin text-black" />
        </div>
      );
    }
    return (
      <div className="min-h-screen w-full isolate bg-[#FCFAF7] flex flex-col items-center justify-center px-6 md:px-12 py-24 md:py-40" data-onboarding>
        <div className="w-full max-w-[800px] my-auto">{children}</div>
      </div>
    );
  }

  if (isProtected(pathname) && !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FCFAF7]">
        <Loader2 className="h-6 w-6 animate-spin text-black" />
      </div>
    );
  }

  if (user && needsOnboarding && pathname !== '/onboarding') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FCFAF7]">
        <Loader2 className="h-6 w-6 animate-spin text-black" />
      </div>
    );
  }

  return (
    <MobileSidebarProvider>
      <div className="relative flex h-screen w-screen overflow-hidden bg-[#FFFFFF]">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[#FCFAF7]">
          <div
            className="shrink-0 transition-[var(--transition-lux)]"
            style={{ paddingTop: 'max(1rem, var(--safe-area-inset-top))', paddingLeft: 'max(0.5rem, var(--safe-area-inset-left))' }}
          >
            <ExecutiveHeader />
          </div>
          <GalleryExhibit>{children}</GalleryExhibit>
        </main>
      </div>
    </MobileSidebarProvider>
  );
}
