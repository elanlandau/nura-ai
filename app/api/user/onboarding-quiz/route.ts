import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ONBOARDING_QUIZ, findOptionSummaryLine, type QuizLocale } from '@/lib/onboarding-quiz-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Persists onboarding quiz answers as preferences_summary (English lines for the model),
 * sets onboarding_completed: true. Replaces prior summary (quiz is source of truth for onboarding).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const locale = (body.locale === 'he' ? 'he' : 'en') as QuizLocale;
    const answers = body.answers as Record<string, string> | null;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'answers required' }, { status: 400 });
    }

    const lines: string[] = [
      'Onboarding profile (quiz v1)',
      `Quiz UI language: ${locale === 'he' ? 'Hebrew' : 'English'}`,
    ];

    for (const q of ONBOARDING_QUIZ) {
      const optionId = answers[q.id];
      if (typeof optionId !== 'string' || !optionId.trim()) {
        return NextResponse.json({ error: `Missing answer for ${q.id}` }, { status: 400 });
      }
      const summaryLine = findOptionSummaryLine(q.id, optionId.trim());
      if (!summaryLine) {
        return NextResponse.json({ error: `Invalid option for ${q.id}` }, { status: 400 });
      }
      lines.push(summaryLine);
    }

    const preferences_summary = lines.join('\n');

    await prisma.userChatProfile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        preferences_summary,
        onboarding_completed: true,
      },
      update: {
        preferences_summary,
        onboarding_completed: true,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[onboarding-quiz POST]', e);
    return NextResponse.json({ error: 'Failed to save onboarding' }, { status: 500 });
  }
}
