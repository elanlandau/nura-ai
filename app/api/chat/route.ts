import { StreamingTextResponse, OpenAIStream } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';
import { prisma } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getCalendarAvailability, createCalendarEvent } from '@/lib/integrations/calendar';
import { sendMeetingProposal } from '@/lib/integrations/email';
import { listGmailMessages } from '@/lib/integrations/gmail';
import { addDays } from 'date-fns';
import type { OAuthAccount } from '@/lib/types';

const PRIOR_CONTEXT_MESSAGE_LIMIT = 10;

export const maxDuration = 60;

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key',
});

const openai = new OpenAIApi(config);

async function getOAuthAccount(userId: string, provider: string): Promise<OAuthAccount | null> {
  const row = await prisma.oAuthAccount.findUnique({
    where: { user_id_provider: { user_id: userId, provider } },
  });
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    provider: row.provider as 'google' | 'microsoft',
    provider_account_id: row.provider_account_id,
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.expires_at,
    token_type: row.token_type,
    scope: row.scope,
    email: row.email,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

const functions = [
  {
    name: 'get_calendar_availability',
    description: 'Fetches available time slots from the user\'s calendar for a specified date range.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['google', 'microsoft'],
          description: 'The calendar provider to use',
        },
        days_ahead: {
          type: 'number',
          description: 'Number of days from today to check availability',
          default: 7,
        },
      },
      required: ['provider'],
    },
  },
  {
    name: 'propose_meeting_slots',
    description: `Sends an email to a recipient with proposed meeting time slots.

CONTEXT-AWARE LANGUAGE (required): Use the same language as the current conversation for 100% of the email:
- Subject, greeting, body, and closing must all be in that language (e.g. if the user is speaking Hebrew, the entire email is Hebrew; if English, entirely English; same for French, Spanish, Arabic, etc.).
- RTL vs LTR: The system applies dir='rtl' for right-to-left languages (e.g. Hebrew, Arabic) and dir='ltr' for left-to-right languages automatically. You only need to write the content in the correct language.
- Maintain a high-end, polite, and organized tone in every language—like a premium personal assistant.`,
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['google', 'microsoft'],
          description: 'The email/calendar provider to use',
        },
        recipient_email: {
          type: 'string',
          description: 'Email address of the meeting recipient',
        },
        recipient_name: {
          type: 'string',
          description: 'Name of the meeting recipient',
        },
        subject: {
          type: 'string',
          description: 'Email subject line (in the same language as the conversation; no extra characters)',
        },
        message: {
          type: 'string',
          description: 'Personalized message body (in the same language as the conversation; short paragraphs, one idea per line)',
        },
        time_slots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
              timezone: { type: 'string' },
            },
          },
          description: 'Array of proposed time slots',
        },
      },
      required: ['provider', 'recipient_email', 'recipient_name', 'subject', 'message', 'time_slots'],
    },
  },
  {
    name: 'confirm_meeting',
    description: 'Creates a calendar event after a time slot has been confirmed.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['google', 'microsoft'],
          description: 'The calendar provider to use',
        },
        thread_id: {
          type: 'string',
          description: 'ID of the meeting thread',
        },
        summary: {
          type: 'string',
          description: 'Meeting title',
        },
        description: {
          type: 'string',
          description: 'Meeting description',
        },
        time_slot: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            timezone: { type: 'string' },
          },
          description: 'The confirmed time slot',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of attendee email addresses',
        },
      },
      required: ['provider', 'summary', 'time_slot', 'attendees'],
    },
  },
  {
    name: 'list_messages',
    description: 'Lists recent emails in the user\'s Gmail inbox. Use this to read or scan the inbox.',
    parameters: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['google'],
          description: 'The email provider (only google/Gmail is supported)',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of messages to return',
          default: 20,
        },
        query: {
          type: 'string',
          description: 'Optional Gmail search query (e.g. "is:unread", "from:someone@example.com")',
        },
      },
      required: ['provider'],
    },
  },
];

