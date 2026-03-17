import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: { userId?: string; threadId?: string; role?: string; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { userId, threadId, role, content } = body;
  if (!userId || !threadId || !role || content === undefined) {
    return NextResponse.json({ error: 'Missing userId, threadId, role, or content' }, { status: 400 });
  }
  if (userId === 'guest-user-bypass' || userId.trim() === '') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (role !== 'user' && role !== 'assistant') {
    return NextResponse.json({ error: 'role must be user or assistant' }, { status: 400 });
  }

  try {
    await prisma.chatMessage.create({
      data: {
        thread_id: threadId,
        user_id: userId,
        role,
        content: String(content).slice(0, 100_000),
      },
    });
    await prisma.chatThread.updateMany({
      where: { id: threadId, user_id: userId },
      data: { updated_at: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[chat/save]', err);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
