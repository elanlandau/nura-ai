import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPushToUser } from '@/lib/push-server';

export const maxDuration = 60;

/**
 * Task Pop: run every minute. Sends push for tasks whose due_at is within the current minute
 * (and we haven't already sent an alert). Marks alert_sent_at so we only notify once.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const headerSecret = request.headers.get('x-cron-secret');
    if (bearer !== cronSecret && headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 1000);  // 30s in the past
  const windowEnd = new Date(now.getTime() + 30 * 1000);    // 30s in the future

  let sent = 0;

  try {
    const tasks = await prisma.task.findMany({
      where: {
        alert_sent_at: null,
        due_at: { gte: windowStart, lte: windowEnd },
      },
    });

    for (const task of tasks) {
      const { sent: n } = await sendPushToUser(task.user_id, {
        title: 'NURA',
        body: `Task due now: ${task.title}`,
        url: '/tasks',
        tag: `task-${task.id}`,
      });
      sent += n;
      await prisma.task.update({
        where: { id: task.id },
        data: { alert_sent_at: new Date() },
      });
    }

    return NextResponse.json({ ok: true, sent, processed: tasks.length });
  } catch (err) {
    console.error('[cron/task-alerts]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Task alerts failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
