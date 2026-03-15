/**
 * Production-ready env helpers. On Vercel, VERCEL_URL is set automatically.
 * Local dev: always uses request origin so localhost works regardless of .env.
 */
const GOOGLE_CALLBACK_PATH = '/api/auth/callback/google';

export function getGoogleRedirectUri(requestOrigin?: string): string {
  const fromRequest = requestOrigin ? `${requestOrigin}${GOOGLE_CALLBACK_PATH}` : '';

  // Local development (no VERCEL_URL): prefer request origin so localhost:3001 always works
  if (!process.env.VERCEL_URL) {
    return fromRequest || process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || '';
  }

  // Production (Vercel): use explicit or derive from VERCEL_URL
  return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `https://${process.env.VERCEL_URL}${GOOGLE_CALLBACK_PATH}` || fromRequest;
}
