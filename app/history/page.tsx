'use client';

import { History } from 'lucide-react';

export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[var(--bg)]">
      <div className="glass rounded-2xl p-12 max-w-md border-[var(--border-light)]">
        <History className="h-12 w-12 mx-auto mb-4 text-[var(--teal)]" />
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">History</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Conversation history will appear here.
        </p>
      </div>
    </div>
  );
}
