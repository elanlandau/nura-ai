/**
 * Google OAuth callback for the Connections flow (Connect Gmail/Calendar).
 * Saves access_token and refresh_token to OAuthAccount via direct pg (no Prisma).
 */
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getGoogleRedirectUri } from '@/lib/env';

const RETURN_BASE = 'https://nurapersonal.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/connections?error=oauth_failed', RETURN_BASE));
  }

  const userId = state;
  const redirectUri = getGoogleRedirectUri(request.nextUrl.origin);
  if (!redirectUri) {
    return NextResponse.redirect(new URL('/connections?error=oauth_config', RETURN_BASE));
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Google Token Error:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokens = await tokenResponse.json();

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();
    console.log('Google Profile:', userInfo);

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('[OAuth callback] DATABASE_URL not set');
      return NextResponse.redirect(new URL('/connections?error=oauth_failed', RETURN_BASE));
    }

    const client = new Client({ connectionString });
    try {
      await client.connect();
      const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 11)}`;
      const now = new Date();
      await client.query(
        `INSERT INTO "OAuthAccount" (
          "id", "user_id", "provider", "provider_account_id",
          "access_token", "refresh_token", "expires_at", "token_type", "scope", "email",
          "created_at", "updated_at"
        ) VALUES ($1, $2, 'google', $3, $4, $5, $6, $7, $8, $9, $10, $10)
        ON CONFLICT ("user_id", "provider") DO UPDATE SET
          "provider_account_id" = EXCLUDED."provider_account_id",
          "access_token" = EXCLUDED."access_token",
          "refresh_token" = EXCLUDED."refresh_token",
          "expires_at" = EXCLUDED."expires_at",
          "token_type" = EXCLUDED."token_type",
          "scope" = EXCLUDED."scope",
          "email" = EXCLUDED."email",
          "updated_at" = EXCLUDED."updated_at"`,
        [
          id,
          userId,
          userInfo.id ?? '',
          tokens.access_token ?? null,
          tokens.refresh_token ?? null,
          expiresAt,
          tokens.token_type ?? 'Bearer',
          tokens.scope ?? null,
          userInfo.email ?? null,
          now,
        ]
      );
      console.log('[OAuth callback] OAuthAccount saved for user_id:', userId);
    } finally {
      await client.end().catch(() => {});
    }

    return NextResponse.redirect(new URL('/connections?success=google', RETURN_BASE));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/connections?error=oauth_failed', RETURN_BASE));
  }
}
