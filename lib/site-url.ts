/**
 * Canonical production origin for email confirmation links.
 * Override with NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL in env (e.g. Vercel).
 */
export const DEFAULT_PRODUCTION_ORIGIN = 'https://nurapersonal.com';

/**
 * Public site origin for OAuth return (prefer current browser tab in the client).
 */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  const env = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (env && typeof env === 'string') return env.replace(/\/$/, '');
  return '';
}

/**
 * Where Supabase sends users after email confirmation — always absolute, production by default.
 * Flow: user lands on /home → AuthGuard checks onboarding_completed → /onboarding if quiz not done.
 */
export function getEmailConfirmRedirectUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const base =
    typeof raw === 'string' && raw.trim()
      ? raw.trim().replace(/\/$/, '')
      : DEFAULT_PRODUCTION_ORIGIN.replace(/\/$/, '');
  return `${base}/home`;
}
