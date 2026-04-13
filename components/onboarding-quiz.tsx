'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ONBOARDING_QUIZ, type QuizLocale } from '@/lib/onboarding-quiz-data';
import { cn } from '@/lib/utils';

const BTN =
  'gallery-line-button w-full text-left px-0 py-5 text-[13px] leading-relaxed tracking-wide transition-colors duration-150 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0';

export function OnboardingQuiz({ userId }: { userId: string }) {
  const router = useRouter();
  const [locale, setLocale] = useState<QuizLocale>('en');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = ONBOARDING_QUIZ.length;
  const question = ONBOARDING_QUIZ[step];
  const isLast = step === total - 1;
  const selected = answers[question.id];

  const pick = async (optionId: string) => {
    setError(null);
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/user/onboarding-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          locale,
          answers: next,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Save failed');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nura-profile-updated'));
      }
      router.replace('/home');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="max-w-xl mx-auto px-12 sm:px-20 py-20 sm:py-28">
        {/* Language toggle */}
        <div className="flex justify-center gap-0 border-0 border-b border-black w-fit mx-auto mb-16">
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={cn(
              'px-8 py-3 text-[11px] uppercase tracking-[0.2em] font-medium transition-colors',
              locale === 'en' ? 'bg-black text-white' : 'bg-white text-black/60 hover:text-black'
            )}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLocale('he')}
            className={cn(
              'px-8 py-3 text-[11px] uppercase tracking-[0.2em] font-medium transition-colors border-0 border-l border-black',
              locale === 'he' ? 'bg-black text-white' : 'bg-white text-black/60 hover:text-black'
            )}
          >
            עברית
          </button>
        </div>

        <p className="text-[9px] uppercase tracking-[0.35em] text-black/40 text-center mb-6">
          {locale === 'he' ? 'שאלה' : 'Question'} {step + 1} / {total}
        </p>

        <h1
          className={cn(
            'gallery-heading text-4xl sm:text-5xl text-center mb-16 leading-[1.1]',
            locale === 'he' && 'dir-rtl'
          )}
        >
          {question.prompt[locale]}
        </h1>

        <div className="space-y-4 mb-12">
          {question.options.map((opt) => {
            const active = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={submitting}
                onClick={() => pick(opt.id)}
                className={cn(
                  BTN,
                  locale === 'he' && 'dir-rtl text-right',
                  active ? 'bg-black text-white border-black' : 'bg-white text-black hover:bg-black/[0.03]'
                )}
              >
                {opt.label[locale]}
              </button>
            );
          })}
        </div>

        {submitting && (
          <div className="flex items-center justify-center gap-2 text-sm text-black/50 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            {locale === 'he' ? 'שומר…' : 'Saving…'}
          </div>
        )}

        {error && (
          <p className="gallery-line-notice text-[11px] leading-relaxed text-center text-black py-5" role="alert">
            {error}
          </p>
        )}

        {step > 0 && !submitting && (
          <button
            type="button"
            onClick={() => {
              setStep((s) => Math.max(0, s - 1));
              setError(null);
            }}
            className="mt-8 text-sm text-black/45 hover:text-black underline underline-offset-4 decoration-black/20"
          >
            {locale === 'he' ? '← חזרה' : '← Back'}
          </button>
        )}
      </div>
    </div>
  );
}
