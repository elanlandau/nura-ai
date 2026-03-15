'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/chat-interface';
import { useSupabase } from '@/lib/supabase/provider';
import { Sparkles, Loader2 } from 'lucide-react';

/** Main chat page – route: / (authenticated only) */
export default function HomePage() {
  const { user } = useSupabase();
  const [digest, setDigest] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setDigestLoading(true);
    fetch(`/api/insights/digest?userId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDigest(data.summary ?? data.message ?? '');
      })
      .catch(() => { if (!cancelled) setDigest(''); })
      .finally(() => { if (!cancelled) setDigestLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--bg)]">
      <div className="flex-1 min-h-0 flex flex-col px-8 pb-8 max-w-3xl w-full mx-auto">
        {(digest !== null || digestLoading) && (
          <div className="shrink-0 mb-6 rounded-[var(--radius-salon)] glass-hero p-8">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-5 w-5 text-[var(--coral)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">NURA Insights</span>
            </div>
            {digestLoading ? (
              <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                סיכום מיילים...
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">{digest || 'חברו Gmail בחיבורים לסיכום.'}</p>
            )}
          </div>
        )}
        <ChatInterface userId={user.id} />
      </div>
    </div>
  );
}
