/**
 * Shared pg Client config for Supabase Postgres: encoded password + ssl rejectUnauthorized false.
 * Use in app/api/debug-db, app/api/chat/save, app/api/auth/callback/google.
 */

function connectionStringWithEncodedPassword(raw: string): string {
  const protocolEnd = raw.indexOf('://');
  if (protocolEnd === -1) return raw;
  const afterProtocol = raw.slice(protocolEnd + 3);
  const atIndex = afterProtocol.lastIndexOf('@');
  if (atIndex === -1) return raw;
  const auth = afterProtocol.slice(0, atIndex);
  const rest = afterProtocol.slice(atIndex);
  const colonIdx = auth.indexOf(':');
  if (colonIdx === -1) return raw;
  const user = auth.slice(0, colonIdx);
  const password = auth.slice(colonIdx + 1);
  const encodedPassword = encodeURIComponent(password);
  return raw.slice(0, protocolEnd + 3) + user + ':' + encodedPassword + rest;
}

export function getPgClientConfig(): { connectionString: string; ssl: { rejectUnauthorized: false } } | null {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  const connectionString = connectionStringWithEncodedPassword(raw);
  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
}
