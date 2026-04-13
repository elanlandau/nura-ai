'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { useSession } from 'next-auth/react';
import { Sparkles, Loader2, Mail } from 'lucide-react';

interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const [digest, setDigest] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(true);
  const [emailSummary, setEmailSummary] = useState<EmailSummary | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const emailId = searchParams.get('emailId');

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

  useEffect(() => {
    if (!user?.id || !emailId) {
      setEmailSummary(null);
      return;
    }
    let cancelled = false;
    setEmailLoading(true);
    setEmailSummary(null);
    fetch(`/api/gmail/message?userId=${encodeURIComponent(user.id)}&messageId=${encodeURIComponent(emailId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setEmailSummary(data);
      })
      .catch(() => { if (!cancelled) setEmailSummary(null); })
      .finally(() => { if (!cancelled) setEmailLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, emailId]);

  if (!user) return null;

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full bg-transparent">
      <div className="flex-1 min-h-0 flex flex-col w-full">
        {(digest !== null || digestLoading) && (
          <div className="shrink-0 mb-8 border-0 border-b border-black pb-6">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-4 w-4 text-black" />
              <span className="gallery-heading text-lg text-black">NURA Insights</span>
            </div>
            {digestLoading ? (
              <p className="text-sm text-black/50 flex items-center gap-2 tracking-wide leading-relaxed">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading...
              </p>
            ) : (
              <p className="text-sm text-black/55 tracking-wide leading-relaxed">{digest || 'Connect Gmail in Connections for a digest.'}</p>
            )}
          </div>
        )}
        {(emailId && (emailLoading || emailSummary)) && (
          <div className="shrink-0 mb-8 border-0 border-b border-black pb-6">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-4 w-4 text-black" />
              <span className="gallery-heading text-base text-black">Important email</span>
            </div>
            {emailLoading ? (
              <p className="text-sm text-black/50 flex items-center gap-2 tracking-wide">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading email...
              </p>
            ) : emailSummary ? (
              <>
                <p className="text-sm font-medium text-black truncate tracking-wide" title={emailSummary.subject}>
                  {emailSummary.subject || '(No subject)'}
                </p>
                <p className="text-xs text-black/45 mt-1 tracking-wide">{emailSummary.from}</p>
                <p className="text-sm text-black/55 mt-2 line-clamp-2 leading-relaxed">{emailSummary.snippet}</p>
                <p className="text-xs text-black/45 mt-3 tracking-wide leading-relaxed">
                  Ask Nura to summarize or reply to this email.
                </p>
              </>
            ) : null}
          </div>
        )}
        <ChatInterface userId={user.id} initialThreadId={searchParams.get('thread')} />
      </div>
    </div>
  );
}
