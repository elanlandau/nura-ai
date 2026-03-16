import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getPgClientConfig } from '@/lib/pg-config';

export async function POST(request: NextRequest) {
  let body: { userId?: string; role?: string; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { userId, role, content } = body;
  if (!userId || !role || content === undefined) {
    return NextResponse.json({ error: 'Missing userId, role, or content' }, { status: 400 });
  }
  if (userId === 'guest-user-bypass' || userId.trim() === '') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (role !== 'user' && role !== 'assistant') {
    return NextResponse.json({ error: 'role must be user or assistant' }, { status: 400 });
  }

  const clientConfig = getPgClientConfig();
  if (!clientConfig) {
    console.error('[chat/save] DATABASE_URL not set');
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }

  const client = new Client(clientConfig);
  try {
    await client.connect();
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 11)}`;
    const text = `INSERT INTO "ChatMessage" ("id", "user_id", "role", "content") VALUES ($1, $2, $3, $4)`;
    await client.query(text, [id, userId, role, String(content).slice(0, 100_000)]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[chat/save]', err);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
