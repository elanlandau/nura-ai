/**
 * Production base URL and Google OAuth callback – https://nurapersonal.com
 */
const PRODUCTION_BASE = 'https://nurapersonal.com';
const GOOGLE_CALLBACK_URI = 'https://nurapersonal.com/api/auth/callback/google';

export function getGoogleRedirectUri(_requestOrigin?: string): string {
  return GOOGLE_CALLBACK_URI;
}
