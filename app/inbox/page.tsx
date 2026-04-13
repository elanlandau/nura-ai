'use client';

import { useEffect, useState } from 'react';
import { Mail, Calendar, AlertCircle, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale/he';
import { cn } from '@/lib/utils';

export type NotificationType = 'meeting_request' | 'urgent' | 'insight';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: typeof Mail; className: string }> = {
  meeting_request: {
    label: 'בקשת פגישה',
    icon: Calendar,
    className: 'bg-[var(--teal-soft)] text-[var(--teal)]',
  },
  urgent: {
    label: 'דחוף',
    icon: AlertCircle,
    className: 'bg-[var(--coral-soft)] text-[var(--coral)]',
  },
  insight: {
    label: 'תובנה',
    icon: Mail,
    className: 'bg-[var(--teal-soft)] text-[var(--teal)]',
  },
};

export default function InboxPage() {
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, type, title, body, reference_id, read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Inbox]', error);
        setNotifications([]);
      } else {
        setNotifications((data as NotificationRow[]) ?? []);
      }
      setLoading(false);
    };

    fetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchNotifications()
      )
      .subscribe();

    const interval = setInterval(fetchNotifications, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id]);

  const markRead = async (id: string) => {
    if (!user?.id) return;
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--bg)]">
      <div className="p-8 sm:p-8 md:p-10 max-w-3xl w-full mx-auto">
        <div className="mb-8 md:mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--coral-soft)] flex items-center justify-center">
              <Mail className="h-5 w-5 text-[var(--coral)]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">מיילים</h1>
              <p className="text-xs text-[var(--coral)] font-medium mt-0.5">NURA Pulse · סריקה 24/7</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            תובנות ממיילים לא נקראים – בקשת פגישה, נושא דחוף ועוד.
          </p>
        </div>

        {loading ? (
          <div className="glass-pod rounded-[var(--radius-salon)] p-12 flex flex-col items-center justify-center gap-6">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--coral)]" />
            <p className="text-sm text-[var(--text-muted)]">טוען תובנות...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-hero rounded-[var(--radius-salon)] p-8 sm:p-10">
            <p className="text-sm text-[var(--text-muted)] text-center">
              אין עדיין תובנות. נורה פולס סורקת את תיבת הדואר והמרחב ברקע כל 15 דקות.
            </p>
            <p className="text-xs text-[var(--text-muted)] text-center mt-4">
              חברו Gmail בחיבורים כדי לראות כאן מיילים דחופים ובקשות פגישה.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {unreadCount > 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                {unreadCount} לא נקראו
              </p>
            )}
            {notifications.map((n) => {
              const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.insight;
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => !n.read && markRead(n.id)}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !n.read) { e.preventDefault(); markRead(n.id); } }}
                  className={cn(
                    'glass-pod rounded-[var(--radius-salon)] p-6 transition-[var(--transition-lux)]',
                    n.read ? 'opacity-90' : 'bg-[var(--coral-soft)]/20 cursor-pointer hover:shadow-[var(--coral-glow)]'
                  )}
                  style={{ boxShadow: 'var(--shadow-card)' }}
                  aria-label={n.read ? n.title : `${n.title}, לחץ לסמן כנקרא`}
                >
                  <div className="flex gap-3">
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', config.className)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', config.className)}>
                          {config.label}
                        </span>
                        {!n.read && (
                          <span className="shrink-0 p-1 rounded text-[var(--teal)]" aria-hidden>
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-[var(--text-primary)] mt-1 truncate">{n.title}</h3>
                      {n.body && (
                        <p className="text-sm text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: he })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
