import { NextRequest, NextResponse } from 'next/server';
import { getGoogleRedirectUri } from '@/lib/env';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('state');

  if (!userId) {
    return NextResponse.redirect(new URL('/connections?error=missing_state', request.url));
  }

  const redirectUri = getGoogleRedirectUri(request.nextUrl.origin);
  if (!redirectUri) {
    return NextResponse.json(
      { error: 'Missing redirect URI. Set NEXT_PUBLIC_GOOGLE_REDIRECT_URI or deploy on Vercel.' },
      { status: 500 }
    );
  }

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  const scopeString = scopes.join(' ');
  authUrl.searchParams.set('scope', scopeString);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent select_account');
  authUrl.searchParams.set('state', userId);

  const fullAuthUrl = authUrl.toString();
  console.log('[Google OAuth] Full authorization URL:', fullAuthUrl);
  console.log('[Google OAuth] Scopes sent:', scopeString);

  return NextResponse.redirect(fullAuthUrl);
}
