import { prisma } from '@/lib/db';
import type { OAuthAccount } from '@/lib/types';

export async function getOAuthAccount(userId: string, provider: string): Promise<OAuthAccount | null> {
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
