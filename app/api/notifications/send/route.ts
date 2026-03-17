import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/push-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST: Send a push notification to a user (e.g. from cron or Nura proactive logic). */
export async function POST(request: NextRequest) {
  try {
    let body: { userId?: string; title?: string; body?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const userId = body.userId ?? null;
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    const { sent, failed } = await sendPushToUser(userId, {
      title: body.title ?? 'NURA',
      body: body.body ?? '',
    });
    return NextResponse.json({ ok: true, sent, failed });
  } catch (err) {
    console.error('[notifications/send]', err);
    return NextResponse.json({ error: 'Failed to send push' }, { status: 500 });
  }
}
