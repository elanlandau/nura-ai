'use client';

import { useEffect, useRef } from 'react';
import { useSupabase } from '@/lib/supabase/provider';
import { Cloud, Bell } from 'lucide-react';
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
import { Button } from '@/components/ui/button';

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
  const permissionAsked = useRef(false);

  // Ask for notification permission when user first lands on dashboard (protected layout).
  useEffect(() => {
    if (!user || !isSupported() || permissionAsked.current) return;
    permissionAsked.current = true;
    async function setup() {
      if (permissionState() === 'default') {
        await requestPermission();
      }
      await registerServiceWorker();
      // So Nura can send when tab is closed: subscribe and save if VAPID is configured.
      if (permissionState() === 'granted' && getVapidPublicKey() && user.id) {
        subscribeAndSave(user.id).catch(() => {});
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
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 px-4 md:px-8 min-h-[3rem] border-b border-[var(--border-subtle)] bg-[var(--header-bg)] w-full">
      <div className="flex items-center gap-3 min-w-0">
        <MobileMenuButton />
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {greeting}, {name}
        </p>
      </div>
      <div className="flex items-center gap-2 text-[var(--text-muted)] shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 h-8 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={handleTestAlert}
          title="Send a test desktop notification"
        >
          <Bell className="h-3.5 w-3.5" />
          Test Alert
        </Button>
        <Cloud className="h-4 w-4 shrink-0" />
        <span className="text-sm">Tel Aviv, 22°C</span>
      </div>
    </header>
  );
}
