import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** POST: Create a new chat thread for the user. Returns { threadId }. */
export async function POST(request: NextRequest) {
  try {
    let body: { userId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const userId = body.userId ?? null;
    if (!userId || typeof userId !== 'string' || userId === 'guest-user-bypass' || userId.trim() === '') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const thread = await prisma.chatThread.create({
      data: { user_id: userId },
    });
    return NextResponse.json({ threadId: thread.id });
  } catch (err) {
    console.error('[chat/threads] POST', err);
    return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
  }
}

/** GET: List threads for the user (for History sidebar). */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId || typeof userId !== 'string' || userId === 'guest-user-bypass') {
      return NextResponse.json({ threads: [] });
    }
    const threads = await prisma.chatThread.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { content: true, role: true },
        },
      },
    });
    const list = threads.map((t) => ({
      id: t.id,
      createdAt: t.created_at.toISOString(),
      updatedAt: t.updated_at.toISOString(),
      preview: t.messages[0]?.content?.slice(0, 80) ?? 'New chat',
    }));
    return NextResponse.json({ threads: list });
  } catch (err) {
    console.error('[chat/threads] GET', err);
    return NextResponse.json({ threads: [] });
  }
}
