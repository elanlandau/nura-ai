import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Single source of truth: `onboarding_completed` must be true to skip onboarding (→ /home).
 * Missing profile row = not completed.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { onboarding_completed: false, needsOnboarding: true, error: 'missing userId' },
        { status: 400 }
      );
    }

    const profile = await prisma.userChatProfile.findUnique({
      where: { user_id: userId },
      select: { onboarding_completed: true },
    });

    const onboarding_completed = profile?.onboarding_completed === true;
    const needsOnboarding = !onboarding_completed;

    return NextResponse.json({ onboarding_completed, needsOnboarding });
  } catch (e) {
    console.error('[onboarding-status]', e);
    return NextResponse.json(
      { onboarding_completed: false, needsOnboarding: true, error: 'server_error' },
      { status: 500 }
    );
  }
}
