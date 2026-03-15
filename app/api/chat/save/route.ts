import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, role, content } = await request.json();
    if (!userId || !role || content === undefined) {
      return NextResponse.json({ error: 'Missing userId, role, or content' }, { status: 400 });
    }
    if (role !== 'user' && role !== 'assistant') {
      return NextResponse.json({ error: 'role must be user or assistant' }, { status: 400 });
    }

    await prisma.chatMessage.create({
      data: {
        user_id: userId,
        role,
        content: String(content).slice(0, 100_000),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[chat/save]', err);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
