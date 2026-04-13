'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MobileMenuButton } from '@/components/mobile-menu-button';
import {
  isSupported,
  permissionState,
  requestPermission,
  registerServiceWorker,
  showLocalNotification,
  getVapidPublicKey,
  subscribeAndSave,
} from '@/lib/notifications';

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function ExecutiveHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const name = user?.name ?? user?.email?.split('@')[0] ?? 'there';
  const greeting = getTimeBasedGreeting();
  const permissionAsked = useRef(false);
  const [weatherLine, setWeatherLine] = useState<string | null>(null);

  const isHome = pathname === '/home';

  useEffect(() => {
    if (isHome) {
      setWeatherLine(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/weather');
        const data = (await r.json()) as { line?: string };
        if (!cancelled && data.line) setWeatherLine(data.line);
      } catch {
        if (!cancelled) setWeatherLine(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHome]);

  useEffect(() => {
    const uid = user?.id as string | undefined;
    if (!uid || !isSupported() || permissionAsked.current) return;
    permissionAsked.current = true;
    async function setup() {
      if (permissionState() === 'default') {
        await requestPermission();
      }
      await registerServiceWorker();
      if (permissionState() === 'granted' && getVapidPublicKey()) {
        subscribeAndSave(uid as string).catch(() => {});
      }
    }
    setup();
  }, [user]);

  const handleTestAlert = async () => {
    if (!isSupported()) {
      if (typeof window !== 'undefined') window.alert('Notifications are not supported in this browser.');
      return;
    }
    const perm = await requestPermission();
    if (perm !== 'granted') return;
    await registerServiceWorker();
    showLocalNotification('NURA', {
      body: `Hello ${name}, Nura is now active!`,
      tag: 'nura-test',
    });
  };

  return (
    <header className="flex min-h-[4.5rem] shrink-0 items-center justify-between gap-8 px-8 md:px-16 py-6 border-0 border-b border-black bg-[#FCFAF7] w-full">
      <div className="flex items-center gap-8 min-w-0">
        <MobileMenuButton />
        {!isHome && (
          <p className="text-[11px] leading-relaxed text-black/80 tracking-wide">
            {greeting}, {name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-10 text-black/45 shrink-0">
        <button
          type="button"
          onClick={handleTestAlert}
          title="Send a test desktop notification"
          className="text-[9px] uppercase tracking-[0.28em] hover:text-black transition-colors"
        >
          Test alert
        </button>
        {!isHome && weatherLine && (
          <span
            className="text-[11px] leading-relaxed max-w-[min(100vw-14rem,22rem)] text-black/55 hidden sm:block"
            title={weatherLine}
          >
            {weatherLine}
          </span>
        )}
      </div>
    </header>
  );
}