async function handleFunctionCall(functionName: string, functionArgs: any, userId: string) {
  switch (functionName) {
    case 'get_calendar_availability': {
      const { provider, days_ahead = 7 } = functionArgs;

      const account = await getOAuthAccount(userId, provider);

      if (!account) {
        return { error: `No ${provider} account connected. Please connect your account in the Connections page.` };
      }

      const startDate = new Date();
      const endDate = addDays(startDate, days_ahead);

      const availability = await getCalendarAvailability(account, startDate, endDate);

      return { availability };
    }

    case 'propose_meeting_slots': {
      const { provider, recipient_email, recipient_name, subject, message, time_slots } = functionArgs;

      const account = await getOAuthAccount(userId, provider);

      if (!account) {
        return { error: `No ${provider} account connected. Please connect your account in the Connections page.` };
      }

      const emailThreadId = await sendMeetingProposal(account, {
        recipientEmail: recipient_email,
        recipientName: recipient_name,
        subject,
        message,
        proposedSlots: time_slots,
      });

      const thread = await prisma.meetingThread.create({
        data: {
          user_id: userId,
          recipient_email,
          recipient_name: recipient_name ?? null,
          subject,
          proposed_slots: JSON.stringify(time_slots),
          status: 'proposed',
          email_thread_id: emailThreadId ?? null,
        },
      });

      return {
        success: true,
        thread_id: thread.id,
        message: `Meeting proposal sent to ${recipient_name} (${recipient_email})`,
      };
    }

    case 'confirm_meeting': {
      const { provider, thread_id, summary, description, time_slot, attendees } = functionArgs;

      const account = await getOAuthAccount(userId, provider);

      if (!account) {
        return { error: `No ${provider} account connected. Please connect your account in the Connections page.` };
      }

      try {
        const eventId = await createCalendarEvent(account, {
          summary,
          description: description || '',
          start: time_slot,
          attendees,
        });

        if (thread_id) {
          await prisma.meetingThread.updateMany({
            where: { id: thread_id, user_id: userId },
            data: {
              status: 'confirmed',
              selected_slot: JSON.stringify(time_slot),
              calendar_event_id: eventId,
            },
          });
        }

        return {
          success: true,
          event_id: eventId,
          message: `Meeting confirmed and calendar event created`,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isPermission = message.includes('CALENDAR_PERMISSION_DENIED') || message.includes('403') || message.includes('Forbidden');
        if (isPermission) {
          return {
            error:
              'Calendar write permission is missing. Go to **Connections**, disconnect Google, then connect again and allow "View and manage your calendar events".',
          };
        }
        return { error: message };
      }
    }

    case 'list_messages': {
      const { provider, max_results = 20, query } = functionArgs;
      console.log('[NURA list_messages]', { userId, provider, max_results, query });
      if (provider !== 'google') {
        console.error('[NURA list_messages] unsupported provider:', provider);
        return { error: 'Only Google Gmail is supported for list_messages.' };
      }
      const account = await getOAuthAccount(userId, 'google');
      if (!account) {
        console.error('[NURA list_messages] no Google account for userId:', userId);
        return { error: 'No Google account connected. Please connect Gmail in the Connections page.' };
      }
      try {
        const messages = await listGmailMessages(account, {
          maxResults: max_results,
          query: query || undefined,
        });
        console.log('[NURA list_messages] OK count=', messages?.length ?? 0);
        return { messages };
      } catch (err) {
        console.error('[NURA list_messages] ERROR', err instanceof Error ? err.message : err);
        return { error: err instanceof Error ? err.message : 'Gmail request failed.' };
      }
    }

    default:
      return { error: 'Unknown function' };
  }
}

function getContentString(msg: { content?: unknown }): string {
  const c = msg.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((p) => (typeof p === 'string' ? p : (p as { text?: string })?.text ?? '')).join('');
  return '';
}

/** Fetches the last N messages for this thread from the DB (chronological order) for LLM context. */
async function getPriorContextMessages(userId: string, threadId: string): Promise<{ role: 'user' | 'assistant' | 'system'; content: string }[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { user_id: userId, thread_id: threadId },
    orderBy: { created_at: 'desc' },
    take: PRIOR_CONTEXT_MESSAGE_LIMIT,
  });
  const ordered = rows.reverse();
  return ordered.map((r) => ({
    role: (r.role === 'user' || r.role === 'assistant' || r.role === 'system' ? r.role : 'user') as 'user' | 'assistant' | 'system',
    content: r.content ?? ' ',
  }));
}

