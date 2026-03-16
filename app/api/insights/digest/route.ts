import { NextRequest, NextResponse } from 'next/server';
import { Configuration, OpenAIApi } from 'openai-edge';
import { prisma } from '@/lib/db';
import { listGmailMessages } from '@/lib/integrations/gmail';
import type { OAuthAccount } from '@/lib/types';

export const maxDuration = 30;

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

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const account = await getOAuthAccount(userId, 'google');
    if (!account) {
      return NextResponse.json({ summary: null, message: 'Connect Gmail in Connections to see insights.' });
    }

    let messages: { subject: string; from: string; snippet: string }[] = [];
    try {
      const list = await listGmailMessages(account, { maxResults: 20 });
      messages = list.map((m) => ({
        subject: m.subject || '(No subject)',
        from: m.from || '',
        snippet: (m.snippet || '').slice(0, 150),
      }));
    } catch (err) {
      console.error('[insights/digest] Gmail', err);
      return NextResponse.json({ summary: null, message: 'Could not fetch emails.' });
    }

    if (messages.length === 0) {
      return NextResponse.json({ summary: 'Inbox is empty.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'mock-key' || apiKey.startsWith('sk-placeholder')) {
      return NextResponse.json({ summary: null, message: 'OpenAI not configured.' });
    }

    const config = new Configuration({ apiKey });
    const openai = new OpenAIApi(config);

    const text = messages
      .map((m, i) => `${i + 1}. From: ${m.from} | Subject: ${m.subject} | ${m.snippet}`)
      .join('\n');

    try {
      const res = await openai.createChatCompletion({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following list of recent emails in one short, natural sentence in Hebrew. Examples: "הכל שקט, בעיקר עדכוני קריפטו" or "כמה בקשת פגישה ומייל דחוף אחד מתמיכה". Be concise and conversational. Respond only in Hebrew.',
          },
          { role: 'user', content: text },
        ],
        max_tokens: 80,
        temperature: 0.3,
      });

      if (!res.ok) {
        return NextResponse.json({ summary: null, message: 'Summary failed.' });
      }
      const data = await res.json();
      const summary = data.choices?.[0]?.message?.content?.trim() || null;
      return NextResponse.json({ summary });
    } catch (err) {
      console.error('[insights/digest] OpenAI', err);
      return NextResponse.json({ summary: null, message: 'Summary failed.' });
    }
  } catch (err) {
    console.error('[insights/digest] Error:', err);
    return NextResponse.json(
      { summary: null, message: 'Service temporarily unavailable.' },
      { status: 500 }
    );
  }
}
