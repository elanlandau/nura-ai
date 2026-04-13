import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const GOAL_IDS = ['scheduling', 'gmail', 'creative', 'assistant', 'other'] as const;
const TONES = ['professional', 'casual', 'witty'] as const;

const GOAL_LABELS: Record<(typeof GOAL_IDS)[number], string> = {
  scheduling: 'Scheduling & calendar',
  gmail: 'Gmail & email management',
  creative: 'Creative writing',
  assistant: 'General personal assistant',
  other: 'Other / mixed',
};

function buildPreferencesSummary(input: {
  displayName: string;
  main_goals: string[];
  tone: string;
  preferred_language: string;
  extra_notes?: string;
}): string {
  const goalText = input.main_goals.map((id) => GOAL_LABELS[id as keyof typeof GOAL_LABELS] ?? id).join(', ');

  const lines = [
    `Preferred name: ${input.displayName.trim()}`,
    `Main goals: ${goalText}`,
    `Tone preference: ${input.tone.trim()}`,
    `Default response language: ${input.preferred_language.trim()}`,
  ];
  const notes = input.extra_notes?.trim();
  if (notes) lines.push(`Notes: ${notes}`);
  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const display_name = typeof body.display_name === 'string' ? body.display_name.trim() : '';
    const rawGoals = body.main_goals;
    const main_goals = Array.isArray(rawGoals)
      ? rawGoals.filter((g: unknown): g is string => typeof g === 'string' && GOAL_IDS.includes(g as (typeof GOAL_IDS)[number]))
      : [];
    const tone = typeof body.tone === 'string' ? body.tone.trim().toLowerCase() : '';
    const preferred_language = typeof body.preferred_language === 'string' ? body.preferred_language.trim() : '';
    const extra_notes = typeof body.extra_notes === 'string' ? body.extra_notes : '';

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (main_goals.length === 0) {
      return NextResponse.json({ error: 'Select at least one main goal' }, { status: 400 });
    }
    if (!TONES.includes(tone as (typeof TONES)[number])) {
      return NextResponse.json({ error: 'Invalid tone' }, { status: 400 });
    }
    if (!preferred_language) {
      return NextResponse.json({ error: 'Language required' }, { status: 400 });
    }

    const nameForProfile = display_name || 'User';
    const preferences_summary = buildPreferencesSummary({
      displayName: nameForProfile,
      main_goals,
      tone,
      preferred_language,
      extra_notes: extra_notes.trim() || undefined,
    });

    await prisma.userChatProfile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        display_name: display_name || null,
        preferences_summary,
        onboarding_completed: true,
      },
      update: {
        display_name: display_name || undefined,
        preferences_summary,
        onboarding_completed: true,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[onboarding POST]', e);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
