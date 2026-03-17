import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST: Save push subscription for the user (so Nura can send when tab is closed). */
export async function POST(request: NextRequest) {
  try {
    let body: {
      userId?: string;
      subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const userId = body.userId ?? null;
    const sub = body.subscription;
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return NextResponse.json({ error: 'userId required' }, { status: 401 });
    }
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: 'subscription with endpoint and keys required' }, { status: 400 });
    }
    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      update: {
        user_id: userId,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notifications/subscribe]', err);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
