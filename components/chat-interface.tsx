'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Wrench, MessageSquarePlus } from 'lucide-react';
import { useChat } from 'ai/react';
import type { Message, JSONValue } from '@ai-sdk/ui-utils';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  userId: string;
  /** When switching from History sidebar, pass the thread to load. */
  initialThreadId?: string | null;
}

/** Safely get displayable string from message content (SDK may use string, parts[], or legacy arrays). */
function getMessageContent(message: { content?: unknown; parts?: unknown }): string {
  const parts = message.parts;
  if (Array.isArray(parts)) {
    const t = parts
      .map((p) => {
        if (p == null || typeof p !== 'object') return '';
        const o = p as { type?: string; text?: string };
        if (o.type === 'text' && typeof o.text === 'string') return o.text;
        if (typeof o.text === 'string') return o.text;
        return '';
      })
      .join('');
    if (t.trim()) return t;
  }
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

const NURA_INTRO_FALLBACK =
  "Hello, I'm NURA. I'm your executive AI—scheduling, email, and whatever you need. How can I help?";

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

  // Always inject latest userId + threadId on every request (avoids stale body from the first render).
  const experimental_prepareRequestBody = useCallback(
    ({ messages }: { messages: Message[] }) =>
      ({
        messages,
        userId,
        threadId: threadId ?? '',
      }) as unknown as JSONValue,
    [userId, threadId]
  );

  // Always send to /api/chat. Pass threadId when we have one (from URL or X-Thread-Id); otherwise '' so server creates thread.
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat',
    // OpenAIStream pipes through the AI SDK data stream (e.g. 0:"text" lines). Must use "data" protocol,
    // not "text" — otherwise the UI shows raw stream prefixes.
    streamProtocol: 'data',
    experimental_prepareRequestBody,
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
      let cancelled = false;
      (async () => {
        let content = NURA_INTRO_FALLBACK;
        try {
          const r = await fetch(`/api/user/greeting?userId=${encodeURIComponent(userId)}`);
          const data = (await r.json()) as { greeting?: string };
          if (data?.greeting?.trim()) content = data.greeting;
        } catch {
          /* keep fallback */
        }
        if (!cancelled) {
          setMessages([{ id: 'nura-intro', role: 'assistant', content }]);
          setHistoryLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
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
      .then(async (data) => {
        if (cancelled) {
          setHistoryLoaded(true);
          return;
        }
        if (!Array.isArray(data.messages) || data.messages.length === 0) {
          let content = NURA_INTRO_FALLBACK;
          try {
            const gr = await fetch(`/api/user/greeting?userId=${encodeURIComponent(userId)}`);
            const gd = (await gr.json()) as { greeting?: string };
            if (gd?.greeting?.trim()) content = gd.greeting;
          } catch {
            /* fallback */
          }
          if (!cancelled) setMessages([{ id: 'nura-intro', role: 'assistant', content }]);
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
    setSubmitError(null);
    router.replace('/chat', { scroll: false });
    // useEffect([threadId]) repopulates intro via /api/user/greeting when threadId is null
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
    <div className="flex flex-col h-full min-h-0 bg-transparent">
      <header className="shrink-0 flex items-center justify-between gap-4 px-0 py-6 min-h-[72px] bg-transparent border-0 border-b border-black overflow-visible">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-10 w-10 bg-black flex items-center justify-center flex-shrink-0 border-0 border-b border-black">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="gallery-heading text-xl text-black">NURA</h1>
            <p className="text-xs text-black/45 leading-relaxed tracking-wide">Your intelligent scheduling assistant</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleNewChat}
          className="shrink-0 relative z-10 flex items-center gap-2 py-2 px-0 text-black border-0 border-b border-black bg-transparent hover:opacity-70"
          aria-label="New chat (clear session)"
          title="New chat"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="text-sm font-medium tracking-wide">New Chat</span>
        </Button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-10 px-6 md:px-8"
      >
        <div className="space-y-8 max-w-2xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-20 animate-message-in" dir="rtl">
              <Bot className="h-14 w-14 mx-auto mb-6 text-[var(--teal)]" />
              <p className="text-lg font-semibold text-[var(--text-primary)] mb-3 tracking-tight">Welcome to NURA</p>
              <p className="text-[15px] text-[var(--text-muted)] mb-8 leading-relaxed max-w-md mx-auto">
                I can help you check your calendar, schedule meetings, and manage your time.
              </p>
              <div className="text-[15px] space-y-3">
                <p className="font-medium text-[var(--text-muted)]">Try asking:</p>
                <ul className="space-y-2.5 text-[var(--text-muted)] leading-relaxed" dir="rtl">
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
              className={`flex gap-3.5 animate-message-in ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 pt-1">
                  <div className="h-8 w-8 rounded-xl bg-[var(--teal-soft)] border border-[var(--border-subtle)] flex items-center justify-center backdrop-blur-sm">
                    <Bot className="h-4 w-4 text-[var(--teal)]" />
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'max-w-[85%] px-5 py-4 transition-[var(--transition-lux)]',
                  message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                )}
              >
                <p
                  className="text-[15px] whitespace-pre-wrap leading-[1.65]"
                  dir="rtl"
                >
                  {getMessageContent(message)}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 pt-1">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                    <User className="h-4 w-4 text-white/90" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3.5 justify-start animate-message-in">
              <div className="flex-shrink-0 pt-1">
                <div className="h-8 w-8 rounded-xl bg-[var(--teal-soft)] border border-[var(--border-subtle)] flex items-center justify-center backdrop-blur-sm nura-thinking-shell">
                  <Bot className="h-4 w-4 text-[var(--teal)]" />
                </div>
              </div>
              <div className="chat-bubble-assistant nura-thinking-shell px-5 py-4 max-w-[85%]">
                <div className="nura-thinking-track w-full max-w-[220px] mb-3">
                  <div className="nura-thinking-shimmer" />
                </div>
                <div className="flex items-center gap-2 text-[15px] text-[var(--text-muted)]" dir="rtl">
                  {currentTool ? (
                    <>
                      <Wrench className="h-4 w-4 shrink-0 text-[var(--teal)] opacity-90" />
                      <span>{TOOL_LABELS[currentTool] ?? currentTool}</span>
                    </>
                  ) : (
                    <span className="text-[var(--assistant-text)]">חושבת...</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-8 pb-8 px-6 md:px-8 relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitError(null);
            handleSubmit(e);
          }}
          className="flex gap-4 items-end py-4 px-0 border-0 border-b border-black bg-transparent max-w-2xl mx-auto w-full input-pod"
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
            className="min-h-[52px] max-h-32 resize-none bg-transparent border-0 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-3 text-[15px] leading-relaxed"
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
            className="shrink-0 h-12 w-12 bg-black text-white border-0 border-b border-black hover:opacity-90 min-h-0 p-0 flex items-center justify-center"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
