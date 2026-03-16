import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const MAX_MESSAGES = 200;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const threadId = request.nextUrl.searchParams.get('threadId');
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ messages: [] });
    }
    if (!threadId || typeof threadId !== 'string') {
      return NextResponse.json({ messages: [] });
    }

    const rows = await prisma.chatMessage.findMany({
      where: { user_id: userId, thread_id: threadId },
      orderBy: { created_at: 'asc' },
      take: MAX_MESSAGES,
    });

    const messages = rows.map((r) => ({
      id: r.id,
      role: (r.role === 'user' || r.role === 'assistant' || r.role === 'system' ? r.role : 'user') as 'user' | 'assistant' | 'system',
      content: r.content ?? '',
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[chat/history] ERROR:', err);
    return NextResponse.json({ messages: [] });
  }
}
