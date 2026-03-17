import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DB_TIMEOUT_MS = 3000;
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  try {
    const accountsPromise = prisma.oAuthAccount.findMany({
      where: { user_id: userId },
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), DB_TIMEOUT_MS)
    );
    const accounts = await Promise.race([accountsPromise, timeoutPromise]);
    type OAuthRow = { id: string; user_id: string; provider: string; provider_account_id: string; access_token: string | null; refresh_token: string | null; expires_at: number | null; token_type: string | null; scope: string | null; email: string | null; created_at: Date; updated_at: Date };
    const formatted = accounts.map((a: OAuthRow) => ({
      id: a.id,
      user_id: a.user_id,
      provider: a.provider as 'google' | 'microsoft',
      provider_account_id: a.provider_account_id,
      access_token: a.access_token,
      refresh_token: a.refresh_token,
      expires_at: a.expires_at,
      token_type: a.token_type,
      scope: a.scope,
      email: a.email,
      created_at: a.created_at.toISOString(),
      updated_at: a.updated_at.toISOString(),
    }));
    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json([]);
  }
}

export async function DELETE(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const id = request.nextUrl.searchParams.get('id');
  if (!userId || !id) {
    return NextResponse.json({ error: 'userId and id required' }, { status: 400 });
  }
  await prisma.oAuthAccount.deleteMany({
    where: { id, user_id: userId },
  });
  return NextResponse.json({ ok: true });
}
