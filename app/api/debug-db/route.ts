import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const msg = 'DATABASE_URL is not set';
    console.error('[debug-db]', msg);
    return NextResponse.json({ error: msg, connected: false }, { status: 503 });
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return NextResponse.json({ message: 'DB Connected', connected: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[debug-db]', message, stack);
    return NextResponse.json(
      { error: message, connected: false, stack: process.env.NODE_ENV === 'development' ? stack : undefined },
      { status: 503 }
    );
  } finally {
    await client.end().catch(() => {});
  }
}
