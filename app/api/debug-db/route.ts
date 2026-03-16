import { NextResponse } from 'next/server';
import { Client } from 'pg';
import { getPgClientConfig } from '@/lib/pg-config';

function withPort5432(connectionString: string): string {
  return connectionString.replace(/:6543\//, ':5432/').replace(/:6543\?/, ':5432?');
}

export async function GET() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  const clientConfig = getPgClientConfig();
  if (!clientConfig) {
    const msg = 'DATABASE_URL is not set';
    console.error('[debug-db]', msg);
    return NextResponse.json({ error: msg, connected: false }, { status: 503 });
  }

  const client = new Client(clientConfig);
  try {
    await client.connect();
    await client.query('SELECT 1');
    return NextResponse.json({ message: 'DB Connected', connected: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[debug-db]', message, stack);

    if (clientConfig.connectionString.includes(':6543') && (message.includes('tenant') || message.includes('Tenant') || message.includes('not found'))) {
      const fallbackConnectionString = withPort5432(clientConfig.connectionString);
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
