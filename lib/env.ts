/**
 * Production base URL and Google OAuth callback – hardcoded to nura-ai.vercel.app.
 */
const PRODUCTION_BASE = 'https://nura-ai.vercel.app';
const GOOGLE_CALLBACK_URI = 'https://nura-ai.vercel.app/api/auth/callback/google';

export function getGoogleRedirectUri(_requestOrigin?: string): string {
  return GOOGLE_CALLBACK_URI;
}
