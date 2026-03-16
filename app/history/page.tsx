'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/supabase/provider';
import { History, MessageSquare, Loader2 } from 'lucide-react';

interface ThreadItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
}

export default function HistoryPage() {
  const { user } = useSupabase();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    fetch(`/api/chat/threads?userId=${encodeURIComponent(user.id)}`)
      .then((r) => r.ok ? r.json() : { threads: [] })
      .then((data) => {
        setThreads(Array.isArray(data.threads) ? data.threads : []);
      })
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--bg)]">
      <div className="p-8 md:p-10 max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">
            History
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Your chat sessions. Click one to open it.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : threads.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">No chats yet. Start a conversation in Chat.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/chat?thread=${encodeURIComponent(t.id)}`}
                  className="block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 hover:border-[var(--accent)]/30 hover:bg-[var(--bg-card)]/80 transition-[var(--transition-lux)]"
                >
                  <p className="text-sm text-[var(--text-primary)] line-clamp-2">{t.preview}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    {new Date(t.updatedAt).toLocaleDateString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
