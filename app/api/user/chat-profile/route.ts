import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  try {
    const row = await prisma.userChatProfile.findUnique({
      where: { user_id: userId },
      select: { display_name: true },
    });
    return NextResponse.json({ display_name: row?.display_name ?? null });
  } catch (e) {
    console.error('[chat-profile]', e);
    return NextResponse.json({ display_name: null });
  }
}
