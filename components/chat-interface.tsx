'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Loader2, Wrench, Trash2 } from 'lucide-react';
import { useChat } from 'ai/react';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  userId: string;
  /** When switching from History sidebar, pass the thread to load. */
  initialThreadId?: string | null;
}

/** Safely get displayable string from message content (SDK may send string or other). */
function getMessageContent(message: { content?: unknown }): string {
  const c = message.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((p) => (typeof p === 'string' ? p : (p as { text?: string })?.text ?? '')).join('');
  return '';
}

const TOOL_LABELS: Record<string, string> = {
  list_messages: 'Gmail (סורק תיבת דואר)',
  get_calendar_availability: 'Google Calendar (בודק זמינות)',
  propose_meeting_slots: 'Gmail (שולח הצעת פגישה)',
  confirm_meeting: 'Google Calendar (יוצר אירוע)',
};

const NURA_INTRO =
  'Hello, I am Nura. I am your Executive AI. I manage your schedule, track your tasks, and ensure your digital life is synchronized. How can I assist you tonight?';

/**
 * We do NOT depend on /api/chat/threads. We call /api/chat directly with threadId or ''.
 * Server creates a thread when threadId is missing and returns X-Thread-Id.
 */
export function ChatInterface({ userId, initialThreadId }: ChatInterfaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const threadIdForSaveRef = useRef<string | null>(null);
  const skipHistoryFetchRef = useRef(false);
  // threadId is only for: loading history when opening /chat?thread=xxx, and for saving assistant replies. Never blocks send.
  const [threadId, setThreadId] = useState<string | null>(() => searchParams.get('thread') ?? initialThreadId ?? null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Always send to /api/chat. Pass threadId when we have one (from URL or X-Thread-Id); otherwise '' so server creates thread.
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    body: { userId, threadId: threadId || '' },
    initialMessages: [],
    onResponse: (res) => {
      const newThreadId = res.headers.get('X-Thread-Id');
      if (newThreadId) {
        threadIdForSaveRef.current = newThreadId;
        skipHistoryFetchRef.current = true;
        setThreadId(newThreadId);
        router.replace(`/chat?thread=${encodeURIComponent(newThreadId)}`, { scroll: false });
      }
    },
    onError: (err: unknown) => {
      console.error('[NURA chat]', err);
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Request failed. Check the console (F12) for details.';
      setSubmitError(message);
    },
    onFinish: (message) => {
      setSubmitError(null);
      const tid = threadIdForSaveRef.current || threadId;
      if (message.role === 'assistant' && tid) {
        const content = getMessageContent(message);
        if (content.trim()) {
          fetch('/api/chat/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, threadId: tid, role: 'assistant', content }),
          }).catch((e: unknown) => console.error('[NURA chat] save', e));
        }
      }
    },
  });

  // Sync threadId from URL when user navigates (e.g. History sidebar).
  useEffect(() => {
    const fromUrl = searchParams.get('thread');
    if (fromUrl && fromUrl !== threadId) setThreadId(fromUrl);
  }, [searchParams]);

  // Load history only when we have threadId (e.g. from URL /chat?thread=xxx). Never call /api/chat/threads. Skip fetch when thread was just created by server (X-Thread-Id).
  useEffect(() => {
    if (!userId) return;
    if (!threadId) {
      setMessages([{ id: 'nura-intro', role: 'assistant', content: NURA_INTRO }]);
      setHistoryLoaded(true);
      return;
    }
    if (skipHistoryFetchRef.current) {
      skipHistoryFetchRef.current = false;
      setHistoryLoaded(true);
      return;
    }
    let cancelled = false;
    setHistoryLoaded(false);
    fetch(`/api/chat/history?userId=${encodeURIComponent(userId)}&threadId=${encodeURIComponent(threadId)}`)
      .then((r) => r.ok ? r.json() : { messages: [] })
      .then((data) => {
        if (cancelled) {
          setHistoryLoaded(true);
          return;
        }
        if (!Array.isArray(data.messages) || data.messages.length === 0) {
          setMessages([{ id: 'nura-intro', role: 'assistant', content: NURA_INTRO }]);
        } else {
          setMessages(data.messages.map((m: { id: string; role: string; content: string }) => ({ id: m.id, role: m.role, content: m.content })));
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
    return () => { cancelled = true; };
  }, [userId, threadId, setMessages]);

  // New Chat: clear UI and URL. Do NOT call /api/chat/threads. Next send will hit /api/chat with threadId '' and server creates thread.
  const handleNewChat = () => {
    setThreadId(null);
    threadIdForSaveRef.current = null;
    skipHistoryFetchRef.current = false;
    setMessages([{ id: 'nura-intro', role: 'assistant', content: NURA_INTRO }]);
    setSubmitError(null);
    setHistoryLoaded(true);
    router.replace('/chat', { scroll: false });
  };

  const currentTool = (() => {
    if (!isLoading || messages.length === 0) return null;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant' || !last.toolInvocations?.length) return null;
    const inProgress = last.toolInvocations.find((t: { state: string }) => t.state !== 'result');
    return inProgress?.toolName ?? null;
  })();

  const latestToolError = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== 'assistant' || !m.toolInvocations?.length) continue;
      for (const t of m.toolInvocations as { state?: string; result?: unknown }[]) {
        if (t.state === 'result' && t.result != null && typeof t.result === 'object' && 'error' in t.result && typeof (t.result as { error: unknown }).error === 'string') {
          return (t.result as { error: string }).error;
        }
      }
    }
    return null;
  })();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[var(--bg)]">
      <header className="shrink-0 flex items-center justify-between gap-4 px-6 py-6 bg-[var(--sidebar-bg)] backdrop-blur-xl overflow-visible min-h-[72px]" style={{ boxShadow: 'var(--shadow-soft)' }}>
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-[var(--coral)] flex items-center justify-center flex-shrink-0" style={{ boxShadow: 'var(--coral-glow)' }}>
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-[var(--text-primary)] text-lg tracking-tight">NURA</h1>
            <p className="text-xs text-[var(--text-muted)]">Your intelligent scheduling assistant</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleNewChat}
          className="shrink-0 relative z-10 flex items-center gap-2 h-9 px-3 rounded-lg border-[var(--text-muted)]/30 text-[var(--text-primary)] hover:bg-[var(--bg)]/80 hover:border-[var(--text-muted)]/50 transition-[var(--transition-lux)]"
          aria-label="New chat (clear session)"
          title="New chat"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-sm font-medium">New Chat</span>
        </Button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-8 px-6"
      >
        <div className="space-y-6 max-w-2xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-16 animate-message-in" dir="rtl">
              <Bot className="h-14 w-14 mx-auto mb-5 text-[var(--teal)]" />
              <p className="text-lg font-medium text-[var(--text-primary)] mb-2">Welcome to NURA</p>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                I can help you check your calendar, schedule meetings, and manage your time.
              </p>
              <div className="text-sm space-y-2">
                <p className="font-medium text-[var(--text-muted)]">Try asking:</p>
                <ul className="space-y-1.5 text-[var(--text-muted)]" dir="rtl">
                  <li>&quot;What&apos;s my availability this week?&quot;</li>
                  <li>&quot;Schedule a meeting with John at john@example.com&quot;</li>
                  <li>&quot;Find a time to meet with Sarah next week&quot;</li>
                </ul>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-message-in ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-lg bg-[var(--teal)] flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'rounded-[var(--radius-salon)] px-5 py-4 max-w-[85%] transition-[var(--transition-lux)]',
                  message.role === 'user'
                    ? 'bg-[var(--coral)] text-white'
                    : 'bg-[var(--beige-bubble)] text-[var(--text-primary)]'
                )}
                style={message.role === 'user' ? { boxShadow: 'var(--coral-glow)' } : undefined}
              >
                <p
                  className="text-sm whitespace-pre-wrap leading-relaxed"
                  dir="rtl"
                >
                  {getMessageContent(message)}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-lg bg-[var(--coral)] flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start animate-message-in">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-lg bg-[var(--teal)] flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="rounded-[var(--radius-salon)] px-5 py-4 max-w-[85%] bg-[var(--beige-bubble)] animate-thinking-pulse transition-[var(--transition-lux)]" style={{ boxShadow: 'var(--shadow-soft)' }}>
                <div className="flex items-center gap-2 text-sm text-[var(--teal)]" dir="rtl">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  <span>
                    {currentTool ? (
                      <>
                        <Wrench className="h-4 w-4 inline ml-1.5 align-middle" />
                        {TOOL_LABELS[currentTool] ?? currentTool}
                      </>
                    ) : (
                      'חושבת...'
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-6 pb-6 px-6 relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitError(null);
            handleSubmit(e);
          }}
          className="flex gap-4 items-end p-4 rounded-[28px] glass-pod input-pod max-w-2xl mx-auto"
        >
          {(submitError !== null || latestToolError !== null) ? (
            <p className="absolute bottom-full left-2 right-2 mb-1 text-xs text-[var(--coral)]" role="alert">
              {latestToolError ?? submitError}
            </p>
          ) : null}
          <Textarea
            value={input}
            onChange={(e) => { setSubmitError(null); handleInputChange(e); }}
            placeholder="Type your message..."
            className="min-h-[48px] max-h-32 resize-none bg-transparent border-0 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-3 text-sm"
            rows={1}
            dir="rtl"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="shrink-0 h-12 w-12 rounded-2xl bg-[var(--coral)] hover:bg-[var(--coral)]/90 text-white border-0 transition-[var(--transition-lux)]"
            style={{ boxShadow: 'var(--coral-glow)' }}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
