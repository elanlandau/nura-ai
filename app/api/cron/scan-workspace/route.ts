import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { supabase as supabaseDb } from '@/lib/supabase/client';
import { listGmailMessages } from '@/lib/integrations/gmail';
import { classifyEmailWithLLM } from '@/lib/nura-pulse';
import type { OAuthAccount } from '@/lib/types';
import type { GmailMessageSummary } from '@/lib/integrations/gmail';

export const runtime = 'nodejs';

export interface ClassificationLog {
  emailId: string;
  subject: string;
  from: string;
  type: 'meeting_request' | 'urgent' | null;
  reason?: string;
}

/** Maps a NextAuth Account row (Prisma) to the app's OAuthAccount type. */
function mapRowToOAuthAccount(row: {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
}): OAuthAccount {
  return {
    id: row.id,
    user_id: row.userId,
    provider: row.provider as 'google' | 'microsoft',
    provider_account_id: row.providerAccountId,
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.expires_at,
    token_type: row.token_type,
    scope: row.scope,
    email: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const maxDuration = 60;

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

  const errors: string[] = [];
  const classifications: ClassificationLog[] = [];
  let scanned = 0;
  let notificationsCreated = 0;

  try {
    // Use NextAuth Account model (replaces OAuthAccount)
    const accounts = await prisma.account.findMany({
      where: { provider: 'google' },
    });

    for (const row of accounts) {
      const account = mapRowToOAuthAccount(row);
      const userId = account.user_id;

      try {
        const messages: GmailMessageSummary[] = await listGmailMessages(account, {
          maxResults: 10,
          query: 'is:unread',
        });
        scanned += messages.length;

        for (const msg of messages) {
          const result = await classifyEmailWithLLM(msg.subject, msg.snippet);
          const type = result.type;

          const log: ClassificationLog = {
            emailId: msg.id,
            subject: (msg.subject || '(No subject)').slice(0, 80),
            from: msg.from?.slice(0, 50) ?? '',
            type,
            reason: result.reason,
          };
          classifications.push(log);
          console.log('[NURA Pulse]', JSON.stringify(log));

          if (!type) continue;

          const title = msg.subject || '(No subject)';
          const body = [msg.from, msg.snippet].filter(Boolean).join(' · ');

          const { error } = await supabaseDb.from('notifications').insert({
            user_id: userId,
            type,
            title,
            body: body.slice(0, 1000),
            reference_id: msg.id,
          });

          if (error) {
            errors.push(`insert ${userId}: ${error.message}`);
            continue;
          }
          notificationsCreated += 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`scan ${userId}: ${message}`);
      }
    }

    console.log('[NURA Pulse]', { scanned, notificationsCreated, usersProcessed: accounts.length, errors: errors.length });
    return NextResponse.json({
      ok: true,
      scanned,
      notificationsCreated,
      usersProcessed: accounts.length,
      classifications,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[NURA Pulse]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
