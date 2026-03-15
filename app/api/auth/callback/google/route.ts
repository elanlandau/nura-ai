import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getGoogleRedirectUri } from '@/lib/env';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/connections?error=oauth_failed', request.url));
  }

  const userId = state;
  const redirectUri = getGoogleRedirectUri(request.nextUrl.origin);
  if (!redirectUri) {
    return NextResponse.redirect(new URL('/connections?error=oauth_config', request.url));
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

    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

    await prisma.oAuthAccount.upsert({
      where: {
        user_id_provider: { user_id: userId, provider: 'google' },
      },
      create: {
        user_id: userId,
        provider: 'google',
        provider_account_id: userInfo.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        token_type: tokens.token_type ?? 'Bearer',
        scope: tokens.scope ?? null,
        email: userInfo.email ?? null,
      },
      update: {
        provider_account_id: userInfo.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        token_type: tokens.token_type ?? 'Bearer',
        scope: tokens.scope ?? null,
        email: userInfo.email ?? null,
      },
    });

    return NextResponse.redirect(new URL('/connections?success=google', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/connections?error=oauth_failed', request.url));
  }
}
