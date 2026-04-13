'use client';

import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { OnboardingQuiz } from '@/components/onboarding-quiz';

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const user = session?.user ?? null;
  const loading = status === 'loading';

  if (loading || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white text-black antialiased" data-onboarding>
      <OnboardingQuiz userId={user.id} />
    </div>
  );
}
