import { NextRequest, NextResponse } from 'next/server';
import { Configuration, OpenAIApi } from 'openai-edge';
import { prisma } from '@/lib/db';
import { listGmailMessages } from '@/lib/integrations/gmail';
import { refreshGoogleAccessToken } from '@/lib/integrations/google-calendar';
import type { OAuthAccount } from '@/lib/types';

export const maxDuration = 30;

/** Refresh Google token if expired and persist to OAuthAccount so Gmail API calls succeed. */
async function ensureValidTokenAndPersist(userId: string, account: OAuthAccount): Promise<OAuthAccount> {
  if (!account.access_token || account.expires_at == null) {
    throw new Error('No access token found');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const bufferSec = 60;
  if (nowSec < account.expires_at - bufferSec) {
    return account;
  }
  if (!account.refresh_token) {
    throw new Error('Token expired and no refresh token');
  }
  const tokenData = await refreshGoogleAccessToken(account.refresh_token);
  const newExpiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
  await prisma.oAuthAccount.update({
    where: { user_id_provider: { user_id: userId, provider: 'google' } },
    data: { access_token: tokenData.access_token, expires_at: newExpiresAt },
  });
  return {
    ...account,
    access_token: tokenData.access_token,
    expires_at: newExpiresAt,
  };
}

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

// Uses Prisma (oAuthAccount), Gmail API, and OpenAI. No Supabase. 500s: check logs for [insights/digest] Prisma/DB | Gmail | OpenAI | Error (full handler).
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')?.trim() ?? '';
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    let account: OAuthAccount | null = null;
    try {
      account = await getOAuthAccount(userId, 'google');
    } catch (dbErr) {
      const err = dbErr as Error;
      console.error('[insights/digest] Prisma/DB (getOAuthAccount)', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        userId: userId.slice(0, 8) + '...',
      });
      throw dbErr;
    }
    if (!account) {
      console.error('[insights/digest] No Google OAuth account for userId:', userId.slice(0, 8) + '...');
      return NextResponse.json({ summary: null, message: 'Connect Gmail in Connections to see insights.' });
    }

    let messages: { subject: string; from: string; snippet: string }[] = [];
    try {
      const accountWithValidToken = await ensureValidTokenAndPersist(userId, account);
      const list = await listGmailMessages(accountWithValidToken, { maxResults: 20 });
      messages = list.map((m) => ({
        subject: m.subject || '(No subject)',
        from: m.from || '',
        snippet: (m.snippet || '').slice(0, 150),
      }));
    } catch (err) {
      const e = err as Error;
      console.error('[insights/digest] Gmail (token refresh or listGmailMessages)', e?.message ?? e, e?.stack);
      return NextResponse.json({ summary: null, message: 'Could not fetch emails. Reconnect Gmail in Connections.' });
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
      const e = err as Error;
      console.error('[insights/digest] OpenAI', e?.message ?? e, e?.stack);
      return NextResponse.json({ summary: null, message: 'Summary failed.' });
    }
  } catch (err) {
    const e = err as Error;
    console.error('[insights/digest] Error (full handler)', {
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
      err,
    });
    return NextResponse.json(
      { summary: null, message: 'Service temporarily unavailable.' },
      { status: 500 }
    );
  }
}
