import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Latest tasks for dashboard (most recently created). */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }
  try {
    const tasks = await prisma.task.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        due_at: true,
        created_at: true,
      },
    });
    return NextResponse.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        due_at: t.due_at.toISOString(),
        created_at: t.created_at.toISOString(),
      })),
    });
  } catch (e) {
    console.error('[tasks/list]', e);
    return NextResponse.json({ tasks: [] }, { status: 200 });
  }
}
