import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildGreetingFromPreferencesSummary } from '@/lib/user-profile-greeting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Personalized first message for chat UI from UserChatProfile. */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ greeting: null, error: 'userId required' }, { status: 400 });
    }

    const profile = await prisma.userChatProfile.findUnique({
      where: { user_id: userId },
      select: { preferences_summary: true, display_name: true },
    });

    const greeting = buildGreetingFromPreferencesSummary(
      profile?.preferences_summary ?? null,
      profile?.display_name?.trim() || 'there'
    );

    return NextResponse.json({ greeting });
  } catch (e) {
    console.error('[user/greeting]', e);
    return NextResponse.json({ greeting: null, error: 'server_error' }, { status: 500 });
  }
}
