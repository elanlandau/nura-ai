'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 bg-[var(--bg)]">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Something went wrong</h2>
      <p className="text-sm text-[var(--text-muted)] text-center max-w-md">{error?.message ?? 'An error occurred.'}</p>
      <Button
        onClick={() => reset()}
        className="bg-[var(--coral)] hover:bg-[var(--coral)]/90 text-white border-0"
      >
        Try again
      </Button>
    </div>
  );
}
