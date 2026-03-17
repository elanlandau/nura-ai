import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { listGoogleCalendarEvents } from '@/lib/integrations/google-calendar';
import { sendPushToUser } from '@/lib/push-server';
import type { OAuthAccount } from '@/lib/types';

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
 * Calendar Pop: run every 1–2 minutes. Sends push "Upcoming: [Event Name] starts in 5 minutes!"
 * for events starting in ~5 minutes (window 4–6 min from now).
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

  const now = new Date();
  const windowStart = new Date(now.getTime() + 4 * 60 * 1000); // 4 min from now
  const windowEnd = new Date(now.getTime() + 6 * 60 * 1000);   // 6 min from now

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
        const events = await listGoogleCalendarEvents(account, windowStart, windowEnd);
        for (const event of events) {
          const { sent: n } = await sendPushToUser(userId, {
            title: 'NURA',
            body: `Upcoming: ${event.summary} starts in 5 minutes!`,
            url: '/chat',
            tag: `calendar-${event.id}`,
          });
          sent += n;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${userId}: ${message}`);
      }
    }

    return NextResponse.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error('[cron/calendar-alerts]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Calendar alerts failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
