/** Email already registered — user should use Log in instead of Sign up. */
export function isUserAlreadyRegisteredError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; code?: string };
  const code = String(e.code ?? '').toLowerCase();
  const msg = String(e.message ?? '').toLowerCase();
  return (
    code === 'user_already_exists' ||
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already registered') ||
    msg.includes('email address is already registered')
  );
}

/** Supabase returns this when the user must confirm email before password sign-in. */
export function isUnconfirmedEmailError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; code?: string; status?: number };
  const code = String(e.code ?? '').toLowerCase();
  const msg = String(e.message ?? '').toLowerCase();
  return (
    code === 'email_not_confirmed' ||
    msg.includes('email not confirmed') ||
    msg.includes('signup requires a confirmed email')
  );
}