/** Gets the authenticated user's display name from Supabase auth: display_name or full_name or name, fallback to email prefix. */
async function getUserDisplayName(userId: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    if (error) {
      console.log('[chat] getUserDisplayName error for userId', userId.slice(0, 8) + '...', error.message);
      return null;
    }
    if (!user) return null;
    const meta = user.user_metadata as { display_name?: string; full_name?: string; name?: string } | null;
    const name = meta?.display_name ?? meta?.full_name ?? meta?.name ?? (user.email?.split('@')[0] ?? null);
    return name ?? null;
  } catch (e) {
    console.log('[chat] getUserDisplayName exception', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    let body: { messages?: unknown; userId?: string; threadId?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const userId = body.userId ?? null;
    let threadId = (body.threadId != null && typeof body.threadId === 'string') ? body.threadId.trim() : '';
    if (!userId || typeof userId !== 'string' || userId === 'guest-user-bypass' || userId.trim() === '') {
      return new Response('Unauthorized', { status: 401 });
    }

    // If no threadId, create a new thread so first message always works (e.g. after 500 on threads).
    let createdThreadId: string | null = null;
    if (!threadId) {
      const thread = await prisma.chatThread.create({
        data: { user_id: userId },
      });
      threadId = thread.id;
      createdThreadId = thread.id;
    }

    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = rawMessages
      .filter(
        (m): m is { role: string; content?: unknown } =>
          m != null && typeof m === 'object' && typeof (m as { role?: string }).role === 'string'
      )
      .map((m) => {
        const role = m.role as 'user' | 'assistant' | 'system';
        const content = getContentString(m);
        return { role, content: content || ' ' };
      });

    const thread = await prisma.chatThread.findUnique({ where: { id: threadId, user_id: userId } });
    if (!thread) {
      return Response.json({ error: 'Thread not found or access denied. Start a new chat.' }, { status: 404 });
    }

    const priorContext = await getPriorContextMessages(userId, threadId);
    const userDisplayName = await getUserDisplayName(userId);

    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last && typeof last === 'object' && (last as { role?: string }).role === 'user') {
        const content = getContentString(last as { content?: unknown });
        if (content && String(content).trim()) {
          await prisma.chatMessage.create({
            data: { thread_id: threadId, user_id: userId, role: 'user', content: String(content).slice(0, 100_000) },
          }).catch((e: unknown) => console.error('[chat] save user message', e));
        }
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'mock-key' || apiKey.startsWith('sk-placeholder')) {
      return Response.json(
        { error: 'OpenAI API key is missing or invalid. Set OPENAI_API_KEY in .env with a valid key from https://platform.openai.com/api-keys' },
        { status: 503 }
      );
    }

    const systemBase = `You are NURA, a global, multi-language AI personal assistant specialized in calendar management, email, and meeting scheduling. You help users:
- Check their calendar availability
- Read and scan their Gmail inbox (use the list_messages tool)
- Propose meeting times to others via email
- Confirm and create calendar events

BACKGROUND SCANNING (NURA Pulse): You have 24/7 background scanning enabled. Unread emails are automatically scanned every 15 minutes for meeting requests and urgent items. These insights appear in the user's Inbox (מיילים) in the app. When users ask about their inbox or what's urgent, you can mention that NURA Pulse is already scanning and they can check the Inbox page for a digest; you can also use list_messages for real-time lookup when they need something specific.

AUTO-LANGUAGE DETECTION (critical): Detect the language the user is speaking and respond strictly in that same language. If they write in Hebrew, respond in Hebrew. If English, respond in English. If French, Spanish, Arabic, or any other language, respond in that language. Never mix languages unless the user does. Be as helpful as possible—give complete answers and never stop mid-sentence.

Efficiency rules:
- When searching Gmail, use specific queries (e.g. from:dhl, subject:watch, from:amazon) instead of listing all messages. Pass the \`query\` parameter to list_messages with a narrow search.
- Prioritize speed: if you find the answer in the first few results (e.g. first 5), stop searching and answer immediately. Use max_results: 5 when a targeted query is enough.
- Only fetch more messages or do a second search if the first result set didn't contain the answer.

You have access to tools to interact with Google Calendar and Gmail. When users ask about their inbox or email, use list_messages (provider: google) with a specific \`query\` when possible. When users ask about scheduling, guide them through the process step by step.

Important:
- Use list_messages with a targeted \`query\` (e.g. from:sender, subject:keyword) instead of fetching the whole inbox
- Always ask which provider (google or microsoft) to use if not specified for calendar/meeting tools
- Confirm details before sending emails or creating events
- Be proactive in suggesting next steps

CONTEXT-AWARE EMAILS (propose_meeting_slots): Use the language of the current conversation for 100% of the email—Subject, Greeting, Body, and Closing. If the conversation is in Hebrew, the email is 100% Hebrew (RTL). If in English, 100% English (LTR). If French, Spanish, Arabic, etc., the email must be perfectly formatted in that language. Dynamic formatting: RTL languages (e.g. Hebrew, Arabic) get dir='rtl' in the email HTML; LTR languages get dir='ltr'. Maintain a high-end, polite, and organized tone in every language—like a premium personal assistant. Subject: clean, no extra characters. Body: short paragraphs, one idea per line, blank line between paragraphs.`;

    const userNameForPrompt = userDisplayName ?? 'the user';
    const systemContent = `Your name is NURA. You are talking to ${userNameForPrompt}. Always remember their name and past context from the database.\n\n` + systemBase;

    const baseMessagesForCompletion = [
      { role: 'system' as const, content: systemContent },
      ...priorContext,
      ...messages,
    ];

    console.log('VERSION_CHECK_1');
    console.log('Fetching data for user:', userId);
    console.log('[chat] finalMessages sent to OpenAI:', JSON.stringify(baseMessagesForCompletion, null, 2));

    const response = await openai.createChatCompletion({
      model: 'gpt-4o',
      stream: true,
      max_tokens: 2000,
      messages: baseMessagesForCompletion,
      functions,
      function_call: 'auto',
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
      const message = err?.error?.message || response.statusText;
      const status = response.status === 401 ? 503 : response.status;
      return Response.json(
        { error: response.status === 401 ? 'Invalid OpenAI API key. Check OPENAI_API_KEY in .env and https://platform.openai.com/api-keys' : message },
        { status }
      );
    }

    const stream = OpenAIStream(response, {
      experimental_onFunctionCall: async (
        { name, arguments: args },
        createFunctionCallMessages
      ) => {
        const result = await handleFunctionCall(name, args, userId);

        const newMessages = createFunctionCallMessages(result as any);
        const followUpMessages = [...baseMessagesForCompletion, ...newMessages];
        console.log('[chat] tool follow-up completion: full context (system + priorContext + messages + tool msgs), message count:', followUpMessages.length);
        return openai.createChatCompletion({
          model: 'gpt-4o',
          stream: true,
          max_tokens: 2000,
          messages: followUpMessages as any,
          functions,
        });
      },
    });

    const headers = new Headers();
    if (createdThreadId) headers.set('X-Thread-Id', createdThreadId);
    return new StreamingTextResponse(stream, { headers });
  } catch (error: unknown) {
    console.error('[chat] POST error:', error);
    console.error('[chat] message:', error instanceof Error ? error.message : String(error));
    console.error('[chat] stack:', error instanceof Error ? error.stack : 'no stack');
    const msg = String((error as Error)?.message ?? '');
    const isKeyError = msg.includes('invalid_api_key') || msg.includes('401') || msg.includes('Incorrect API key');
    const status = isKeyError ? 503 : 500;
    const body = isKeyError
      ? { error: 'Invalid OpenAI API key. Update OPENAI_API_KEY in .env. Get a key at https://platform.openai.com/api-keys' }
      : { error: 'Internal Server Error' };
    return Response.json(body, { status });
  }
}
