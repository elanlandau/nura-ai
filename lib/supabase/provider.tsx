'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

/**
 * Wraps the app in NextAuth's SessionProvider.
 * Use `useSession()` from `next-auth/react` in client components,
 * or `getServerSession(authOptions)` in Server Components / API routes.
 */
export function SupabaseProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

/**
 * Compatibility shim: components that previously called `useSupabase()`
 * now get back `{ user, loading }` sourced from NextAuth.
 * `user` has `id`, `name`, `email`, `image` — matches NextAuth Session.user.
 */
export function useSupabase() {
  const { data: session, status } = useSession();
  return {
    user: session?.user ?? null,
    session,
    loading: status === 'loading',
  };
}
