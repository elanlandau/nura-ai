import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getGmailMessage } from '@/lib/integrations/gmail';
import type { OAuthAccount } from '@/lib/types';

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

export const dynamic = 'force-dynamic';

/**
 * GET ?userId=xxx&messageId=xxx – Fetch one Gmail message for deep link summary.
 * Returns { id, subject, from, snippet, date } so chat can show email context.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const messageId = request.nextUrl.searchParams.get('messageId');
    if (!userId || !messageId) {
      return NextResponse.json({ error: 'userId and messageId required' }, { status: 400 });
    }

    const row = await prisma.oAuthAccount.findUnique({
      where: { user_id_provider: { user_id: userId, provider: 'google' } },
    });
    if (!row) {
      return NextResponse.json({ error: 'No Google account linked' }, { status: 404 });
    }

    const account = mapRowToOAuthAccount(row);
    const msg = await getGmailMessage(account, messageId);
    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json(msg);
  } catch (err) {
    console.error('[gmail/message]', err);
    return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 });
  }
}
