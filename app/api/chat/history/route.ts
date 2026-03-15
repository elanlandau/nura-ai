import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const MAX_MESSAGES = 200;

export const dynamic = 'force-dynamic';

interface ChatRow {
  id: string;
  role: string;
  content: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ messages: [] });
    }

    const rows = await prisma.chatMessage.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
      take: MAX_MESSAGES,
    });

    const messages = rows.map((r: ChatRow) => ({
      id: r.id,
      role: (r.role === 'user' || r.role === 'assistant' || r.role === 'system' ? r.role : 'user') as 'user' | 'assistant' | 'system',
      content: r.content ?? '',
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[chat/history] ERROR:', err);
    console.error('[chat/history] message:', err instanceof Error ? err.message : String(err));
    console.error('[chat/history] stack:', err instanceof Error ? err.stack : 'no stack');
    return NextResponse.json({ messages: [] });
  }
}
