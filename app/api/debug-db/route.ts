import { NextResponse } from 'next/server';
import { Client } from 'pg';

/**
 * Encode password in connection string to avoid hidden/special characters breaking the connection.
 * Format: postgresql://user:password@host:port/db?query
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

/**
 * Ensure sslmode=require is in the connection string (for Supabase).
 */
function ensureSslMode(connectionString: string): string {
  if (connectionString.includes('sslmode=')) return connectionString;
  const sep = connectionString.includes('?') ? '&' : '?';
  return connectionString + sep + 'sslmode=require';
}

/**
 * Swap port 6543 (Transaction pooler) to 5432 (Session) to bypass tenant errors.
 */
function withPort5432(connectionString: string): string {
  return connectionString.replace(/:6543\//, ':5432/').replace(/:6543\?/, ':5432?');
}

export async function GET() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const msg = 'DATABASE_URL is not set';
    console.error('[debug-db]', msg);
    return NextResponse.json({ error: msg, connected: false }, { status: 503 });
  }

  connectionString = connectionStringWithEncodedPassword(connectionString);
  connectionString = ensureSslMode(connectionString);

  const clientConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };

  const client = new Client(clientConfig);
  try {
    await client.connect();
    await client.query('SELECT 1');
    return NextResponse.json({ message: 'DB Connected', connected: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[debug-db]', message, stack);

    if (connectionString.includes(':6543') && (message.includes('tenant') || message.includes('Tenant') || message.includes('not found'))) {
      const fallbackConnectionString = withPort5432(connectionString);
      console.log('[debug-db] Retrying with port 5432 (Session) instead of 6543 (Transaction)');
      const fallbackClient = new Client({
        connectionString: fallbackConnectionString,
        ssl: { rejectUnauthorized: false },
      });
      try {
        await fallbackClient.connect();
        await fallbackClient.query('SELECT 1');
        await fallbackClient.end().catch(() => {});
        return NextResponse.json({
          message: 'DB Connected (port 5432)',
          connected: true,
          note: 'Connected using Session port 5432 instead of Transaction 6543',
        });
      } catch (retryErr) {
        const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.error('[debug-db] Retry with 5432 failed:', retryMessage);
        return NextResponse.json(
          {
            error: message,
            retryError: retryMessage,
            connected: false,
            stack: process.env.NODE_ENV === 'development' ? stack : undefined,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: message, connected: false, stack: process.env.NODE_ENV === 'development' ? stack : undefined },
      { status: 503 }
    );
  } finally {
    await client.end().catch(() => {});
  }
}
