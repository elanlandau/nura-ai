import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { listGmailMessages } from '@/lib/integrations/gmail';
import { sendPushToUser } from '@/lib/push-server';
import { isImportantEmail, senderDisplayName } from '@/lib/email-importance';
import type { OAuthAccount } from '@/lib/types';
import type { GmailMessageSummary } from '@/lib/integrations/gmail';

export const runtime = 'nodejs';

function mapRowToOAuthAccount(row: {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}): OAuthAccount {
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

export const maxDuration = 60;

/**
 * Gmail Alerts: run every 2 minutes. Check unread emails, filter by importance
 * (keywords: Invoice, Urgent, Meeting, deadline + LLM), send push once per message.
 * Title: 📧 NURA - New Important Email | Body: [Sender Name]: [Subject] | Deep link: /chat?emailId=...
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const headerSecret = request.headers.get('x-cron-secret');
    if (bearer !== cronSecret && headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let sent = 0;
  const errors: string[] = [];

  try {
    const accounts = await prisma.oAuthAccount.findMany({
      where: { provider: 'google' },
    });

    for (const row of accounts) {
      const account = mapRowToOAuthAccount(row);
      const userId = account.user_id;
      try {
        const messages: GmailMessageSummary[] = await listGmailMessages(account, {
          maxResults: 15,
          query: 'is:unread',
        });

        for (const msg of messages) {
          const existing = await prisma.emailPushSent.findUnique({
            where: {
              user_id_message_id: { user_id: userId, message_id: msg.id },
            },
          });
          if (existing) continue;

          const important = await isImportantEmail(msg.subject || '', msg.snippet || '', { from: msg.from });
          if (!important) continue;

          const senderName = senderDisplayName(msg.from || '');
          const body = `${senderName}: ${(msg.subject || '(No subject)').trim()}`;
          const deepLink = `/chat?emailId=${encodeURIComponent(msg.id)}`;

          const { sent: n } = await sendPushToUser(userId, {
            title: '📧 NURA - New Important Email',
            body,
            url: deepLink,
            tag: `gmail-${msg.id}`,
          });
          sent += n;

          await prisma.emailPushSent.create({
            data: {
              user_id: userId,
              message_id: msg.id,
            },
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${userId}: ${message}`);
      }
    }

    return NextResponse.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error('[cron/gmail-alerts]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gmail alerts failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
